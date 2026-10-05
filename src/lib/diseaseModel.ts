/**
 * Contract between the vision model (`fastapi_service/`) and everything that
 * consumes a diagnosis: `server.ts`, the typed client in `api.ts` and the
 * result card.
 *
 * The model is an EfficientNet-B0 classifier over FOUR classes. It is not a
 * general watermelon disease detector, and the numbers below are the real
 * held-out test results from `fastapi_service/metrics.json` (173 images,
 * split by capture order so repeat photos of one leaf cannot straddle the
 * train/test boundary).
 *
 * Two of those numbers drive the logic in this file:
 *
 *   - `Healthy` precision is 0.62. Of 50 images the model called healthy,
 *     19 were actually diseased. A cheerful "ใบปกติ" is therefore the most
 *     dangerous output this model can produce, so it needs a much higher
 *     confidence bar than a disease call does, and it always ships with the
 *     caveat attached.
 *   - `Downy_Mildew` and `Mosaic_Virus` recall are 0.82 and 0.85, i.e. the
 *     model misses roughly one in six infected leaves. "ไม่พบโรค" never
 *     means "ไม่มีโรค".
 *
 * Nothing here invents a diagnosis. When the model is unsure the status is
 * `inconclusive` and the caller is told to look at the plant, not the app.
 *
 * ## Engine v3
 *
 * The service now reads that same checkpoint with a smarter pipeline
 * (`fastapi_service/inference.py`): overlapping crops so a small lesion is
 * not resized away, test-time augmentation, temperature scaling, and a
 * photo-readability gate. Three of its outputs change what a farmer is told,
 * and each one has its own status here:
 *
 *   - `abstain` — the photo cannot carry a diagnosis at all (not a leaf, too
 *     blurred, badly exposed). The four-way softmax has no class for that, so
 *     without the gate a photo of a wall comes back as a confident disease.
 *     -> `unusable`
 *   - `aggregation.escalated_from_healthy` — the whole frame read as healthy
 *     but one crop clearly showed disease. That is the 19-wrongly-healthy
 *     failure being caught, and it is weaker evidence than a whole-frame
 *     call, so it is reported as something to go and verify.
 *     -> `suspect`
 *   - `lesions` — the discoloured share of the leaf, measured from the pixels
 *     rather than looked up per disease. Reported alongside, and used to
 *     contradict a "healthy" call when the two disagree.
 *
 * Every v3 field is optional. A v2 service, or a replayed v2 record, produces
 * exactly the v2 behaviour through this same function.
 */

import { DISEASES, SEVERITY_LABEL, type Disease, type Severity } from '../data/diseases';

/** The four labels the checkpoint was trained on, in label-index order. */
export const MODEL_CLASSES = ['Anthracnose', 'Downy_Mildew', 'Healthy', 'Mosaic_Virus'] as const;

export type ModelClass = (typeof MODEL_CLASSES)[number];

/** `leafcheck.assess_quality` — can this photo carry a diagnosis? */
export type PhotoQuality = {
  verdict: 'usable' | 'marginal' | 'unusable';
  usable: boolean;
  /** Thai, specific about what to change. Empty when `usable`. */
  reasons: string[];
  focus_score: number;
  leaf_fraction: number;
};

/** `leafcheck.lesion_stats` — discoloured share of the leaf tissue found. */
export type LesionMeasurement = {
  /** False when there was too little leaf tissue to measure. Ignore the rest. */
  measured: boolean;
  healthy_fraction: number;
  chlorotic_fraction: number;
  necrotic_fraction: number;
  discolored_fraction: number;
};

/** One crop the engine scored, and where it was. */
export type EvidenceRegion = {
  name: string;
  /** (left, top, right, bottom) as fractions of the frame. */
  box: [number, number, number, number];
  class_id: ModelClass;
  confidence: number;
  tissue_fraction: number;
};

/** How the engine turned per-crop results into one verdict. */
export type Aggregation = {
  source_region: string;
  escalated_from_healthy: boolean;
  supporting_tiles: string[];
  agrees_with_frame_runner_up: boolean;
  frame_class_id: ModelClass;
  frame_confidence: number;
  frame_runner_up: ModelClass;
  regions_scored: number;
};

/**
 * Raw output of `POST /predict` on the vision service.
 *
 * The first four fields are the v2 contract and keep their meanings. The rest
 * arrive from engine v3 and are optional, so this type also describes what a
 * v2 service returns.
 */
export type VisionPrediction = {
  class_id: ModelClass;
  confidence: number;
  scores: Record<ModelClass, number>;
  model_version: string;
  engine_version?: string;
  mode?: string;
  /** The photo cannot carry a diagnosis. `quality.reasons` says why. */
  abstain?: boolean;
  quality?: PhotoQuality;
  lesions?: LesionMeasurement;
  aggregation?: Aggregation;
  regions?: EvidenceRegion[];
  calibration?: { temperature: number; fitted: boolean; note: string };
  inference_ms?: number;
};

export type DetectionStatus =
  /** A disease class cleared its confidence bar on the whole frame. */
  | 'diagnosed'
  /**
   * One area of the photo clearly shows disease while the whole frame read as
   * healthy. Actionable, but only after the farmer looks at that spot.
   */
  | 'suspect'
  /** `Healthy` cleared the (higher) healthy bar. */
  | 'healthy'
  /** Top score too low to act on, or scores spread across classes. */
  | 'inconclusive'
  /** The photo itself cannot be read. Nothing about the plant was measured. */
  | 'unusable';

/** Per-class results on the held-out test set, as fractions of 1. */
export type ClassMetrics = {
  precision: number;
  recall: number;
  f1: number;
  /** Number of test images of this class. */
  support: number;
};

/** `fastapi_service/metrics.json` → `test`. Do not round these up. */
export const MODEL_METRICS: Record<ModelClass, ClassMetrics> = {
  Anthracnose: { precision: 1.0, recall: 1.0, f1: 1.0, support: 23 },
  Downy_Mildew: { precision: 1.0, recall: 0.8245614035087719, f1: 0.9038461538461539, support: 57 },
  Healthy: { precision: 0.62, recall: 1.0, f1: 0.7654320987654321, support: 31 },
  Mosaic_Virus: { precision: 1.0, recall: 0.8548387096774194, f1: 0.9217391304347826, support: 62 },
};

export const MODEL_SUMMARY = {
  architecture: 'efficientnet_b0',
  /** Accuracy over the whole held-out test set. */
  accuracy: 0.8901734104046243,
  macroF1: 0.8977543457615921,
  testImages: 173,
  trainImages: 809,
  validationImages: 173,
  /** Why the headline number is not the whole story. */
  provenance:
    'ชุดทดสอบมาจากแหล่งข้อมูลเดียวกับชุดฝึก และแบ่งตามลำดับการถ่ายภาพ ยังไม่ได้ทดสอบกับภาพจากสวนจริงที่ถ่ายด้วยโทรศัพท์ในสภาพแสงหลากหลาย',
} as const;

/** Model label → `id` in `src/data/diseases.ts`. `Healthy` maps to nothing. */
const CLASS_TO_DISEASE_ID: Record<Exclude<ModelClass, 'Healthy'>, string> = {
  Anthracnose: 'anthracnose',
  Downy_Mildew: 'downy-mildew',
  Mosaic_Virus: 'watermelon-mosaic-virus',
};

/**
 * Thai label for each model class, for a UI that shows the score breakdown.
 *
 * The checkpoint's own labels are English with underscores
 * (`Downy_Mildew`), so anything rendering `scores` needs this to avoid
 * putting a raw label in front of a farmer.
 *
 * Note what does NOT use it: the inconclusive caveat. That text used to
 * interpolate the runner-up class, and naming a disease in a reply that
 * reached no verdict reads as a diagnosis however it is worded — so the
 * caveat reports the runner-up score alone.
 */
export const MODEL_CLASS_THAI: Record<ModelClass, string> = {
  Anthracnose: 'โรคแอนแทรคโนส',
  Downy_Mildew: 'โรคราน้ำค้าง',
  Healthy: 'ใบปกติ',
  Mosaic_Virus: 'โรคไวรัสใบด่าง',
};

const DISEASE_ID_TO_CLASS: Record<string, ModelClass> = Object.fromEntries(
  Object.entries(CLASS_TO_DISEASE_ID).map(([cls, id]) => [id, cls as ModelClass]),
);

/**
 * Held-out metrics for a catalogue entry, or `null` when the model was never
 * trained to recognise it. The catalogue lists eight diseases; the model
 * covers three. The other five must not be presented as detectable.
 */
export function modelCoverage(diseaseId: string): ClassMetrics | null {
  const cls = DISEASE_ID_TO_CLASS[diseaseId];
  return cls ? MODEL_METRICS[cls] : null;
}

/** Catalogue entries the vision model cannot detect from a photo. */
export const OUT_OF_SCOPE_DISEASES = DISEASES.filter((d) => !DISEASE_ID_TO_CLASS[d.id]).map((d) => ({
  id: d.id,
  name: d.name,
}));

/**
 * A disease call below this is not worth showing as a diagnosis. Chosen so a
 * near-tie between two classes lands in `inconclusive` rather than picking a
 * winner by a hair.
 */
export const MIN_DISEASE_CONFIDENCE = 0.7;

/**
 * `Healthy` needs a far higher bar: its precision on the test set is 0.62, so
 * a low-confidence "healthy" is close to a coin flip on a crop.
 */
export const MIN_HEALTHY_CONFIDENCE = 0.9;

/**
 * Discoloured leaf area, as a share of the leaf tissue in the photo, above
 * which a "healthy" verdict gets contradicted in writing.
 *
 * `lesions` is measured from hue, independently of the network, so when the
 * two disagree the farmer should hear about it rather than have one of the
 * two signals quietly win. 8% is a judgement, not a measurement: below it,
 * ordinary sun-scorch, dust and leaf age account for the colour, and warning
 * on every leaf would make the warning worthless.
 */
export const LESION_AREA_CONTRADICTS_HEALTHY = 0.08;

/**
 * How each status should read, so no caller has to guess and no new status can
 * fall through to a cheerful default.
 *
 * This exists because the result card used to render every status that was not
 * `diagnosed` or `inconclusive` as "ไม่พบอาการโรคในภาพ". Adding `suspect`
 * would have printed "no disease found" over a finding that says the opposite.
 *
 * `actionable` means there is treatment advice attached that a farmer can act
 * on. `reassuring` means the result says the plant looks fine — only ever
 * true for `healthy`, and the one flag a renderer must not get wrong.
 */
export const STATUS_PRESENTATION: Record<
  DetectionStatus,
  { label: string; icon: string; tone: 'error' | 'primary' | 'neutral' | 'outline'; actionable: boolean; reassuring: boolean }
> = {
  diagnosed: { label: 'พบอาการเข้าลักษณะโรค', icon: 'coronavirus', tone: 'error', actionable: true, reassuring: false },
  suspect: { label: 'พบจุดน่าสงสัย ต้องยืนยันด้วยตา', icon: 'troubleshoot', tone: 'primary', actionable: true, reassuring: false },
  healthy: { label: 'ไม่พบอาการโรคในภาพ', icon: 'check_circle', tone: 'neutral', actionable: false, reassuring: true },
  inconclusive: { label: 'ยังสรุปไม่ได้', icon: 'help', tone: 'outline', actionable: false, reassuring: false },
  unusable: { label: 'ภาพนี้ใช้ตรวจไม่ได้', icon: 'image_not_supported', tone: 'outline', actionable: false, reassuring: false },
};

const SEVERITY_LEVEL: Record<Severity, number> = { critical: 5, high: 4, moderate: 3 };

/** Applies to every result, whatever the model said. */
const BASE_CAVEATS: readonly string[] = [
  'AI เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่คำวินิจฉัยยืนยัน ก่อนพ่นสารควรตรวจแปลงจริงหรือปรึกษาเจ้าหน้าที่เกษตร',
  `โมเดลตรวจได้เพียง 3 โรค (แอนแทรคโนส ราน้ำค้าง ใบด่าง) และสภาพใบปกติ อีก ${OUT_OF_SCOPE_DISEASES.length} โรคในคลังความรู้ยังตรวจจากภาพไม่ได้`,
];

export type DiseaseDetection = {
  success: boolean;
  status: DetectionStatus;
  /** `null` when healthy or inconclusive — there is no disease to act on. */
  disease_id: string | null;
  thai_name: string;
  scientific_name: string;
  severity: string;
  /** 0 = healthy, 3–5 = moderate…critical. Drives the badge tone. */
  severity_level: number;
  confidence_percentage: number;
  symptoms: string[];
  chemical_control: string[];
  organic_control: string[];
  prevention: string[];
  urgent_action: string;
  /** Share of yield typically lost when untreated; empty when not a disease. */
  yield_loss: string;
  /** Pre-harvest interval in days. `null` when no chemical is recommended. */
  phi_days: number | null;
  phi_note: string;
  /** Share of this disease's test images the model actually caught, 0–100. */
  model_recall_percentage: number | null;
  caveats: string[];
  out_of_scope_diseases: readonly { id: string; name: string }[];
  /** Full softmax distribution, so the UI can show a close second guess. */
  scores: Record<ModelClass, number>;
  /**
   * The model class this verdict is about, as a key into `scores` — so a
   * renderer showing the distribution can mark the row the verdict came from.
   *
   * Not the same thing as `disease_id`, which is a catalogue key
   * (`'downy-mildew'`), while this is a label the checkpoint was trained on
   * (`'Downy_Mildew'`). Comparing a `scores` key against `disease_id` never
   * matches, and silently highlights nothing.
   *
   * `null` when no verdict was reached — `inconclusive` has a top-scoring
   * class but did not clear its bar, and `unusable` never looked at a leaf.
   * Marking either as a winner would overstate it.
   */
  model_class: ModelClass | null;
  analysis_engine: string;
  model_version: string;
  recordId?: string;
  detectedAt?: string;

  // -- Engine v3. `null` throughout when a v2 service answered. --
  /** Why the photo was rejected, or what was wrong with an accepted one. */
  photo_quality: PhotoQuality | null;
  /**
   * Discoloured share of the leaf, 0–100, measured from hue rather than
   * predicted. `null` when there was too little leaf tissue to measure.
   * Independent of `severity_level`, which comes from the catalogue.
   */
  lesion_area_percentage: number | null;
  /**
   * The crop the verdict came from, when it did not come from the whole
   * frame. Lets the UI point at the spot the farmer should inspect.
   */
  evidence_region: EvidenceRegion | null;
  /** True when a crop overruled a whole-frame "healthy". */
  escalated_from_healthy: boolean;
  /**
   * Whether `confidence_percentage` is a calibrated probability or a raw
   * softmax score. False means it is usually higher than the real hit rate.
   */
  confidence_calibrated: boolean;
  /** `"3.0.0 / balanced"`, or `null` from a v2 service. */
  engine: string | null;
};

const percent = (value: number) => Math.round(value * 1000) / 10;

/**
 * Softmax score for one class, or 0 when the service omitted it.
 *
 * The scores come over HTTP from `fastapi_service`. A missing key made
 * `percent(undefined)` produce NaN, which rendered as "NaN%" in the
 * caveat, and made the runner-up comparison sort on NaN.
 */
function scoreOf(scores: Partial<Record<ModelClass, number>> | undefined, cls: ModelClass): number {
  const value = scores?.[cls];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function diseasePayload(disease: Disease) {
  return {
    thai_name: disease.name,
    scientific_name: disease.pathogen,
    severity: SEVERITY_LABEL[disease.severity],
    severity_level: SEVERITY_LEVEL[disease.severity],
    symptoms: [...disease.symptoms],
    chemical_control: [disease.chemical],
    organic_control: [disease.biological],
    prevention: [disease.cultural],
    yield_loss: disease.yieldLoss,
    phi_days: disease.phi > 0 ? disease.phi : null,
    phi_note:
      disease.phi > 0
        ? `ระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) ${disease.phi} วัน — หยุดพ่นสารเคมีอย่างน้อย ${disease.phi} วันก่อนเก็บผลขาย`
        : 'โรคนี้ไม่มีสารเคมีรักษาหลังแสดงอาการ ใช้วิธีป้องกันและจัดการแปลงเท่านั้น ' +
          'ถ้าใช้สารป้องกันก่อนระบาด ต้องอ่านค่าระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) บนฉลากของสารนั้นก่อนใช้',
  };
}

/**
 * Turns a raw model prediction into the payload the app shows a farmer.
 *
 * Pure on purpose: `server.ts` calls it after the HTTP hop and the tests call
 * it directly, so the confidence bars and the PHI text are verified by the
 * same code path that serves them.
 */
export function buildDetection(prediction: VisionPrediction): DiseaseDetection {
  const { class_id, scores, model_version } = prediction;

  // A non-finite confidence from the service would compare false against
  // every threshold and fall through to a confident-looking diagnosis.
  const confidence =
    typeof prediction.confidence === 'number' && Number.isFinite(prediction.confidence)
      ? Math.min(Math.max(prediction.confidence, 0), 1)
      : 0;

  if (!MODEL_CLASSES.includes(class_id)) {
    throw new Error(`Vision service returned an unknown class: ${String(class_id)}`);
  }

  // -- Engine v3 context, all absent when a v2 service answered --
  const quality = prediction.quality ?? null;
  const lesions = prediction.lesions ?? null;
  const aggregation = prediction.aggregation ?? null;
  const escalated = aggregation?.escalated_from_healthy === true;
  const evidenceRegion = escalated
    ? (prediction.regions ?? []).find((r) => r.name === aggregation?.source_region) ?? null
    : null;
  const lesionArea = lesions?.measured ? percent(lesions.discolored_fraction) : null;
  const engine = prediction.engine_version
    ? `${prediction.engine_version} / ${prediction.mode ?? 'default'}`
    : null;

  const shared = {
    success: true,
    confidence_percentage: percent(confidence),
    scores,
    out_of_scope_diseases: OUT_OF_SCOPE_DISEASES,
    analysis_engine: `Watermelon-Vision-${MODEL_SUMMARY.architecture}`,
    model_version,
    photo_quality: quality,
    lesion_area_percentage: lesionArea,
    evidence_region: evidenceRegion,
    escalated_from_healthy: escalated,
    confidence_calibrated: prediction.calibration?.fitted === true,
    engine,
  };

  /**
   * Caveats every v3 result carries, before the per-status ones.
   *
   * A photo the gate called `marginal` was good enough to read but not good
   * enough to trust silently, and an uncalibrated confidence is usually
   * higher than the hit rate it looks like — both change how the number
   * beside the verdict should be read, so both are said out loud.
   */
  const engineCaveats: string[] = [];
  if (quality?.verdict === 'marginal') {
    engineCaveats.push(...quality.reasons);
  }
  if (engine && !shared.confidence_calibrated) {
    engineCaveats.push(
      'ตัวเลขความมั่นใจเป็นคะแนนดิบจากโมเดล ยังไม่ได้ปรับเทียบกับอัตราความถูกต้องจริง ' +
        'มักสูงกว่าความเป็นจริง ให้ใช้เป็นการจัดอันดับความเป็นไปได้ ไม่ใช่ความน่าจะเป็น',
    );
  }

  // -- The photo cannot carry a diagnosis at all --
  // Checked before any confidence bar: the network answers whatever it is
  // shown, so a confident disease call on a photo of a wall clears every
  // threshold in this file. Nothing below this point ran on a readable leaf.
  if (prediction.abstain === true) {
    const reasons = quality?.reasons ?? [];
    return {
      ...shared,
      status: 'unusable',
      disease_id: null,
      model_class: null,
      thai_name: 'ภาพนี้ยังใช้ตรวจโรคไม่ได้',
      scientific_name: '',
      severity: 'ไม่ได้ตรวจ',
      severity_level: 0,
      // The measurement did not happen, so neither number is reported.
      confidence_percentage: 0,
      lesion_area_percentage: null,
      symptoms: [],
      chemical_control: [],
      organic_control: [],
      prevention: [],
      urgent_action: reasons[0] ?? 'ให้ถ่ายภาพใบใหม่ให้เห็นใบเต็มกรอบ ชัด และอยู่ในที่แสงธรรมชาติ',
      yield_loss: '',
      phi_days: null,
      phi_note: 'ยังไม่แนะนำสารเคมี เพราะยังไม่ได้ตรวจใบจากภาพนี้',
      model_recall_percentage: null,
      caveats: [
        'ระบบไม่ได้วิเคราะห์โรคจากภาพนี้ จึงไม่มีผลตรวจให้ — ไม่ใช่ว่าตรวจแล้วไม่พบโรค',
        ...reasons.slice(1),
        ...BASE_CAVEATS,
      ],
    };
  }

  const threshold = class_id === 'Healthy' ? MIN_HEALTHY_CONFIDENCE : MIN_DISEASE_CONFIDENCE;

  if (confidence < threshold) {
    const runnerUp = MODEL_CLASSES.filter((c) => c !== class_id).sort(
      (a, b) => scoreOf(scores, b) - scoreOf(scores, a),
    )[0];
    return {
      ...shared,
      status: 'inconclusive',
      disease_id: null,
      model_class: null,
      thai_name: 'ยังสรุปไม่ได้จากภาพนี้',
      scientific_name: '',
      severity: 'ยังไม่ทราบ',
      severity_level: 0,
      symptoms: [],
      chemical_control: [],
      organic_control: [],
      prevention: [],
      urgent_action:
        'ยังไม่ควรพ่นสารตามผลนี้ ถ่ายภาพใบใหม่ให้เห็นแผลชัดในที่แสงธรรมชาติ หรือให้เจ้าหน้าที่เกษตรดูใบจริง',
      yield_loss: '',
      phi_days: null,
      phi_note: 'ยังไม่แนะนำสารเคมีเพราะยังไม่รู้ว่าเป็นโรคอะไร',
      model_recall_percentage: null,
      caveats: [
        `โมเดลมั่นใจเพียง ${percent(confidence)}% ซึ่งต่ำกว่าเกณฑ์ ${percent(threshold)}% ที่ตั้งไว้ จึงไม่สรุปผล`,
        `คะแนนของลักษณะที่มาเป็นอันดับสองอยู่ที่ ${percent(scoreOf(scores, runnerUp))}% ` +
          'คะแนนกระจายกันจนไม่มีลักษณะใดเด่นพอจะสรุปได้ จึงยังไม่ระบุว่าเป็นโรคใด',
        ...engineCaveats,
        ...BASE_CAVEATS,
      ],
    };
  }

  // -- A crop found what the whole frame missed --
  // The whole frame read as healthy and one crop read as disease. On the test
  // set the whole frame was wrong about "healthy" 19 times out of 50, so the
  // crop is not overruled — but a crop is weaker evidence than a full view,
  // so the farmer is told where to look rather than told what they have.
  if (escalated && class_id !== 'Healthy') {
    const suspectId = CLASS_TO_DISEASE_ID[class_id];
    const suspect = DISEASES.find((d) => d.id === suspectId);
    if (!suspect) {
      throw new Error(`Model class ${class_id} has no catalogue entry (${suspectId})`);
    }
    const metrics = MODEL_METRICS[class_id];
    const supporting = aggregation?.supporting_tiles.length ?? 1;
    const framePercent = percent(aggregation?.frame_confidence ?? 0);

    return {
      ...shared,
      status: 'suspect',
      disease_id: suspect.id,
      model_class: class_id,
      ...diseasePayload(suspect),
      // Overrides the catalogue name so no screen can show a suspicion as a
      // confirmed diagnosis just by printing `thai_name`.
      thai_name: `น่าสงสัยว่าเป็น${suspect.name}`,
      urgent_action: [
        `ยังไม่ต้องพ่นทั้งแปลงจากผลนี้ — ให้ไปดูใบจริงบริเวณที่ระบบทำเครื่องหมายก่อน`,
        `ถ้าเห็นอาการตรงกับรายการด้านล่าง ให้เริ่มจัดการตามแผนทันทีและสำรวจต้นข้างเคียง`,
        suspect.phi > 0
          ? `ถ้าตัดสินใจพ่นสารเคมี ให้นับระยะปลอดภัยก่อนเก็บเกี่ยว ${suspect.phi} วันจากการพ่นครั้งสุดท้าย`
          : 'โรคนี้ไม่มีสารเคมีรักษาหลังแสดงอาการ ใช้การจัดการแปลงเป็นหลัก',
      ].join(' '),
      model_recall_percentage: percent(metrics.recall),
      caveats: [
        `ภาพรวมทั้งใบโมเดลอ่านว่าปกติ (${framePercent}%) แต่เมื่อซูมดูแยกส่วน พบ ${supporting} บริเวณ` +
          `ที่เข้าลักษณะ${suspect.name} ที่ ${percent(confidence)}% จึงรายงานไว้แทนที่จะสรุปว่าใบปกติ`,
        'ในชุดทดสอบ โมเดลอ่านว่า "ใบปกติ" ผิดไป 19 จาก 50 ครั้ง ซึ่งเป็นใบที่เป็นโรคจริง ' +
          'ผลแบบนี้จึงไม่ถูกกลบทิ้ง แต่ก็ยังไม่หนักแน่นเท่าการตรวจพบจากภาพรวมทั้งใบ',
        ...(lesionArea !== null
          ? [`วัดจากสีของภาพได้ว่าเนื้อใบเปลี่ยนสีไปแล้ว ${lesionArea}% (วัดจากพิกเซล ไม่ใช่ค่าจากโมเดล)`]
          : []),
        ...engineCaveats,
        ...BASE_CAVEATS,
      ],
    };
  }

  if (class_id === 'Healthy') {
    // precision = support / predicted, and recall is 1.0, so the model called
    // `support / precision` images healthy and was wrong on the remainder.
    const { precision, support } = MODEL_METRICS.Healthy;
    const calledHealthy = Math.round(support / precision);
    const wronglyCalledHealthy = calledHealthy - support;

    // The hue measurement and the network are independent of each other. When
    // they disagree the farmer hears both, because the one that happens to be
    // right on this leaf is not knowable from here — and the cheap action
    // (walk over and look) settles it.
    const colourDisagrees =
      lesions?.measured === true && lesions.discolored_fraction >= LESION_AREA_CONTRADICTS_HEALTHY;

    // Crops that were scored and found nothing. Real evidence, worth stating,
    // because it is the one thing v3 can add *for* a healthy verdict.
    const cropsChecked = aggregation ? aggregation.regions_scored - 1 : 0;

    return {
      ...shared,
      status: 'healthy',
      disease_id: null,
      model_class: 'Healthy',
      thai_name: 'ไม่พบอาการโรคในภาพนี้',
      scientific_name: 'Citrullus lanatus',
      severity: 'ไม่พบอาการ',
      severity_level: 0,
      symptoms: [],
      chemical_control: [],
      organic_control: [],
      prevention: [],
      urgent_action: colourDisagrees
        ? `ไม่ต้องพ่นสารจากผลนี้ แต่วัดจากสีของภาพพบว่าเนื้อใบเปลี่ยนสีไป ${lesionArea}% ` +
          'ให้เดินไปดูใบจริงบริเวณนั้นด้วยตาเปล่าก่อน แล้วสำรวจใบล่างและใต้ใบทุก 3–5 วันตามรอบปกติ'
        : 'ไม่ต้องพ่นสารจากผลนี้ ให้สำรวจใบล่างและใต้ใบทุก 3–5 วันตามรอบปกติ',
      yield_loss: '',
      phi_days: null,
      phi_note: 'ไม่มีการแนะนำสารเคมีเมื่อไม่พบอาการโรค',
      model_recall_percentage: null,
      caveats: [
        // The single most important sentence in this file.
        `"ไม่พบโรค" ไม่ได้แปลว่าไม่มีโรค ในชุดทดสอบ โมเดลบอกว่าใบปกติ ${calledHealthy} ครั้ง แต่ผิด ${wronglyCalledHealthy} ครั้ง ซึ่งเป็นใบที่เป็นโรคจริง`,
        'โรคราน้ำค้างและใบด่างถูกโมเดลมองข้ามประมาณ 1 ใน 6 ภาพ ถ้าสงสัยให้ตรวจใต้ใบและยอดอ่อนด้วยตาเปล่า',
        ...(colourDisagrees
          ? [
              `การวัดสีจากพิกเซลไม่ตรงกับโมเดล: วัดได้ว่าเนื้อใบเปลี่ยนสี ${lesionArea}% ` +
                'สองวิธีนี้ทำงานแยกกัน เมื่อไม่ตรงกันให้เชื่อตาตัวเองที่ใบจริงเป็นหลัก',
            ]
          : []),
        ...(cropsChecked > 0
          ? [
              `ผลนี้ผ่านการซูมตรวจแยก ${cropsChecked} บริเวณของภาพแล้วไม่พบจุดต้องสงสัย ` +
                'ซึ่งหนักแน่นกว่าการดูภาพรวมครั้งเดียว แต่ยังไม่ได้ตรวจใต้ใบและยอดอ่อนที่ไม่อยู่ในภาพ',
            ]
          : []),
        ...engineCaveats,
        ...BASE_CAVEATS,
      ],
    };
  }

  const diseaseId = CLASS_TO_DISEASE_ID[class_id];
  const disease = DISEASES.find((d) => d.id === diseaseId);
  if (!disease) {
    // The model and the catalogue have drifted apart. Better to say so than
    // to render a card with blank treatment advice.
    throw new Error(`Model class ${class_id} has no catalogue entry (${diseaseId})`);
  }

  const metrics = MODEL_METRICS[class_id];
  const caveats = [...engineCaveats, ...BASE_CAVEATS];
  if (lesionArea !== null) {
    caveats.unshift(
      `วัดจากสีของภาพได้ว่าเนื้อใบเปลี่ยนสีไปแล้ว ${lesionArea}% ของเนื้อใบที่เห็นในภาพ ` +
        '(วัดจากพิกเซลโดยตรง เป็นตัวเลขอีกชุดที่ไม่ได้มาจากโมเดล ใช้เทียบความลุกลามเมื่อถ่ายซ้ำในอีกไม่กี่วัน)',
    );
  }
  if (metrics.recall < 0.9) {
    caveats.unshift(
      `โมเดลตรวจพบโรคนี้ได้ ${percent(metrics.recall)}% ของภาพที่เป็นโรคจริงในชุดทดสอบ (${Math.round(metrics.recall * metrics.support)} จาก ${metrics.support} ภาพ)`,
    );
  }

  return {
    ...shared,
    status: 'diagnosed',
    disease_id: disease.id,
    model_class: class_id,
    ...diseasePayload(disease),
    urgent_action: [
      `โรคนี้${SEVERITY_LABEL[disease.severity]} หากปล่อยไว้มักเสียผลผลิต ${disease.yieldLoss}`,
      'เริ่มจัดการตามแผนด้านล่างทันที และสำรวจต้นข้างเคียงในแปลงเดียวกัน',
      disease.phi > 0
        ? `ถ้าพ่นสารเคมี ให้นับระยะปลอดภัยก่อนเก็บเกี่ยว ${disease.phi} วันจากการพ่นครั้งสุดท้าย`
        : 'โรคนี้ไม่มีสารเคมีรักษาหลังแสดงอาการ ใช้การจัดการแปลงเป็นหลัก',
    ].join(' '),
    model_recall_percentage: percent(metrics.recall),
    caveats,
  };
}

/**
 * Renders a diagnosis as the chat message a farmer reads.
 *
 * Built from the catalogue rather than generated by a language model, for two
 * reasons: the numbers in the text always match the card beside it, and a PHI
 * figure can never go missing from a message that lists a chemical rate.
 */
export function diagnosisToChatReply(diagnosis: DiseaseDetection): string {
  const confidence = `ความมั่นใจ ${diagnosis.confidence_percentage}%`;
  const bullets = (items: readonly string[]) => items.map((x) => `• ${x}`);

  // No leaf was read, so there is no confidence figure to quote — printing
  // one would imply a measurement that did not happen.
  if (diagnosis.status === 'unusable') {
    return [
      'ภาพนี้ผมยังตรวจไม่ได้ครับ 🍉',
      '',
      diagnosis.urgent_action,
      '',
      ...bullets(diagnosis.caveats),
    ].join('\n');
  }

  if (diagnosis.status === 'inconclusive') {
    return [
      `ขอโทษครับ ภาพนี้ผมยังสรุปไม่ได้ (${confidence}) 🍉`,
      '',
      diagnosis.urgent_action,
      '',
      ...bullets(diagnosis.caveats),
    ].join('\n');
  }

  if (diagnosis.status === 'healthy') {
    return [
      `จากภาพนี้ผมไม่พบอาการโรคครับ (${confidence}) 🍉`,
      '',
      diagnosis.urgent_action,
      '',
      '**แต่อ่านตรงนี้ก่อนนะครับ**',
      ...bullets(diagnosis.caveats),
    ].join('\n');
  }

  const lines = [
    diagnosis.status === 'suspect'
      ? // Worded as a place to check, not as a finding, because the evidence
        // came from one crop rather than from the whole leaf.
        `ภาพรวมทั้งใบดูปกติ แต่ผมซูมดูแยกส่วนแล้วเจอจุดที่เข้าลักษณะ **${diagnosis.thai_name.replace('น่าสงสัยว่าเป็น', '')}** ครับ (${confidence}) 🍉`
      : `ภาพใบนี้เข้าลักษณะ **${diagnosis.thai_name}** ครับ (${confidence}) 🍉`,
    `เชื้อ/สาเหตุ: ${diagnosis.scientific_name} • ความรุนแรง: ${diagnosis.severity}`,
    '',
    diagnosis.status === 'suspect' ? '**อาการที่ต้องไปยืนยันด้วยตา**' : '**อาการที่ตรงกับภาพ**',
    ...bullets(diagnosis.symptoms),
    '',
    '**สิ่งที่ควรทำทันที**',
    diagnosis.urgent_action,
  ];

  if (diagnosis.chemical_control.length) {
    lines.push(
      '',
      '**สารเคมีควบคุม**',
      ...bullets(diagnosis.chemical_control),
      // Rule 1: a chemical rate never ships without its pre-harvest interval.
      `⏱️ ${diagnosis.phi_note}`,
    );
  }
  if (diagnosis.organic_control.length) {
    lines.push('', '**ชีวภัณฑ์ทางเลือก**', ...bullets(diagnosis.organic_control));
  }
  if (diagnosis.prevention.length) {
    lines.push('', '**ป้องกันไม่ให้กลับมา**', ...bullets(diagnosis.prevention));
  }

  lines.push('', '**ข้อจำกัดของผลนี้**', ...bullets(diagnosis.caveats));
  return lines.join('\n');
}
