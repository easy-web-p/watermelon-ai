/** Browser ONNX inference. The primary diagnosis always uses legacy4. */
import { analyse, loadImage, regionTissueFraction } from './browserLeafcheck';
import { MODEL_CLASSES, type ModelClass, type VisionPrediction } from './diseaseModel';
import type { VisionCompareResponse } from './api';
import type { VisionEngineInfo, VisionEngineList } from './visionEngines';

type Ort = typeof import('onnxruntime-web/wasm');
type Session = import('onnxruntime-web/wasm').InferenceSession;
type Metadata = { classes: string[]; image_size: number; architecture: string; onnx_sha256: string };
type Labels = { labels: string[]; input_size: number; class_tiers?: Record<string, string>; per_class_recall?: Record<string, number>; temperature?: number };
type Region = { name: string; box: [number, number, number, number]; class_id: ModelClass; confidence: number; tissue_fraction: number; scores: Record<ModelClass, number>; views: number };
const FULL: Region['box'] = [0, 0, 1, 1];
const REGIONS: { name: string; box: Region['box'] }[] = [
  { name: 'full', box: FULL }, { name: 'q-tl', box: [0, 0, .55, .55] },
  { name: 'q-tr', box: [.45, 0, 1, .55] }, { name: 'q-bl', box: [0, .45, .55, 1] },
  { name: 'q-br', box: [.45, .45, 1, 1] }, { name: 'center', box: [.2, .2, .8, .8] },
];
const MEAN = [.485, .456, .406], STD = [.229, .224, .225];
const TIER_WEIGHT: Record<string, number> = { direct: 1, same_pathogen: .95, same_genus: .8, symptom_proxy: .55, generic: .85 };
const round = (x: number, d = 6) => Number(x.toFixed(d));
let ortPromise: Promise<Ort> | undefined;
let legacyPromise: Promise<{ session: Session; metadata: Metadata; temperature: number; fitted: boolean }> | undefined;
let widePromise: Promise<{ session: Session; labels: Labels }> | undefined;

async function runtime(): Promise<Ort> {
  return ortPromise ??= import('onnxruntime-web/wasm').then((ort) => {
    ort.env.wasm.wasmPaths = '/models/';
    ort.env.wasm.numThreads = 1;
    return ort;
  });
}
async function jsonFile<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok || (response.headers.get('content-type') ?? '').includes('text/html')) throw new Error(`โหลด ${url} ไม่สำเร็จ`);
  return response.json() as Promise<T>;
}
async function modelAssetExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
    const contentType = response.headers.get('content-type') ?? '';
    const length = Number(response.headers.get('content-length') || 0);
    // Firebase's SPA rewrite answers a missing model path with a small HTML page.
    return response.ok && !contentType.includes('text/html') && (length > 1_000_000 || !length);
  } catch {
    return false;
  }
}
async function legacy() {
  return legacyPromise ??= (async () => {
    const metadata = await jsonFile<Metadata>('/models/model.onnx.json');
    if (metadata.image_size !== 224 || JSON.stringify(metadata.classes) !== JSON.stringify(MODEL_CLASSES)) throw new Error('ลำดับคลาสหรือขนาดภาพของโมเดล legacy4 ไม่ตรงกับแอป');
    let temperature = 1, fitted = false;
    const calibrationResponse = await fetch('/models/calibration.json');
    if (calibrationResponse.ok && !(calibrationResponse.headers.get('content-type') ?? '').includes('text/html')) {
      const calibration = await calibrationResponse.json() as { temperature?: number };
      if (!Number.isFinite(calibration.temperature) || (calibration.temperature ?? 0) < .05 || (calibration.temperature ?? 0) > 20) throw new Error('ไฟล์ calibration.json ไม่ถูกต้อง');
      temperature = calibration.temperature!; fitted = true;
    }
    const ort = await runtime();
    const session = await ort.InferenceSession.create('/models/model.onnx', { executionProviders: ['wasm'] });
    return { session, metadata, temperature, fitted };
  })().catch((error: unknown) => { legacyPromise = undefined; throw error; });
}
async function wide() {
  return widePromise ??= (async () => {
    const labels = await jsonFile<Labels>('/models/wide9.labels.json');
    if (labels.labels.length !== 9 || labels.input_size !== 224) throw new Error('metadata ของ wide9 ไม่ถูกต้อง');
    const ort = await runtime();
    const session = await ort.InferenceSession.create('/models/wide9.onnx', { executionProviders: ['wasm'] });
    return { session, labels };
  })().catch((error: unknown) => { widePromise = undefined; throw error; });
}
function softmax(values: number[]): number[] {
  const peak = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - peak));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sum);
}
function prepare(source: HTMLImageElement | ImageBitmap | HTMLCanvasElement, box: Region['box'], view: number): Float32Array {
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const canvas = document.createElement('canvas'); canvas.width = 224; canvas.height = 224;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('เบราว์เซอร์ไม่รองรับ Canvas');
  // Canvas resamples the source crop directly to the model's fixed input size.
  context.drawImage(source, Math.round(width * box[0]), Math.round(height * box[1]), Math.max(1, Math.round(width * (box[2] - box[0]))), Math.max(1, Math.round(height * (box[3] - box[1]))), 0, 0, 224, 224);
  const rgba = context.getImageData(0, 0, 224, 224).data;
  const result = new Float32Array(3 * 224 * 224);
  for (let y = 0; y < 224; y++) for (let x = 0; x < 224; x++) {
    const sx = view & 1 ? 223 - x : x, sy = view & 2 ? 223 - y : y;
    const sourceIndex = (sy * 224 + sx) * 4, target = y * 224 + x;
    for (let channel = 0; channel < 3; channel++) result[channel * 224 * 224 + target] = (rgba[sourceIndex + channel] / 255 - MEAN[channel]) / STD[channel];
  }
  return result;
}
function workImage(source: HTMLImageElement | ImageBitmap): HTMLCanvasElement {
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const scale = Math.min(1, 768 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('เบราว์เซอร์ไม่รองรับ Canvas');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}
async function infer(session: Session, samples: Float32Array[]): Promise<number[][]> {
  const ort = await runtime();
  const one = 3 * 224 * 224;
  const batch = new Float32Array(samples.length * one);
  samples.forEach((sample, index) => batch.set(sample, index * one));
  const outputs = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', batch, [samples.length, 3, 224, 224]) });
  const tensor = outputs[session.outputNames[0]];
  if (!tensor || tensor.size !== samples.length * Number(tensor.dims.at(-1))) throw new Error('โมเดลคืนผลไม่ครบ');
  const classes = Number(tensor.dims.at(-1));
  const values = tensor.data as Float32Array;
  return samples.map((_, index) => Array.from(values.subarray(index * classes, (index + 1) * classes)));
}

export function aggregateRegions(results: Region[]) {
  const frame = results.find((region) => region.name === 'full');
  if (!frame) throw new Error('ไม่มีผลของภาพเต็ม');
  const runnerUp = MODEL_CLASSES.filter((name) => name !== frame.class_id).sort((a, b) => frame.scores[b] - frame.scores[a])[0];
  const candidates = results.filter((region) => region.name !== 'full' && region.class_id !== 'Healthy' && region.confidence >= .8 && region.tissue_fraction >= .35);
  const suppressed = results.filter((region) => region.name !== 'full' && region.class_id !== 'Healthy' && region.confidence >= .8 && region.tissue_fraction < .35);
  const best = frame.class_id === 'Healthy' && candidates.length ? candidates.reduce((a, b) => a.confidence >= b.confidence ? a : b) : frame;
  return { verdict: best, aggregation: {
    source_region: best.name, escalated_from_healthy: best !== frame,
    supporting_tiles: best === frame ? [] : candidates.filter((region) => region.class_id === best.class_id).map((region) => region.name),
    agrees_with_frame_runner_up: best !== frame && best.class_id === runnerUp,
    frame_class_id: frame.class_id, frame_confidence: frame.confidence, frame_runner_up: runnerUp, regions_scored: results.length,
    frame_scores: frame.scores, tile_suspicion_threshold: .8, tile_min_tissue_fraction: .35,
    rule: 'crop-may-escalate-healthy-never-downgrade-disease', suppressed_low_tissue_tiles: suppressed.map((region) => region.name),
  } };
}

export async function predictLegacy4(imageBase64: string, mode: 'fast' | 'balanced' | 'deep' = 'balanced'): Promise<VisionPrediction> {
  const started = performance.now();
  const source = await loadImage(imageBase64);
  const { quality, lesions } = await analyse(source);
  const { session, metadata, temperature, fitted } = await legacy();
  const work = workImage(source);
  const regions = mode === 'fast' ? REGIONS.slice(0, 1) : mode === 'deep' ? REGIONS : REGIONS.slice(0, 5);
  const sampleCounts = regions.map((region, index) => index === 0 ? (mode === 'fast' ? 1 : 4) : mode === 'deep' ? 4 : 1);
  const samples = regions.flatMap((region, index) => Array.from({ length: sampleCounts[index] }, (_, view) => prepare(work, region.box, view)));
  const logits = await infer(session, samples);
  const results: Region[] = [];
  let cursor = 0;
  for (let index = 0; index < regions.length; index++) {
    const region = regions[index], views = sampleCounts[index];
    const means = MODEL_CLASSES.map((_, classIndex) => logits.slice(cursor, cursor + views).reduce((sum, row) => sum + row[classIndex], 0) / views / temperature);
    cursor += views;
    const probs = softmax(means), winner = probs.indexOf(Math.max(...probs));
    let tissue = quality.leaf_fraction;
    if (index > 0) {
      const box = region.box, canvas = document.createElement('canvas');
      const width = work.width, height = work.height;
      const scale = Math.min(1, 512 / Math.max(width * (box[2] - box[0]), height * (box[3] - box[1])));
      canvas.width = Math.max(1, Math.round(width * (box[2] - box[0]) * scale));
      canvas.height = Math.max(1, Math.round(height * (box[3] - box[1]) * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('เบราว์เซอร์ไม่รองรับ Canvas');
      context.drawImage(work, width * box[0], height * box[1], width * (box[2] - box[0]), height * (box[3] - box[1]), 0, 0, canvas.width, canvas.height);
      tissue = regionTissueFraction(context.getImageData(0, 0, canvas.width, canvas.height));
    }
    results.push({ name: region.name, box: region.box, class_id: MODEL_CLASSES[winner], confidence: round(probs[winner]), tissue_fraction: round(tissue, 4), scores: Object.fromEntries(MODEL_CLASSES.map((name, i) => [name, round(probs[i])])) as Record<ModelClass, number>, views });
  }
  const { verdict, aggregation } = aggregateRegions(results);
  return { class_id: verdict.class_id, confidence: verdict.confidence, scores: verdict.scores,
    model_version: metadata.onnx_sha256.slice(0, 12), engine_version: 'browser-legacy4-1.0.0', mode,
    abstain: !quality.usable, quality, lesions, aggregation, regions: results,
    calibration: { temperature, fitted, note: fitted ? 'ปรับเทียบด้วย temperature scaling' : 'ยังไม่ได้ปรับเทียบความน่าจะเป็น คะแนนนี้เป็น softmax ดิบ' },
    inference_ms: round(performance.now() - started, 1),
  };
}

export async function compare(imageBase64: string, engine: string = 'legacy4', mode: 'fast' | 'balanced' | 'deep' = 'balanced'): Promise<VisionCompareResponse> {
  if (engine === 'legacy4') {
    const prediction = await predictLegacy4(imageBase64, mode);
    return { success: true, engine: 'legacy4', prediction: { ...prediction, engine: 'legacy4', engine_calibrated: prediction.calibration?.fitted ?? false }, disclaimer: 'ข้อสังเกตเพิ่มเติมจากภาพ ไม่ใช่คำวินิจฉัย' };
  }
  if (engine !== 'wide9') throw new Error('เครื่องยนต์นี้ไม่พร้อมใช้งานในเบราว์เซอร์');
  const source = await loadImage(imageBase64);
  const { quality, lesions } = await analyse(source);
  const { session, labels } = await wide();
  const work = workImage(source);
  const logits = await infer(session, [0, 1, 2].map((view) => prepare(work, FULL, view)));
  const averages = labels.labels.map((_, index) => logits.reduce((sum, row) => sum + softmax(row.map((value) => value / (labels.temperature || 1)))[index], 0) / logits.length);
  const weighted = averages.map((score, index) => {
    const name = labels.labels[index];
    const tier = labels.class_tiers?.[name] ?? 'direct';
    const recall = labels.per_class_recall?.[name];
    return score * (TIER_WEIGHT[tier] ?? 1) * (recall === undefined ? 1 : .6 + .4 * Math.min(1, Math.max(0, recall)));
  });
  const winner = weighted.indexOf(Math.max(...weighted));
  const scores = Object.fromEntries(labels.labels.map((name, index) => [name, round(weighted[index])]));
  return { success: true, engine: 'wide9', prediction: {
    class_id: labels.labels[winner], confidence: round(weighted[winner]), scores,
    raw_scores: Object.fromEntries(labels.labels.map((name, index) => [name, round(averages[index])])),
    engine: 'wide9', engine_calibrated: false, costs_money: false, abstain: !quality.usable, quality, lesions,
    calibration: { fitted: false, note: 'ชุดปรับเทียบไม่ใช่ภาพแตงโม คะแนนนี้ไม่ใช่ความน่าจะเป็นบนแปลงแตงโม' },
    explanation: 'คะแนนเปรียบเทียบจากโมเดลที่มีภาพพืชอื่นในชุดฝึก ไม่ใช่ความน่าจะเป็นบนแปลงแตงโม',
  }, disclaimer: 'ข้อสังเกตเพิ่มเติมเท่านั้น ไม่ใช่คำวินิจฉัยหรือแผนรักษา' };
}

export async function visionEngines(): Promise<VisionEngineList> {
  const engines: VisionEngineInfo[] = [];
  const metadata = await jsonFile<Metadata>('/models/model.onnx.json');
  if (metadata.image_size !== 224 || JSON.stringify(metadata.classes) !== JSON.stringify(MODEL_CLASSES) || !await modelAssetExists('/models/model.onnx')) throw new Error('ไม่พบโมเดล legacy4 ที่พร้อมใช้งาน');
  const calibrationResponse = await fetch('/models/calibration.json', { cache: 'force-cache' });
  let calibrated = false;
  if (calibrationResponse.ok && !(calibrationResponse.headers.get('content-type') ?? '').includes('text/html')) {
    const calibration = await calibrationResponse.json() as { temperature?: number };
    if (!Number.isFinite(calibration.temperature) || (calibration.temperature ?? 0) < .05 || (calibration.temperature ?? 0) > 20) throw new Error('ไฟล์ calibration.json ไม่ถูกต้อง');
    calibrated = true;
  }
  engines.push({ name: 'legacy4', title_th: 'โมเดลใบแตงโม 4 คลาส', classes: metadata.classes, class_count: 4, image_size: 224,
    model_version: metadata.onnx_sha256.slice(0, 12), description_th: 'วัดผลบนภาพใบแตงโม ใช้สำหรับผลตรวจหลัก',
    good_for_th: ['ตรวจโรค 3 กลุ่มที่โมเดลรู้จักและใบปกติ'], limits_th: ['ไม่รู้จักโรคนอก 4 คลาส เช่น ราแป้ง', 'ภาพเบลอหรือไม่ใช่ใบต้องถ่ายใหม่'],
    calibrated, needs_candidates: false, costs_money: false, class_provenance: {}, metrics: {} });
  const wideMetadata = await fetch('/models/wide9.labels.json', { cache: 'force-cache' });
  if (wideMetadata.ok && !(wideMetadata.headers.get('content-type') ?? '').includes('text/html')) {
    const labels = await wideMetadata.json() as Labels;
    if (!Array.isArray(labels.labels) || labels.labels.length !== 9 || labels.input_size !== 224) throw new Error('metadata ของ wide9 ไม่ถูกต้อง');
    if (!await modelAssetExists('/models/wide9.onnx')) throw new Error('พบ metadata ของ wide9 แต่ไม่พบไฟล์โมเดล');
    engines.push({ name: 'wide9', title_th: 'โมเดลเปรียบเทียบ 9 คลาส', classes: labels.labels, class_count: 9, image_size: 224,
      model_version: 'wide9', description_th: 'ครอบคลุมอาการกว้างขึ้น ใช้เป็นข้อสังเกตเพิ่มเติม',
      good_for_th: ['ดูข้อสังเกตราแป้งและโรคนอก 4 คลาส'], limits_th: ['บางคลาสฝึกจากภาพพืชอื่น', 'คะแนนไม่ใช่ความน่าจะเป็นบนแปลงแตงโม', 'ไม่ใช้เป็นคำวินิจฉัยหลัก'],
      calibrated: false, needs_candidates: false, costs_money: false, class_provenance: {}, metrics: {} });
  }
  return { default: 'legacy4', engines, note: 'ผลจากโมเดลเป็นเครื่องมือช่วยตัดสินใจ ควรตรวจอาการจริงก่อนลงมือรักษา' };
}

export async function modelStatus() {
  const { metadata, fitted, temperature } = await legacy();
  return { model_loaded: true, model_version: metadata.onnx_sha256.slice(0, 12), architecture: metadata.architecture,
    device: 'browser-wasm', classes: metadata.classes, engine_version: 'browser-legacy4-1.0.0',
    modes: ['fast', 'balanced', 'deep'], default_mode: 'balanced',
    calibration: { temperature, fitted, note: fitted ? 'ปรับเทียบแล้ว' : 'คะแนนเป็น softmax ดิบ' },
    aggregation: { tile_suspicion_threshold: .8, tile_min_tissue_fraction: .35, rule: 'crop-may-escalate-healthy-never-downgrade-disease' } };
}
