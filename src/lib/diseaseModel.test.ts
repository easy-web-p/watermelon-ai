import { describe, expect, it } from 'vitest';
import { DISEASES } from '../data/diseases';
import {
  MIN_DISEASE_CONFIDENCE,
  MIN_HEALTHY_CONFIDENCE,
  MODEL_CLASSES,
  MODEL_METRICS,
  OUT_OF_SCOPE_DISEASES,
  buildDetection,
  diagnosisToChatReply,
  modelCoverage,
  type ModelClass,
  type VisionPrediction,
} from './diseaseModel';

/** A prediction where `winner` takes `confidence` and the rest split the remainder. */
function prediction(winner: ModelClass, confidence: number): VisionPrediction {
  const others = MODEL_CLASSES.filter((c) => c !== winner);
  const share = (1 - confidence) / others.length;
  const scores = Object.fromEntries(
    MODEL_CLASSES.map((c) => [c, c === winner ? confidence : share]),
  ) as Record<ModelClass, number>;
  return { class_id: winner, confidence, scores, model_version: 'efficientnet_b0@test' };
}

describe('buildDetection', () => {
  it('maps a confident disease call onto the catalogue entry', () => {
    const result = buildDetection(prediction('Downy_Mildew', 0.94));
    const catalogue = DISEASES.find((d) => d.id === 'downy-mildew')!;

    expect(result.status).toBe('diagnosed');
    expect(result.disease_id).toBe('downy-mildew');
    expect(result.thai_name).toBe(catalogue.name);
    expect(result.confidence_percentage).toBe(94);
    expect(result.chemical_control).toEqual([catalogue.chemical]);
    expect(result.symptoms).toEqual([...catalogue.symptoms]);
  });

  it('never recommends a chemical without stating the pre-harvest interval', () => {
    for (const cls of ['Anthracnose', 'Downy_Mildew', 'Mosaic_Virus'] as const) {
      const result = buildDetection(prediction(cls, 0.95));
      expect(result.chemical_control.length).toBeGreaterThan(0);
      const catalogue = DISEASES.find((d) => d.id === result.disease_id)!;

      if (catalogue.phi > 0) {
        expect(result.phi_days).toBe(catalogue.phi);
        expect(result.phi_note).toContain(String(catalogue.phi));
      } else {
        // Viral/wilt entries have no curative chemical, so there is no PHI to
        // state — but the text must say that rather than leaving it blank.
        expect(result.phi_days).toBeNull();
        expect(result.phi_note).not.toBe('');
      }
    }
  });

  it('refuses to diagnose below the disease confidence bar', () => {
    const result = buildDetection(prediction('Anthracnose', MIN_DISEASE_CONFIDENCE - 0.01));

    expect(result.status).toBe('inconclusive');
    expect(result.disease_id).toBeNull();
    expect(result.chemical_control).toEqual([]);
    expect(result.phi_days).toBeNull();
    expect(result.urgent_action).toContain('ยังไม่ควรพ่นสาร');
  });

  it('diagnoses right at the disease confidence bar', () => {
    expect(buildDetection(prediction('Anthracnose', MIN_DISEASE_CONFIDENCE)).status).toBe('diagnosed');
  });

  it('holds "healthy" to a higher bar than a disease call', () => {
    // 0.62 precision on Healthy is why this bar exists: a lukewarm "your
    // plant is fine" is the one output a farmer acts on by doing nothing.
    expect(MIN_HEALTHY_CONFIDENCE).toBeGreaterThan(MIN_DISEASE_CONFIDENCE);
    expect(MODEL_METRICS.Healthy.precision).toBeLessThan(0.7);

    const weak = buildDetection(prediction('Healthy', 0.8));
    expect(weak.status).toBe('inconclusive');

    const strong = buildDetection(prediction('Healthy', MIN_HEALTHY_CONFIDENCE));
    expect(strong.status).toBe('healthy');
  });

  it('warns that a healthy result does not rule out disease', () => {
    const result = buildDetection(prediction('Healthy', 0.99));

    expect(result.disease_id).toBeNull();
    expect(result.chemical_control).toEqual([]);
    expect(result.caveats.join(' ')).toContain('ไม่ได้แปลว่าไม่มีโรค');
    // 31 true healthy at 0.62 precision → 50 calls, 19 of them wrong.
    expect(result.caveats[0]).toContain('19');
  });

  it('states the real recall for classes the model often misses', () => {
    const result = buildDetection(prediction('Downy_Mildew', 0.96));

    expect(result.model_recall_percentage).toBe(82.5);
    expect(result.caveats[0]).toContain('82.5%');
    expect(result.caveats[0]).toContain('47');
  });

  it('keeps the decision-support disclaimer on every outcome', () => {
    for (const p of [
      prediction('Anthracnose', 0.99),
      prediction('Healthy', 0.99),
      prediction('Mosaic_Virus', 0.3),
    ]) {
      expect(buildDetection(p).caveats.join(' ')).toContain('ไม่ใช่คำวินิจฉัยยืนยัน');
    }
  });

  it('tells the caller how many catalogue diseases it cannot see', () => {
    const result = buildDetection(prediction('Anthracnose', 0.99));
    expect(result.out_of_scope_diseases).toHaveLength(OUT_OF_SCOPE_DISEASES.length);
    expect(result.caveats.join(' ')).toContain(String(OUT_OF_SCOPE_DISEASES.length));
  });

  it('reports the model version so a record can be traced to a checkpoint', () => {
    expect(buildDetection(prediction('Healthy', 0.99)).model_version).toBe('efficientnet_b0@test');
  });
});

describe('catalogue coverage', () => {
  it('maps every model class except Healthy onto a real catalogue entry', () => {
    for (const cls of MODEL_CLASSES) {
      if (cls === 'Healthy') continue;
      expect(() => buildDetection(prediction(cls, 0.99))).not.toThrow();
    }
  });

  it('reports no metrics for diseases the model was never trained on', () => {
    expect(modelCoverage('fusarium-wilt')).toBeNull();
    expect(modelCoverage('powdery-mildew')).toBeNull();
    expect(modelCoverage('anthracnose')).not.toBeNull();
  });

  it('accounts for all eight catalogue entries', () => {
    expect(DISEASES).toHaveLength(8);
    expect(OUT_OF_SCOPE_DISEASES).toHaveLength(5);
    expect(DISEASES.filter((d) => modelCoverage(d.id))).toHaveLength(3);
  });
});

describe('diagnosisToChatReply', () => {
  it('names the disease and carries the full treatment plan', () => {
    const reply = diagnosisToChatReply(buildDetection(prediction('Anthracnose', 0.97)));
    const catalogue = DISEASES.find((d) => d.id === 'anthracnose')!;

    expect(reply).toContain(catalogue.name);
    expect(reply).toContain('97%');
    expect(reply).toContain(catalogue.chemical);
    expect(reply).toContain(catalogue.biological);
    expect(reply).toContain('สิ่งที่ควรทำทันที');
  });

  it('never lists a chemical rate without the pre-harvest interval', () => {
    for (const cls of ['Anthracnose', 'Downy_Mildew', 'Mosaic_Virus'] as const) {
      const diagnosis = buildDetection(prediction(cls, 0.95));
      const reply = diagnosisToChatReply(diagnosis);
      expect(reply).toContain('สารเคมีควบคุม');
      // The PHI sentence has to be in the same message as the rates.
      expect(reply).toContain(diagnosis.phi_note);
    }
  });

  it('asks for a clearer photo instead of guessing when inconclusive', () => {
    const reply = diagnosisToChatReply(buildDetection(prediction('Downy_Mildew', 0.4)));

    expect(reply).toContain('ยังสรุปไม่ได้');
    expect(reply).not.toContain('สารเคมีควบคุม');
    // No catalogue disease name may appear in a reply that reached no verdict.
    for (const disease of DISEASES) expect(reply).not.toContain(disease.name);
  });

  it('keeps the false-negative warning in a healthy reply', () => {
    const reply = diagnosisToChatReply(buildDetection(prediction('Healthy', 0.98)));

    expect(reply).toContain('ไม่พบอาการโรค');
    expect(reply).toContain('ไม่ได้แปลว่าไม่มีโรค');
    expect(reply).not.toContain('สารเคมีควบคุม');
  });

  it('states the decision-support disclaimer in every reply', () => {
    for (const p of [
      prediction('Anthracnose', 0.99),
      prediction('Healthy', 0.99),
      prediction('Downy_Mildew', 0.5),
    ]) {
      expect(diagnosisToChatReply(buildDetection(p))).toContain('ไม่ใช่คำวินิจฉัยยืนยัน');
    }
  });
});

describe('advice text is not duplicated', () => {
  it('states severity and yield loss in the urgent action, not the cultural plan again', () => {
    const diagnosis = buildDetection(prediction('Downy_Mildew', 0.95));
    const catalogue = DISEASES.find((d) => d.id === 'downy-mildew')!;

    expect(diagnosis.urgent_action).toContain(catalogue.yieldLoss);
    expect(diagnosis.prevention).toEqual([catalogue.cultural]);
    // The two sections used to carry the same sentence.
    expect(diagnosis.urgent_action).not.toContain(catalogue.cultural);
  });

  it('shows each catalogue sentence at most once in a chat reply', () => {
    const diagnosis = buildDetection(prediction('Anthracnose', 0.95));
    const reply = diagnosisToChatReply(diagnosis);
    const catalogue = DISEASES.find((d) => d.id === 'anthracnose')!;

    for (const sentence of [catalogue.cultural, catalogue.chemical, catalogue.biological]) {
      expect(reply.split(sentence).length - 1).toBe(1);
    }
  });
});
