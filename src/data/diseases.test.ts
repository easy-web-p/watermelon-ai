import { describe, expect, it } from 'vitest';
import { DISEASES, SEVERITY_LABEL, SEVERITY_TONE } from './diseases';

/**
 * Safety invariants over the disease catalogue.
 *
 * These are not style checks. The catalogue is rendered directly on
 * `/diseases` and feeds every diagnosis card, so an entry that names a
 * fungicide without its pre-harvest interval puts residue on fruit that goes
 * to market.
 */

/** Terms that indicate the text is recommending a product, not a practice. */
const NAMES_A_PRODUCT = [
  'แมนโคเซบ',
  'อะซ็อกซีสโตรบิน',
  'ไดเมโทมอร์ฟ',
  'ไดฟีโนโคนาโซล',
  'คลอโรทาโลนิล',
  'โพรพิเนบ',
  'คาร์เบนดาซิม',
  'เมทาแลกซิล',
  'ไซมอกซานิล',
  'สไปนีโทแรม',
  'ไดโนทีฟูแรน',
  'อิมิดาคลอพริด',
  'อะบาเมกติน',
  'โพรพาร์ไกต์',
  'เฮกซีไทอะซ็อกซ์',
  'คอปเปอร์',
  'สเตรปโตมัยซิน',
];

/** Markers that the text tells the reader where to find the interval. */
const POINTS_AT_AN_INTERVAL = ['PHI', 'ระยะปลอดภัย', 'ฉลาก'];

describe('disease catalogue safety', () => {
  it('has a unique id for every entry', () => {
    const ids = DISEASES.map((d) => d.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never names a chemical product without a pre-harvest interval', () => {
    for (const disease of DISEASES) {
      if (!NAMES_A_PRODUCT.some((product) => disease.chemical.includes(product))) continue;

      // Either the entry carries a numeric PHI, or its own text sends the
      // reader to the label for one. Silence is what the rule forbids.
      const hasNumericPhi = disease.phi > 0;
      const defersToLabel = POINTS_AT_AN_INTERVAL.some((marker) => disease.chemical.includes(marker));

      expect(
        hasNumericPhi || defersToLabel,
        `${disease.id} names a chemical product but states no pre-harvest interval`,
      ).toBe(true);
    }
  });

  it('keeps every pre-harvest interval a plausible whole number of days', () => {
    for (const disease of DISEASES) {
      expect(Number.isInteger(disease.phi), `${disease.id} has a fractional PHI`).toBe(true);
      expect(disease.phi).toBeGreaterThanOrEqual(0);
      // Nothing registered for cucurbits in Thailand runs anywhere near this,
      // so a larger value is a data-entry slip rather than a real interval.
      expect(disease.phi).toBeLessThanOrEqual(60);
    }
  });

  it('describes a zero-PHI entry as having no chemical treatment', () => {
    // `phi: 0` is rendered as "ไม่ใช้สารเคมีรักษา" on the catalogue card, so an
    // entry cannot use it to mean "interval not recorded yet".
    for (const disease of DISEASES.filter((d) => d.phi === 0)) {
      expect(disease.chemical, `${disease.id} claims no chemical treatment`).toContain('ไม่มีสารเคมีรักษา');
    }
  });

  it('fills in every field a card renders, so nothing shows as blank', () => {
    for (const disease of DISEASES) {
      for (const field of [
        'name',
        'latin',
        'pathogen',
        'category',
        'yieldLoss',
        'conditions',
        'chemical',
        'biological',
        'cultural',
      ] as const) {
        expect(String(disease[field]).trim(), `${disease.id}.${field} is empty`).not.toBe('');
      }
      expect(disease.symptoms.length, `${disease.id} lists no symptoms`).toBeGreaterThan(0);
    }
  });

  it('uses a severity the label and tone maps both know', () => {
    for (const disease of DISEASES) {
      expect(SEVERITY_LABEL[disease.severity]).toBeTruthy();
      expect(SEVERITY_TONE[disease.severity]).toBeTruthy();
    }
  });
});
