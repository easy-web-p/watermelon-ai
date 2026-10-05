import { describe, expect, it } from 'vitest';
import { scaleRate, sortByMixOrder } from './TankMixer';
import { MIX_SEQUENCE, TANK_KITS } from '../../data/tankmix';

describe('scaleRate', () => {
  it('returns the label rate unchanged for a 20 litre backpack', () => {
    expect(scaleRate(60, 20)).toBe(60);
  });

  it('scales linearly with tank size', () => {
    expect(scaleRate(60, 200)).toBe(600);
    expect(scaleRate(60, 1000)).toBe(3000);
  });

  it('rounds small doses to one decimal so a kitchen scale can measure them', () => {
    expect(scaleRate(5, 20)).toBe(5);
    expect(scaleRate(5, 30)).toBe(7.5);
  });

  it('rounds large doses to the nearest 10 — nobody weighs 2,847 grams', () => {
    expect(scaleRate(57, 1000) % 10).toBe(0);
  });

  it('handles a half tank without producing a fractional mess', () => {
    const value = scaleRate(40, 10);
    expect(value).toBe(20);
  });
});

describe('sortByMixOrder', () => {
  it('puts wettable powders before suspensions before surfactant', () => {
    const kit = TANK_KITS.find((k) => k.id === 'brix-booster')!;
    const order = sortByMixOrder(kit.components).map((c) => c.formulation);

    const positions = order.map((f) => MIX_SEQUENCE.indexOf(f));
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  it('always ends with the surfactant when a kit contains one', () => {
    for (const kit of TANK_KITS) {
      const ordered = sortByMixOrder(kit.components);
      const hasSurfactant = kit.components.some((c) => c.formulation === 'สารจับใบ');
      if (!hasSurfactant) continue;
      expect(ordered[ordered.length - 1].formulation).toBe('สารจับใบ');
    }
  });

  it('does not drop or duplicate any component', () => {
    for (const kit of TANK_KITS) {
      const ordered = sortByMixOrder(kit.components);
      expect(ordered).toHaveLength(kit.components.length);
      expect(new Set(ordered.map((c) => c.name)).size).toBe(kit.components.length);
    }
  });

  it('leaves the source array untouched', () => {
    const kit = TANK_KITS[0];
    const before = kit.components.map((c) => c.name);
    sortByMixOrder(kit.components);
    expect(kit.components.map((c) => c.name)).toEqual(before);
  });
});

describe('tank kit data integrity', () => {
  it('gives every component a formulation the mix sequence knows about', () => {
    for (const kit of TANK_KITS) {
      for (const component of kit.components) {
        expect(MIX_SEQUENCE).toContain(component.formulation);
      }
    }
  });

  it('marks biological kits as safe up to harvest', () => {
    const bio = TANK_KITS.find((k) => k.id === 'bio-root')!;
    expect(bio.phi).toBe(0);
    expect(bio.components.every((c) => c.formulation === 'ชีวภัณฑ์')).toBe(true);
  });

  it('requires a pre-harvest interval on every kit containing a pesticide', () => {
    for (const kit of TANK_KITS) {
      const hasChemical = kit.components.some(
        (c) => c.formulation !== 'ชีวภัณฑ์' && c.formulation !== 'สารจับใบ' && /FRAC|IRAC/.test(c.note ?? ''),
      );
      if (hasChemical) expect(kit.phi).toBeGreaterThan(0);
    }
  });
});
