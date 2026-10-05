/**
 * Engine v3 behaviour: the three signals `fastapi_service/inference.py` adds
 * on top of the four-way softmax, and what each one changes about what a
 * farmer is told.
 *
 * Kept apart from `diseaseModel.test.ts` because that file is the v2 contract
 * and has to keep passing untouched — every field used here is optional on
 * the wire, and the last group below asserts that a v2 service still produces
 * exactly the v2 result.
 */

import { describe, expect, it } from 'vitest';
import { DISEASES, SEVERITY_LABEL } from '../data/diseases';
import {
  LESION_AREA_CONTRADICTS_HEALTHY,
  MIN_DISEASE_CONFIDENCE,
  MODEL_CLASSES,
  STATUS_PRESENTATION,
  buildDetection,
  diagnosisToChatReply,
  type Aggregation,
  type DetectionStatus,
  type LesionMeasurement,
  type ModelClass,
  type PhotoQuality,
  type VisionPrediction,
} from './diseaseModel';

/** A v2 prediction: `winner` takes `confidence`, the rest split the remainder. */
function v2(winner: ModelClass, confidence: number): VisionPrediction {
  const others = MODEL_CLASSES.filter((c) => c !== winner);
  const share = (1 - confidence) / others.length;
  const scores = Object.fromEntries(
    MODEL_CLASSES.map((c) => [c, c === winner ? confidence : share]),
  ) as Record<ModelClass, number>;
  return { class_id: winner, confidence, scores, model_version: 'efficientnet_b0@test' };
}

const USABLE: PhotoQuality = {
  verdict: 'usable',
  usable: true,
  reasons: [],
  focus_score: 240,
  leaf_fraction: 0.97,
};

const CLEAN_LEAF: LesionMeasurement = {
  measured: true,
  healthy_fraction: 1,
  chlorotic_fraction: 0,
  necrotic_fraction: 0,
  discolored_fraction: 0,
};

/** A v3 prediction. `overrides` carries whichever engine fields matter. */
function v3(
  winner: ModelClass,
  confidence: number,
  overrides: Partial<VisionPrediction> = {},
): VisionPrediction {
  return {
    ...v2(winner, confidence),
    engine_version: '3.0.0',
    mode: 'balanced',
    abstain: false,
    quality: USABLE,
    lesions: CLEAN_LEAF,
    calibration: { temperature: 1, fitted: false, note: 'raw' },
    ...overrides,
  };
}

function unreadable(reasons: string[], overrides: Partial<PhotoQuality> = {}): Partial<VisionPrediction> {
  return {
    abstain: true,
    quality: { ...USABLE, verdict: 'unusable', usable: false, reasons, ...overrides },
  };
}

/** The aggregation block for a crop that overruled the whole frame. */
function escalation(tileClass: ModelClass, frameConfidence = 0.94): Partial<VisionPrediction> {
  const aggregation: Aggregation = {
    source_region: 'q-bl',
    escalated_from_healthy: true,
    supporting_tiles: ['q-bl'],
    agrees_with_frame_runner_up: true,
    frame_class_id: 'Healthy',
    frame_confidence: frameConfidence,
    frame_runner_up: tileClass,
    regions_scored: 5,
  };
  return {
    aggregation,
    regions: [
      {
        name: 'q-bl',
        box: [0, 0.45, 0.55, 1],
        class_id: tileClass,
        confidence: 0.86,
        tissue_fraction: 0.91,
      },
    ],
  };
}

function discolored(fraction: number): Partial<VisionPrediction> {
  return {
    lesions: {
      measured: true,
      healthy_fraction: 1 - fraction,
      chlorotic_fraction: fraction,
      necrotic_fraction: 0,
      discolored_fraction: fraction,
    },
  };
}

describe('an unreadable photo', () => {
  it('reports that nothing was examined, not that nothing was found', () => {
    const result = buildDetection(
      buildUnreadable('ไม่พบเนื้อใบในภาพ (เจอเพียง 3% ของเฟรม) ให้ถ่ายใกล้ขึ้นจนใบเต็มกรอบภาพ'),
    );

    expect(result.status).toBe('unusable');
    expect(result.disease_id).toBeNull();
    expect(result.chemical_control).toEqual([]);
    expect(result.phi_days).toBeNull();
    // The distinction a farmer has to be able to make.
    expect(result.caveats[0]).toContain('ไม่ใช่ว่าตรวจแล้วไม่พบโรค');
    expect(result.urgent_action).toContain('ถ่ายใกล้ขึ้น');
  });

  function buildUnreadable(reason: string): VisionPrediction {
    return v3('Anthracnose', 0.93, unreadable([reason], { leaf_fraction: 0.03 }));
  }

  it('quotes no confidence figure for a measurement that never ran', () => {
    const result = buildDetection(
      v3('Mosaic_Virus', 0.97, unreadable(['ภาพเบลอเกินกว่าจะอ่านแผลได้'], { focus_score: 4 })),
    );

    expect(result.confidence_percentage).toBe(0);
    expect(result.lesion_area_percentage).toBeNull();
    expect(diagnosisToChatReply(result)).not.toContain('ความมั่นใจ');
  });

  it('is decided before any confidence bar, so a confident wrong answer cannot pass', () => {
    // 0.99 on Anthracnose clears MIN_DISEASE_CONFIDENCE comfortably. The photo
    // is of something that is not a leaf, so that must not matter — this is
    // the grey-wall case that returns a disease from the real checkpoint.
    const result = buildDetection(
      v3('Anthracnose', 0.99, unreadable(['ภาพนี้ไม่มีเนื้อใบสีเขียวเลย'], { leaf_fraction: 0 })),
    );

    expect(result.status).toBe('unusable');
    for (const disease of DISEASES) expect(result.thai_name).not.toContain(disease.name);
  });

  it('keeps the decision-support disclaimer even though nothing was analysed', () => {
    const result = buildDetection(v3('Healthy', 0.99, unreadable(['ภาพมืดเกินไป'])));
    expect(result.caveats.join(' ')).toContain('ไม่ใช่คำวินิจฉัยยืนยัน');
  });

  it('never reads as reassuring', () => {
    const result = buildDetection(v3('Healthy', 0.99, unreadable(['ภาพมืดเกินไป'])));
    expect(STATUS_PRESENTATION[result.status].reassuring).toBe(false);
    expect(result.severity_level).toBe(0);
  });
});

describe('a crop that overrules a whole-frame "healthy"', () => {
  it('reports the disease instead of letting the frame call the leaf healthy', () => {
    const result = buildDetection(v3('Downy_Mildew', 0.86, escalation('Downy_Mildew')));

    expect(result.status).toBe('suspect');
    expect(result.disease_id).toBe('downy-mildew');
    expect(result.escalated_from_healthy).toBe(true);
  });

  it('never reads as reassuring, in any field a screen might print', () => {
    const result = buildDetection(v3('Anthracnose', 0.88, escalation('Anthracnose')));

    expect(STATUS_PRESENTATION[result.status].reassuring).toBe(false);
    // Routes that only check `status === 'diagnosed'` fall back to these.
    expect(result.thai_name).toContain('น่าสงสัย');
    expect(result.severity).not.toContain('ไม่พบ');
    expect(result.severity_level).toBeGreaterThan(0);
  });

  it('carries the full treatment plan, with the pre-harvest interval', () => {
    for (const cls of ['Anthracnose', 'Downy_Mildew', 'Mosaic_Virus'] as const) {
      const result = buildDetection(v3(cls, 0.85, escalation(cls)));
      const catalogue = DISEASES.find((d) => d.id === result.disease_id)!;

      expect(result.chemical_control).toEqual([catalogue.chemical]);
      // Rule 1 holds for a suspicion exactly as it does for a diagnosis.
      expect(result.phi_note).not.toBe('');
      if (catalogue.phi > 0) expect(result.phi_note).toContain(String(catalogue.phi));
      expect(diagnosisToChatReply(result)).toContain(result.phi_note);
    }
  });

  it('tells the farmer to verify before spraying the field', () => {
    const result = buildDetection(v3('Downy_Mildew', 0.86, escalation('Downy_Mildew')));

    expect(result.urgent_action).toContain('ยังไม่ต้องพ่นทั้งแปลง');
    expect(result.urgent_action).toContain('ดูใบจริง');
    expect(diagnosisToChatReply(result)).toContain('ซูมดูแยกส่วน');
  });

  it('explains that the whole frame disagreed, with both numbers', () => {
    const result = buildDetection(v3('Mosaic_Virus', 0.83, escalation('Mosaic_Virus', 0.91)));

    expect(result.caveats[0]).toContain('91%');
    expect(result.caveats[0]).toContain('83%');
    expect(result.caveats[1]).toContain('19 จาก 50');
  });

  it('points at the crop the finding came from', () => {
    const result = buildDetection(v3('Downy_Mildew', 0.86, escalation('Downy_Mildew')));

    expect(result.evidence_region).not.toBeNull();
    expect(result.evidence_region!.name).toBe('q-bl');
    expect(result.evidence_region!.box).toEqual([0, 0.45, 0.55, 1]);
  });

  it('still refuses when even the crop is below the disease bar', () => {
    const result = buildDetection(
      v3('Downy_Mildew', MIN_DISEASE_CONFIDENCE - 0.01, escalation('Downy_Mildew')),
    );

    expect(result.status).toBe('inconclusive');
    expect(result.chemical_control).toEqual([]);
  });

  it('is unreachable when the engine did not escalate', () => {
    const result = buildDetection(v3('Downy_Mildew', 0.95));

    expect(result.status).toBe('diagnosed');
    expect(result.escalated_from_healthy).toBe(false);
    expect(result.evidence_region).toBeNull();
  });
});

describe('measured lesion area', () => {
  it('is reported alongside a diagnosis, labelled as not coming from the model', () => {
    const result = buildDetection(v3('Anthracnose', 0.95, discolored(0.23)));

    expect(result.lesion_area_percentage).toBe(23);
    expect(result.caveats.join(' ')).toContain('23%');
    expect(result.caveats.join(' ')).toContain('ไม่ได้มาจากโมเดล');
  });

  it('contradicts a "healthy" verdict in writing when the two disagree', () => {
    const result = buildDetection(
      v3('Healthy', 0.97, discolored(LESION_AREA_CONTRADICTS_HEALTHY + 0.05)),
    );

    expect(result.status).toBe('healthy');
    // Still no chemical advice: the model found no disease to treat.
    expect(result.chemical_control).toEqual([]);
    expect(result.urgent_action).toContain('ดูใบจริง');
    expect(result.caveats.join(' ')).toContain('ไม่ตรงกับโมเดล');
  });

  it('stays quiet about ordinary leaf wear below the bar', () => {
    const result = buildDetection(
      v3('Healthy', 0.97, discolored(LESION_AREA_CONTRADICTS_HEALTHY - 0.02)),
    );

    expect(result.caveats.join(' ')).not.toContain('ไม่ตรงกับโมเดล');
    expect(result.urgent_action).not.toContain('ดูใบจริง');
  });

  it('reports nothing when there was too little leaf to measure', () => {
    const result = buildDetection(
      v3('Anthracnose', 0.95, { lesions: { ...CLEAN_LEAF, measured: false } }),
    );

    expect(result.lesion_area_percentage).toBeNull();
    expect(result.caveats.join(' ')).not.toContain('เนื้อใบเปลี่ยนสีไปแล้ว');
  });

  it('does not move the catalogue severity level', () => {
    const catalogue = DISEASES.find((d) => d.id === 'anthracnose')!;
    const mild = buildDetection(v3('Anthracnose', 0.95, discolored(0.02)));
    const severe = buildDetection(v3('Anthracnose', 0.95, discolored(0.8)));

    // A barely-marked leaf must not be presented as a milder disease than a
    // covered one: anthracnose costs the same share of the crop either way.
    expect(mild.severity_level).toBe(severe.severity_level);
    expect(mild.severity).toBe(SEVERITY_LABEL[catalogue.severity]);
  });
});

describe('photo quality and calibration are reported honestly', () => {
  it('passes a marginal photo through but says what was wrong with it', () => {
    const result = buildDetection(
      v3('Downy_Mildew', 0.93, {
        quality: {
          ...USABLE,
          verdict: 'marginal',
          reasons: ['ภาพค่อนข้างเบลอ (คะแนนความคม 40) แผลเล็กระยะแรกอาจหายไปจากภาพนี้'],
          focus_score: 40,
        },
      }),
    );

    expect(result.status).toBe('diagnosed');
    expect(result.photo_quality!.verdict).toBe('marginal');
    expect(result.caveats.join(' ')).toContain('ค่อนข้างเบลอ');
  });

  it('warns that an uncalibrated confidence reads higher than it is', () => {
    const result = buildDetection(v3('Anthracnose', 0.95));

    expect(result.confidence_calibrated).toBe(false);
    expect(result.caveats.join(' ')).toContain('ยังไม่ได้ปรับเทียบ');
  });

  it('drops that warning once a temperature has been fitted', () => {
    const result = buildDetection(
      v3('Anthracnose', 0.95, { calibration: { temperature: 1.42, fitted: true, note: 'fitted' } }),
    );

    expect(result.confidence_calibrated).toBe(true);
    expect(result.caveats.join(' ')).not.toContain('ยังไม่ได้ปรับเทียบ');
  });

  it('names the engine and mode so a record can be traced', () => {
    expect(buildDetection(v3('Healthy', 0.99)).engine).toBe('3.0.0 / balanced');
  });

  it('says a healthy result was checked crop by crop, which a v2 result was not', () => {
    const aggregation: Aggregation = {
      source_region: 'full',
      escalated_from_healthy: false,
      supporting_tiles: [],
      agrees_with_frame_runner_up: false,
      frame_class_id: 'Healthy',
      frame_confidence: 0.97,
      frame_runner_up: 'Downy_Mildew',
      regions_scored: 5,
    };
    const result = buildDetection(v3('Healthy', 0.97, { aggregation }));

    expect(result.caveats.join(' ')).toContain('ซูมตรวจแยก 4 บริเวณ');
    // ...and the false-negative warning is still the first thing said.
    expect(result.caveats[0]).toContain('ไม่ได้แปลว่าไม่มีโรค');
  });
});

describe('a v2 service still works unchanged', () => {
  it('produces the v2 statuses with every engine field absent', () => {
    expect(buildDetection(v2('Anthracnose', 0.95)).status).toBe('diagnosed');
    expect(buildDetection(v2('Healthy', 0.95)).status).toBe('healthy');
    expect(buildDetection(v2('Healthy', 0.5)).status).toBe('inconclusive');
  });

  it('reports the engine fields as absent rather than inventing them', () => {
    const result = buildDetection(v2('Anthracnose', 0.95));

    expect(result.engine).toBeNull();
    expect(result.photo_quality).toBeNull();
    expect(result.lesion_area_percentage).toBeNull();
    expect(result.evidence_region).toBeNull();
    expect(result.escalated_from_healthy).toBe(false);
    expect(result.confidence_calibrated).toBe(false);
  });

  it('adds no engine caveats to a v2 result', () => {
    // The recall sentence has to stay first; `diseaseModel.test.ts` asserts it.
    const result = buildDetection(v2('Downy_Mildew', 0.96));

    expect(result.caveats[0]).toContain('82.5%');
    expect(result.caveats.join(' ')).not.toContain('ยังไม่ได้ปรับเทียบ');
  });
});

describe('STATUS_PRESENTATION covers every status', () => {
  const statuses: DetectionStatus[] = [
    'diagnosed',
    'suspect',
    'healthy',
    'inconclusive',
    'unusable',
  ];

  it('describes all five, so nothing can fall through to a default', () => {
    for (const status of statuses) {
      expect(STATUS_PRESENTATION[status]).toBeDefined();
      expect(STATUS_PRESENTATION[status].label).not.toBe('');
      expect(STATUS_PRESENTATION[status].icon).not.toBe('');
    }
    expect(Object.keys(STATUS_PRESENTATION)).toHaveLength(statuses.length);
  });

  it('marks exactly one status as reassuring', () => {
    const reassuring = Object.entries(STATUS_PRESENTATION)
      .filter(([, value]) => value.reassuring)
      .map(([key]) => key);
    expect(reassuring).toEqual(['healthy']);
  });

  it('marks only the statuses that carry a treatment plan as actionable', () => {
    for (const [status, presentation] of Object.entries(STATUS_PRESENTATION)) {
      expect(presentation.actionable).toBe(status === 'diagnosed' || status === 'suspect');
    }
  });

  it('agrees with what buildDetection actually produces', () => {
    const cases: [VisionPrediction, DetectionStatus][] = [
      [v3('Anthracnose', 0.95), 'diagnosed'],
      [v3('Downy_Mildew', 0.86, escalation('Downy_Mildew')), 'suspect'],
      [v3('Healthy', 0.97), 'healthy'],
      [v3('Mosaic_Virus', 0.4), 'inconclusive'],
      [v3('Anthracnose', 0.99, unreadable(['ภาพมืดเกินไป'])), 'unusable'],
    ];
    for (const [prediction, expected] of cases) {
      const result = buildDetection(prediction);
      expect(result.status).toBe(expected);
      const presentation = STATUS_PRESENTATION[result.status];
      // A status that claims to be actionable has to have something to act on.
      expect(presentation.actionable).toBe(result.chemical_control.length > 0);
      // ...and a chemical never appears without its PHI.
      if (result.chemical_control.length) expect(result.phi_note).not.toBe('');
    }
  });
});

describe('model_class points at the right row of the score distribution', () => {
  // `scores` is keyed by model label ('Downy_Mildew') while `disease_id` is a
  // catalogue key ('downy-mildew'). A renderer that compared a `scores` key
  // against `disease_id` highlighted nothing, silently, for every disease.
  it('is a key of scores, not a catalogue id', () => {
    const result = buildDetection(v2('Downy_Mildew', 0.94));

    expect(result.model_class).toBe('Downy_Mildew');
    expect(result.disease_id).toBe('downy-mildew');
    expect(result.model_class).not.toBe(result.disease_id);
    expect(Object.keys(result.scores)).toContain(result.model_class!);
  });

  it('names the winning class for every verdict the model reaches', () => {
    for (const cls of MODEL_CLASSES) {
      const result = buildDetection(v2(cls, 0.95));
      expect(result.model_class).toBe(cls);
      // ...and it really is the top-scoring row.
      const top = MODEL_CLASSES.reduce((a, b) => (result.scores[a] >= result.scores[b] ? a : b));
      expect(result.model_class).toBe(top);
    }
  });

  it('names the crop-level class on a suspect result', () => {
    const result = buildDetection(v3('Mosaic_Virus', 0.86, escalation('Mosaic_Virus')));

    expect(result.status).toBe('suspect');
    expect(result.model_class).toBe('Mosaic_Virus');
  });

  it('is null when no verdict was reached, so nothing gets marked a winner', () => {
    expect(buildDetection(v2('Anthracnose', 0.5)).model_class).toBeNull();
    expect(buildDetection(v3('Anthracnose', 0.99, unreadable(['ภาพมืดเกินไป']))).model_class).toBeNull();
  });
});
