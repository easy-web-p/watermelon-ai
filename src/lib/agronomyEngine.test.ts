import { describe, expect, it } from 'vitest';
import { calculateAgronomyPlan, generate10WeekPlan, SPACING_PRESETS, PLANTING_SYSTEMS } from './agronomyEngine';

describe('calculateAgronomyPlan', () => {
  it('correctly calculates area, plants, and density for 5 rai 2 ngan', () => {
    const result = calculateAgronomyPlan({
      rai: 5,
      ngan: 2,
      wa: 0,
      cultivarId: 'torpedo',
      spacingId: 'standard',
      systemId: 'plastic_mulch',
      seasonId: 'dry_winter',
      soilId: 'sandy_loam',
    });

    expect(result.totalSqm).toBe(8800);
    expect(result.usableSqm).toBe(8800 * 0.90);
    expect(result.plantSpacingArea).toBe(0.5 * 2.5);
    expect(result.plants).toBeGreaterThan(6000);
    expect(result.seedlingReserve).toBe(Math.round(result.plants * 0.045));
    expect(result.totalSeedlings).toBe(result.plants + result.seedlingReserve);
    expect(result.densityScore).toBeGreaterThanOrEqual(50);
  });

  it('adjusts yield and Brix based on season and cultivar', () => {
    const winterPlan = calculateAgronomyPlan({
      rai: 2,
      ngan: 0,
      wa: 0,
      cultivarId: 'torpedo',
      spacingId: 'standard',
      systemId: 'plastic_mulch',
      seasonId: 'dry_winter',
      soilId: 'sandy_loam',
    });

    const rainyPlan = calculateAgronomyPlan({
      rai: 2,
      ngan: 0,
      wa: 0,
      cultivarId: 'torpedo',
      spacingId: 'standard',
      systemId: 'plastic_mulch',
      seasonId: 'rainy',
      soilId: 'sandy_loam',
    });

    expect(winterPlan.tonnesLow).toBeGreaterThan(rainyPlan.tonnesLow);
    expect(winterPlan.expectedBrixLow).toBeGreaterThan(rainyPlan.expectedBrixLow);
  });

  it('calculates fertilizer stages and water requirement correctly', () => {
    const plan = calculateAgronomyPlan({
      rai: 1,
      ngan: 0,
      wa: 0,
      cultivarId: 'kinnaree-202',
      spacingId: 'standard',
      systemId: 'plastic_mulch',
      seasonId: 'summer',
      soilId: 'sandy_loam',
    });

    expect(plan.stageFertilizers.length).toBe(5);
    expect(plan.dailyWaterCubicMeters).toBeGreaterThan(0);
    expect(plan.totalWaterCubicMeters).toBeGreaterThan(0);
    expect(plan.totalCost).toBeGreaterThan(0);
    expect(plan.grossRevenueHigh).toBeGreaterThan(plan.totalCost);
  });

  it('generates a full 10-week lifecycle plan', () => {
    const plan = calculateAgronomyPlan({
      rai: 1,
      ngan: 0,
      wa: 0,
      cultivarId: 'chonya-plus',
      spacingId: 'wide',
      systemId: 'plastic_mulch',
      seasonId: 'dry_winter',
      soilId: 'sandy_loam',
    });

    const weeks = generate10WeekPlan(plan.cultivar, plan.plants);
    expect(weeks.length).toBe(10);
    expect(weeks[0].week).toBe(1);
    expect(weeks[9].week).toBe(10);
    expect(weeks[3].critical).toBe(true); // Week 4 pollination
    expect(weeks[8].critical).toBe(true); // Week 9 pre-harvest dry
  });
});
