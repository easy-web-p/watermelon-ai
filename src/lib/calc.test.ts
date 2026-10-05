import { describe, expect, it } from 'vitest';
import {
  SQM_PER_RAI,
  formatTHB,
  formatTHBCompact,
  isValidThaiMobile,
  maskPhone,
  normalizePhone,
  passwordStrengthLabel,
  plantingPlan,
  scorePassword,
} from './calc';

describe('scorePassword', () => {
  it('scores an empty password as zero', () => {
    expect(scorePassword('')).toBe(0);
  });

  it('rewards length and character variety', () => {
    expect(scorePassword('abc')).toBeLessThan(scorePassword('abcdefghijkl'));
    expect(scorePassword('abcdefghijkl')).toBeLessThan(scorePassword('Abcdefghijkl'));
    expect(scorePassword('Abcdefghijkl')).toBeLessThan(scorePassword('Abcdefghij12'));
    expect(scorePassword('Abcdefghij12')).toBeLessThan(scorePassword('Abcdefghij1!'));
  });

  it('never exceeds 100', () => {
    expect(scorePassword('A'.repeat(64) + 'a1!')).toBe(100);
  });

  it('rejects a short all-lowercase password as too weak', () => {
    expect(passwordStrengthLabel(scorePassword('melon'))).toBe('อ่อนเกินไป');
  });

  it('accepts a long mixed password as strong', () => {
    expect(passwordStrengthLabel(scorePassword('Watermelon#2026!'))).toBe('แข็งแรงมาก');
  });
});

describe('passwordStrengthLabel', () => {
  it('maps each band to its Thai label', () => {
    expect(passwordStrengthLabel(0)).toBe('อ่อนเกินไป');
    expect(passwordStrengthLabel(34)).toBe('อ่อนเกินไป');
    expect(passwordStrengthLabel(35)).toBe('พอใช้');
    expect(passwordStrengthLabel(64)).toBe('พอใช้');
    expect(passwordStrengthLabel(65)).toBe('ดี');
    expect(passwordStrengthLabel(84)).toBe('ดี');
    expect(passwordStrengthLabel(85)).toBe('แข็งแรงมาก');
    expect(passwordStrengthLabel(100)).toBe('แข็งแรงมาก');
  });
});

describe('phone helpers', () => {
  it('strips formatting to bare digits', () => {
    expect(normalizePhone('084-592-8190')).toBe('0845928190');
    expect(normalizePhone('+66 84 592 8190')).toBe('66845928190');
  });

  it('accepts Thai mobile prefixes 06, 08 and 09', () => {
    expect(isValidThaiMobile('084-592-8190')).toBe(true);
    expect(isValidThaiMobile('0612345678')).toBe(true);
    expect(isValidThaiMobile('0912345678')).toBe(true);
  });

  it('rejects landlines, short numbers and wrong prefixes', () => {
    expect(isValidThaiMobile('021234567')).toBe(false);
    expect(isValidThaiMobile('08459281')).toBe(false);
    expect(isValidThaiMobile('0712345678')).toBe(false);
    expect(isValidThaiMobile('')).toBe(false);
  });

  it('masks the middle of a full number', () => {
    expect(maskPhone('0845928190')).toBe('084-XXX-8190');
    expect(maskPhone('084-592-8190')).toBe('084-XXX-8190');
  });

  it('leaves an incomplete number untouched rather than mangling it', () => {
    expect(maskPhone('0845')).toBe('0845');
  });
});

describe('plantingPlan', () => {
  it('converts Thai land units to square metres', () => {
    expect(plantingPlan({ rai: 1, ngan: 0, wa: 0 }).sqm).toBe(SQM_PER_RAI);
    expect(plantingPlan({ rai: 0, ngan: 4, wa: 0 }).sqm).toBe(SQM_PER_RAI);
    expect(plantingPlan({ rai: 0, ngan: 0, wa: 400 }).sqm).toBe(SQM_PER_RAI);
    expect(plantingPlan({ rai: 5, ngan: 2, wa: 0 }).sqm).toBe(8800);
  });

  it('leaves room for paths rather than packing the whole plot', () => {
    const plan = plantingPlan({ rai: 1, ngan: 0, wa: 0 });
    const packedTight = SQM_PER_RAI / 1.25;
    expect(plan.plants).toBeLessThan(packedTight);
    expect(plan.plants).toBe(1152);
  });

  it('scales yield with the cultivar fruit weight', () => {
    const light = plantingPlan({ rai: 1, ngan: 0, wa: 0 }, 2, 3);
    const heavy = plantingPlan({ rai: 1, ngan: 0, wa: 0 }, 5, 7);
    expect(heavy.tonnesLow).toBeGreaterThan(light.tonnesLow);
    expect(heavy.tonnesHigh).toBeGreaterThan(light.tonnesHigh);
  });

  it('keeps net revenue below gross', () => {
    const plan = plantingPlan({ rai: 5, ngan: 0, wa: 0 });
    expect(plan.netLow).toBeLessThan(plan.grossLow);
    expect(plan.netHigh).toBeLessThan(plan.grossHigh);
  });

  it('returns zeros for an empty plot instead of NaN', () => {
    const plan = plantingPlan({ rai: 0, ngan: 0, wa: 0 });
    expect(plan.sqm).toBe(0);
    expect(plan.plants).toBe(0);
    expect(plan.grossLow).toBe(0);
    expect(Number.isNaN(plan.netHigh)).toBe(false);
  });
});

describe('money formatting', () => {
  it('formats baht with Thai digit grouping', () => {
    expect(formatTHB(1234)).toBe('฿1,234');
    expect(formatTHB(1234.6)).toBe('฿1,235');
  });

  it('compacts thousands and millions', () => {
    expect(formatTHBCompact(950)).toBe('฿950');
    expect(formatTHBCompact(194400)).toBe('฿194K');
    expect(formatTHBCompact(2_500_000)).toBe('฿2.5M');
  });
});
