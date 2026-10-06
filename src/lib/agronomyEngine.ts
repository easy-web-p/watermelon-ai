import { CULTIVARS, type Cultivar } from '../data/cultivars';
import { SQM_PER_RAI, SQM_PER_NGAN, SQM_PER_WA } from './calc';

export type SpacingPreset = {
  id: string;
  label: string;
  plantDist: number; // meters
  rowDist: number; // meters
  description: string;
};

export const SPACING_PRESETS: readonly SpacingPreset[] = [
  {
    id: 'standard',
    label: 'ระยะมาตรฐาน (0.5 × 2.5 ม.)',
    plantDist: 0.5,
    rowDist: 2.5,
    description: 'พื้นที่ 1.25 ตร.ม./ต้น สมดุลผลผลิตและคุณภาพ เหมาะกับพันธุ์ส่วนใหญ่',
  },
  {
    id: 'dense',
    label: 'ระยะชิด (0.4 × 2.0 ม.)',
    plantDist: 0.4,
    rowDist: 2.0,
    description: 'พื้นที่ 0.80 ตร.ม./ต้น เพิ่มจำนวนต้น/ไร่ เหมาะกับแตงโมผลเล็ก เช่น กินรี หรือ ซันเล่อ',
  },
  {
    id: 'wide',
    label: 'ระยะห่าง (0.6 × 3.0 ม.)',
    plantDist: 0.6,
    rowDist: 3.0,
    description: 'พื้นที่ 1.80 ตร.ม./ต้น ระบายอากาศดีเยี่ยม ลดโรค เหมาะกับพันธุ์ผลใหญ่พิเศษ เช่น ตอร์ปิโด',
  },
] as const;

export type PlantingSystem = {
  id: string;
  name: string;
  usableFraction: number; // fraction of plot usable for plant beds
  costPerRaiMultiplier: number;
  description: string;
};

export const PLANTING_SYSTEMS: readonly PlantingSystem[] = [
  {
    id: 'plastic_mulch',
    name: 'ยกร่องคลุมพลาสติกดำ–เงิน',
    usableFraction: 0.90,
    costPerRaiMultiplier: 1.0,
    description: 'มาตรฐานเกษตรแม่นยำ คุมวัชพืช เก็บความชื้น เพิ่มอัตราผลผลิต 25%',
  },
  {
    id: 'bare_ground',
    name: 'ยกร่องดินเปล่า (ไม่คลุมพลาสติก)',
    usableFraction: 0.84,
    costPerRaiMultiplier: 0.75,
    description: 'ประหยัดต้นทุนอุปกรณ์ช่วงต้น แต่เสี่ยงวัชพืชและการระเหยน้ำสูงกว่า',
  },
  {
    id: 'greenhouse',
    name: 'โรงเรือนแขวนค้าง (Greenhouse Trellis)',
    usableFraction: 0.94,
    costPerRaiMultiplier: 2.4,
    description: 'เกรดพรีเมียม ป้องกันโรคพืชและแมลงศัตรูพืชได้ 95% ผิวผลสวยสมบูรณ์',
  },
] as const;

export type SeasonType = 'dry_winter' | 'summer' | 'rainy';

export const SEASONS: readonly { id: SeasonType; label: string; months: string; yieldFactor: number; brixBonus: number; diseaseRisk: string }[] = [
  {
    id: 'dry_winter',
    label: 'ฤดูแล้ง / หนาว (พ.ย. – ก.พ.)',
    months: 'พฤศจิกายน – กุมภาพันธ์',
    yieldFactor: 1.05,
    brixBonus: 0.6,
    diseaseRisk: 'เสี่ยงเพลี้ยไฟ ไรแดง และไวรัสใบด่าง แต่ความหวานจะสูงที่สุดในรอบปี',
  },
  {
    id: 'summer',
    label: 'ฤดูร้อน (มี.ค. – พ.ค.)',
    months: 'มีนาคม – พฤษภาคม',
    yieldFactor: 1.0,
    brixBonus: 0.3,
    diseaseRisk: 'เติบโตรวดเร็ว ต้องการน้ำสูง ระวังแดดเผาผล (Sunburn) และไส้ล้ม',
  },
  {
    id: 'rainy',
    label: 'ฤดูฝน (มิ.ย. – ต.ค.)',
    months: 'มิถุนายน – ตุลาคม',
    yieldFactor: 0.88,
    brixBonus: -0.4,
    diseaseRisk: 'ความชื้นสูง ระวังโรคราน้ำค้าง แอนแทรคโนส และผลแตก ระบายน้ำต้องดีมาก',
  },
] as const;

export type SoilType = 'sandy_loam' | 'loam' | 'clay';

export const SOIL_TYPES: readonly { id: SoilType; label: string; desc: string; waterFactor: number }[] = [
  {
    id: 'sandy_loam',
    label: 'ดินร่วนปนทราย (เหมาะสมที่สุด)',
    desc: 'ระบายน้ำและอากาศดี รากแผ่กระจายได้ลึก ค่า pH ที่เหมาะสม 6.0 – 6.8',
    waterFactor: 1.15,
  },
  {
    id: 'loam',
    label: 'ดินร่วน',
    desc: 'อุ้มน้ำและธาตุอาหารได้ดี ควรรักษาหน้าดินให้โปร่ง',
    waterFactor: 1.0,
  },
  {
    id: 'clay',
    label: 'ดินเหนียว',
    desc: 'ระบายน้ำช้า ต้องยกร่องสูง 35–40 ซม. ผสมแกลบดำหรืออินทรียวัตถุเพิ่ม',
    waterFactor: 0.85,
  },
] as const;

export type CalculationInput = {
  rai: number;
  ngan: number;
  wa: number;
  cultivarId: string;
  spacingId: string;
  customPlantDist?: number;
  customRowDist?: number;
  systemId: string;
  seasonId: SeasonType;
  soilId: SoilType;
  targetFruitPrice?: number; // THB per kg
};

export type FullAgronomyCalculation = {
  // Area & density
  totalSqm: number;
  usableSqm: number;
  plantSpacingArea: number; // sqm per plant
  plants: number;
  seedlingReserve: number; // 4.5% extra
  totalSeedlings: number;
  plantsPerRai: number;
  densityScore: number; // 0-100 meter
  densityStatus: 'เบาบาง' | 'พอเหมาะ (แนะนำ)' | 'หนาแน่นมาก';

  // Physical layout
  rowsCount: number;
  avgRowLengthMeters: number;
  plantsPerRow: number;
  dripLineMeters: number;
  mulchRollsNeeded: number; // 400m per roll

  // Yield projection
  avgFruitWeightKg: number;
  fruitSetRate: number; // e.g. 0.94 (94%)
  tonnesLow: number;
  tonnesHigh: number;
  gradeAYieldTonnes: number;
  gradeBYieldTonnes: number;
  expectedBrixLow: number;
  expectedBrixHigh: number;
  yieldScore: number; // 0-100 meter

  // Water requirements
  dailyWaterCubicMeters: number;
  totalWaterCubicMeters: number;
  waterCyclesPerDay: number;
  cycleDurationMinutes: number;

  // Fertilizer & Nutrition requirement (Total for entire plot)
  totalManureKg: number;
  totalBaseFertilizerKg: number; // 15-15-15
  totalGrowthFertilizerKg: number; // 25-7-7
  totalFlowerFertilizerKg: number; // 15-0-0 + Ca-B
  totalSweetnessFertilizerKg: number; // 13-13-21 / 0-0-60
  stageFertilizers: {
    stage: number;
    title: string;
    formula: string;
    kgTotal: number;
    kgPerRai: number;
    timing: string;
  }[];

  // Financial simulation
  seedCost: number;
  mulchAndDripCost: number;
  fertilizerCost: number;
  laborAndPrepCost: number;
  totalCost: number;
  costPerRai: number;
  costPerPlant: number;
  grossRevenueLow: number;
  grossRevenueHigh: number;
  netProfitLow: number;
  netProfitHigh: number;
  roiLow: number; // percentage
  roiHigh: number; // percentage
  avgPricePerKg: number;

  // AI Agronomy Guidance
  cultivar: Cultivar;
  aiInsights: {
    title: string;
    tone: 'positive' | 'warning' | 'info';
    detail: string;
  }[];
};

export function calculateAgronomyPlan(input: CalculationInput): FullAgronomyCalculation {
  const cultivar = CULTIVARS.find((c) => c.id === input.cultivarId) ?? CULTIVARS[0];
  const spacing = SPACING_PRESETS.find((s) => s.id === input.spacingId) ?? SPACING_PRESETS[0];
  const system = PLANTING_SYSTEMS.find((p) => p.id === input.systemId) ?? PLANTING_SYSTEMS[0];
  const season = SEASONS.find((s) => s.id === input.seasonId) ?? SEASONS[0];
  const soil = SOIL_TYPES.find((st) => st.id === input.soilId) ?? SOIL_TYPES[0];

  // 1. Area & spacing
  const totalSqm = input.rai * SQM_PER_RAI + input.ngan * SQM_PER_NGAN + input.wa * SQM_PER_WA;
  const usableSqm = totalSqm * system.usableFraction;

  const plantDist = input.customPlantDist && input.customPlantDist > 0 ? input.customPlantDist : spacing.plantDist;
  const rowDist = input.customRowDist && input.customRowDist > 0 ? input.customRowDist : spacing.rowDist;
  const plantSpacingArea = Math.max(0.5, plantDist * rowDist);

  const rawPlants = Math.max(1, Math.round(usableSqm / plantSpacingArea));
  const seedlingReserve = Math.round(rawPlants * 0.045);
  const totalSeedlings = rawPlants + seedlingReserve;
  const raiEquivalent = Math.max(0.01, totalSqm / SQM_PER_RAI);
  const plantsPerRai = Math.round(rawPlants / raiEquivalent);

  // Density Score: 1,150-1,350 is ideal (score 85-98)
  let densityScore = 80;
  let densityStatus: 'เบาบาง' | 'พอเหมาะ (แนะนำ)' | 'หนาแน่นมาก' = 'พอเหมาะ (แนะนำ)';
  if (plantsPerRai < 950) {
    densityScore = Math.max(45, Math.round((plantsPerRai / 950) * 75));
    densityStatus = 'เบาบาง';
  } else if (plantsPerRai > 1550) {
    densityScore = Math.max(50, Math.round(100 - (plantsPerRai - 1550) * 0.04));
    densityStatus = 'หนาแน่นมาก';
  } else {
    densityScore = Math.min(98, 88 + Math.round(Math.abs(plantsPerRai - 1250) * -0.02));
  }

  // 2. Physical Layout
  // Assuming rectangular block: width approx sqrt(totalSqm)
  const approxWidth = Math.sqrt(totalSqm);
  const rowsCount = Math.max(1, Math.round(approxWidth / rowDist));
  const avgRowLengthMeters = Math.round((totalSqm * system.usableFraction) / (rowsCount * rowDist));
  const plantsPerRow = Math.max(1, Math.round(avgRowLengthMeters / plantDist));
  const dripLineMeters = Math.round(rowsCount * avgRowLengthMeters * 1.08); // +8% for connections
  const mulchRollsNeeded = Math.ceil(dripLineMeters / 400);

  // 3. Yield Projections
  // Extract weight from cultivar string (e.g., "4.5 – 6.5 กก.")
  const [wLow, wHigh] = cultivar.weight
    .replace(/[^\d.–\-]/g, '')
    .split(/[–\-]/)
    .map(Number);
  const fruitWeightLow = (wLow || 4.0) * season.yieldFactor;
  const fruitWeightHigh = (wHigh || 5.5) * season.yieldFactor;
  const avgFruitWeightKg = Number(((fruitWeightLow + fruitWeightHigh) / 2).toFixed(2));

  // Fruit set rate: 94% on drip mulch, 88% on bare ground, 97% on greenhouse
  const fruitSetRate = system.id === 'greenhouse' ? 0.97 : system.id === 'bare_ground' ? 0.88 : 0.94;
  const effectiveFruitingPlants = rawPlants * fruitSetRate;

  const tonnesLow = Number(((effectiveFruitingPlants * fruitWeightLow) / 1000).toFixed(2));
  const tonnesHigh = Number(((effectiveFruitingPlants * fruitWeightHigh) / 1000).toFixed(2));
  const avgTonnes = (tonnesLow + tonnesHigh) / 2;

  // Grade A (82% in greenhouse, 75% in mulch, 65% bare)
  const gradeARatio = system.id === 'greenhouse' ? 0.85 : system.id === 'bare_ground' ? 0.65 : 0.78;
  const gradeAYieldTonnes = Number((avgTonnes * gradeARatio).toFixed(2));
  const gradeBYieldTonnes = Number((avgTonnes * (1 - gradeARatio)).toFixed(2));

  // Brix projection
  const expectedBrixLow = Number((cultivar.brix[0] + season.brixBonus).toFixed(1));
  const expectedBrixHigh = Number((cultivar.brix[1] + season.brixBonus).toFixed(1));

  // Yield Potential Score: 0-100
  const yieldScore = Math.min(99, Math.round(75 + (season.yieldFactor - 1) * 60 + (gradeARatio - 0.7) * 40));

  // 4. Water Requirements
  // Average watermelon needs 3.0 L/plant/day, scaled by soil factor and season
  const seasonWaterFactor = season.id === 'summer' ? 1.25 : season.id === 'rainy' ? 0.75 : 1.0;
  const litersPerPlantPerDay = 3.0 * soil.waterFactor * seasonWaterFactor;
  const dailyWaterCubicMeters = Number(((rawPlants * litersPerPlantPerDay) / 1000).toFixed(1));
  // Season duration ~ cultivar.days
  const totalWaterCubicMeters = Math.round(dailyWaterCubicMeters * (cultivar.days - 7)); // minus 7 days dry before harvest
  const waterCyclesPerDay = season.id === 'summer' ? 2 : 1;
  const cycleDurationMinutes = season.id === 'summer' ? 45 : 60;

  // 5. Fertilizer & Nutrition Program
  // Scaled by Rai
  const totalManureKg = Math.round(120 * raiEquivalent);
  const totalBaseFertilizerKg = Math.round(25 * raiEquivalent);
  const totalGrowthFertilizerKg = Math.round(20 * raiEquivalent);
  const totalFlowerFertilizerKg = Math.round(12 * raiEquivalent);
  const totalSweetnessFertilizerKg = Math.round(25 * raiEquivalent);

  const stageFertilizers = [
    {
      stage: 1,
      title: 'เตรียมแปลง & รองพื้น',
      formula: 'ปุ๋ยคอก/หมัก + สูตร 15-15-15',
      kgTotal: totalManureKg + totalBaseFertilizerKg,
      kgPerRai: 145,
      timing: 'ใส่ก้นหลุมก่อนปลูก 3–5 วัน',
    },
    {
      stage: 2,
      title: 'เร่งเถา & ราก (11–25 วัน)',
      formula: 'สูตร 25-7-7 (หรือ 46-0-0)',
      kgTotal: totalGrowthFertilizerKg,
      kgPerRai: 20,
      timing: 'ใส่ทางระบบน้ำหยด ทุก 5 วัน',
    },
    {
      stage: 3,
      title: 'ออกดอก & ผสมเกสร (26–38 วัน)',
      formula: 'สูตร 15-0-0 + แคลเซียมโบรอน',
      kgTotal: totalFlowerFertilizerKg,
      kgPerRai: 12,
      timing: 'ผสมเกสรเช้าตรู่ งดพ่นสารเคมีช่วงดอกบาน',
    },
    {
      stage: 4,
      title: 'ขยายผล & เพิ่มความหวาน (39–55 วัน)',
      formula: 'สูตร 13-13-21 หรือ 0-0-60',
      kgTotal: totalSweetnessFertilizerKg,
      kgPerRai: 25,
      timing: 'แบ่งใส่ 2 ครั้ง ห่างกัน 7 วัน',
    },
    {
      stage: 5,
      title: 'ก่อนเก็บเกี่ยว (56 วันขึ้นไป)',
      formula: 'งดปุ๋ยเคมีทุกชนิด & งดน้ำ 5–7 วัน',
      kgTotal: 0,
      kgPerRai: 0,
      timing: 'เพื่อให้เนื้อแน่นหวานเข้มข้น ไร้สารตกค้าง',
    },
  ];

  // 6. Financial Simulation
  // Market price estimation
  let marketPriceKg = input.targetFruitPrice && input.targetFruitPrice > 0 ? input.targetFruitPrice : 22;
  if (!input.targetFruitPrice) {
    const marketMatch = cultivar.market.match(/(\d+)\s*–\s*(\d+)/);
    if (marketMatch) {
      marketPriceKg = (Number(marketMatch[1]) + Number(marketMatch[2])) / 2;
    }
  }

  const seedCost = Math.round(totalSeedlings * 8.75);
  const mulchAndDripCost = Math.round(
    (mulchRollsNeeded * 1250 + (dripLineMeters / 1000) * 850) * system.costPerRaiMultiplier,
  );
  const fertilizerCost = Math.round(
    (totalManureKg * 4 +
      totalBaseFertilizerKg * 34 +
      totalGrowthFertilizerKg * 38 +
      totalFlowerFertilizerKg * 42 +
      totalSweetnessFertilizerKg * 46) *
      1.15,
  );
  const laborAndPrepCost = Math.round(raiEquivalent * 3200 * (system.id === 'greenhouse' ? 2.0 : 1.0));

  const totalCost = seedCost + mulchAndDripCost + fertilizerCost + laborAndPrepCost;
  const costPerRai = Math.round(totalCost / raiEquivalent);
  const costPerPlant = Number((totalCost / rawPlants).toFixed(2));

  // Revenue calculation
  const grossRevenueLow = Math.round(tonnesLow * 1000 * (marketPriceKg * 0.9));
  const grossRevenueHigh = Math.round(tonnesHigh * 1000 * (marketPriceKg * 1.1));

  const netProfitLow = grossRevenueLow - totalCost;
  const netProfitHigh = grossRevenueHigh - totalCost;

  const roiLow = totalCost > 0 ? Math.round((netProfitLow / totalCost) * 100) : 0;
  const roiHigh = totalCost > 0 ? Math.round((netProfitHigh / totalCost) * 100) : 0;

  // 7. AI Agronomy Guidance Insights
  const aiInsights = [
    {
      title: `ความเหมาะสมของสายพันธุ์ ${cultivar.name}`,
      tone: 'positive' as const,
      detail: `สายพันธุ์ ${cultivar.name} (${cultivar.code}) มีจุดเด่น: ${cultivar.strengths.join(
        ' • ',
      )} ด้วยความหวานเป้าหมาย ${cultivar.brix[0]}–${cultivar.brix[1]}° Brix`,
    },
    {
      title: `คำแนะนำตามฤดูกาล: ${season.label}`,
      tone: season.id === 'rainy' ? ('warning' as const) : ('info' as const),
      detail: season.diseaseRisk,
    },
    {
      title: `การจัดการดินและน้ำ (${soil.label})`,
      tone: soil.id === 'clay' ? ('warning' as const) : ('positive' as const),
      detail:
        soil.id === 'clay'
          ? 'ดินเหนียวมีความเสี่ยงรากเน่าสูงกว่าปกติ ควรยกร่องแปลงให้สูงอย่างน้อย 35 ซม. และควบคุมรอบน้ำหยดไม่ให้แฉะขัง'
          : `การระบายน้ำอยู่ในเกณฑ์ดีเยี่ยม ต้องการน้ำเฉลี่ย ${dailyWaterCubicMeters} ลบ.ม./วัน ช่วยให้รากหาอาหารได้เต็มประสิทธิภาพ`,
    },
    {
      title: 'ข้อควรระวังเรื่องระยะปลอดภัยก่อนเก็บเกี่ยว (PHI)',
      tone: 'warning' as const,
      detail:
        'ในระยะขยายผล (39–55 วัน) หากจำเป็นต้องพ่นสารเคมีป้องกันโรครา ต้องตรวจสอบระยะหยุดพ่นก่อนเก็บเกี่ยว (PHI) อย่างน้อย 7–14 วัน เพื่อความปลอดภัยของผู้บริโภค',
    },
  ];

  return {
    totalSqm,
    usableSqm,
    plantSpacingArea,
    plants: rawPlants,
    seedlingReserve,
    totalSeedlings,
    plantsPerRai,
    densityScore,
    densityStatus,

    rowsCount,
    avgRowLengthMeters,
    plantsPerRow,
    dripLineMeters,
    mulchRollsNeeded,

    avgFruitWeightKg,
    fruitSetRate,
    tonnesLow,
    tonnesHigh,
    gradeAYieldTonnes,
    gradeBYieldTonnes,
    expectedBrixLow,
    expectedBrixHigh,
    yieldScore,

    dailyWaterCubicMeters,
    totalWaterCubicMeters,
    waterCyclesPerDay,
    cycleDurationMinutes,

    totalManureKg,
    totalBaseFertilizerKg,
    totalGrowthFertilizerKg,
    totalFlowerFertilizerKg,
    totalSweetnessFertilizerKg,
    stageFertilizers,

    seedCost,
    mulchAndDripCost,
    fertilizerCost,
    laborAndPrepCost,
    totalCost,
    costPerRai,
    costPerPlant,
    grossRevenueLow,
    grossRevenueHigh,
    netProfitLow,
    netProfitHigh,
    roiLow,
    roiHigh,
    avgPricePerKg: marketPriceKg,

    cultivar,
    aiInsights,
  };
}

/** 10-Week Full Season Lifecycle Blueprint */
export type WeekLifecycle = {
  week: number;
  days: string;
  stageName: string;
  focusTitle: string;
  checklist: string[];
  waterAdvice: string;
  fertilizerPlan: string;
  riskAlert: string;
  critical?: boolean;
};

export function generate10WeekPlan(cultivar: Cultivar, plants: number): WeekLifecycle[] {
  return [
    {
      week: 1,
      days: 'วันที่ 1 – 7',
      stageName: 'ระยะเพาะกล้า & เตรียมแปลง',
      focusTitle: 'เตรียมดิน ยกร่อง และเพาะเมล็ดในถาดหลุม',
      checklist: [
        'ไถดะตากดิน 7–10 วันเพื่อฆ่าเชื้อโรคในดินและตัวอ่อนแมลง',
        'ยกร่องแปลงสูง 25–30 ซม. กว้าง 1.0–1.2 ม. ใส่ปุ๋ยคอกรองก้นหลุม',
        'แช่เมล็ดพันธุ์น้ำอุ่น 45°C นาน 30 นาที แล้วบ่มในผ้าชื้น 24 ชม.',
        `หยอดเมล็ดลงถาดเพาะ 104 หลุม (เตรียมกล้ารวมเผื่อซ่อม ${Math.round(plants * 1.045).toLocaleString('th-TH')} ต้น)`,
      ],
      waterAdvice: 'รดน้ำถาดเพาะวันละ 2 ครั้ง เช้า–เย็น อย่าให้แฉะจนรากเน่า',
      fertilizerPlan: 'ปุ๋ยอินทรีย์/ปุ๋ยคอก 100–120 กก./ไร่ คลุกเคล้าดินยกร่อง',
      riskAlert: 'ระวังมด แมลงสาบ และหนูกัดกินเมล็ดในโรงเพาะ',
    },
    {
      week: 2,
      days: 'วันที่ 8 – 14',
      stageName: 'ระยะย้ายกล้าลงแปลง',
      focusTitle: 'ย้ายต้นกล้าแข็งแรงลงแปลงปลูกจริงและติดตั้งระบบน้ำ',
      checklist: [
        'ย้ายกล้าเมื่อมีใบจริง 2–3 ใบ (อายุกล้า 10–12 วัน)',
        'คลุมพลาสติกดำ–เงิน และเจาะหลุมตามระยะที่เลือก',
        'ติดตั้งสายน้ำหยดและทดสอบแรงดันน้ำทุกลำแถว',
        'รดสารชีวภัณฑ์ไตรโคเดอร์มาโคนต้น ป้องกันโรครากเน่าโคนเน่า',
      ],
      waterAdvice: 'เปิดระบบน้ำหยดทันทีหลังย้ายกล้า 1.0–1.5 ลิตร/ต้น',
      fertilizerPlan: 'ปุ๋ยสูตร 15-15-15 อัตรา 5 กรัม/หลุม ห่างโคนต้น 10 ซม.',
      riskAlert: 'กล้าชะงักจากการโดนแดดแรง ควรย้ายช่วงบ่ายแก่ 15:30 น. เป็นต้นไป',
    },
    {
      week: 3,
      days: 'วันที่ 15 – 21',
      stageName: 'ระยะทอดยอด & จัดเถา',
      focusTitle: 'จัดระเบียบเถาเลื้อยทิศทางเดียวและปลิดแขนงข้าง',
      checklist: [
        'ตรวจนับยอดหลักเมื่อเถายาวประมาณ 30–40 ซม.',
        'ปลิดแขนงข้างที่แตกจากข้อที่ 1–5 ทิ้งทั้งหมด',
        'คัดเลือกเถาหลักที่สมบูรณ์ไว้ 2 เถาต่อต้นเพื่อเป็นเถาให้ผล',
        'จัดเถาให้เลื้อยไปในทิศทางเดียวกันไม่ให้ทับซ้อนกัน',
      ],
      waterAdvice: 'ให้น้ำวันเว้นวัน ช่วงเช้า 2.0–2.5 ลิตร/ต้น',
      fertilizerPlan: 'ให้ปุ๋ยสูตร 25-7-7 ละลายน้ำหยดเพื่อเร่งการทอดยอดและขยายใบ',
      riskAlert: 'เฝ้าระวังเพลี้ยไฟและหนอนชอนใบทำลายยอดอ่อน',
    },
    {
      week: 4,
      days: 'วันที่ 22 – 28',
      stageName: 'ระยะดอกบาน & ผสมเกสร',
      focusTitle: 'ผสมเกสรด้วยมือช่วงเช้าตรู่เพื่อชี้ขาดผลผลิต',
      checklist: [
        'ตรวจนับดอกตัวเมียที่ข้อที่ 15–20 ซึ่งเป็นตำแหน่งผลเกรด A',
        'ผสมเกสรด้วยมือช่วงเวลา 06:00 – 09:30 น. ก่อนแดดจัด',
        'แตะเกสรตัวผู้ลงบนยอดเกสรตัวเมียให้ทั่วเพื่อไม่ให้ผลเบี้ยว',
        'ทำเครื่องหมายระบุวันที่ผสมเกสรเพื่อคำนวณวันตัดได้อย่างแม่นยำ',
      ],
      waterAdvice: 'ลดปริมาณน้ำลงเล็กน้อยเพื่อไม่ให้เถาบ้าใบและดอกร่วง',
      fertilizerPlan: 'เสริมแคลเซียมโบรอนทางใบ ช่วยให้เกสรแข็งแรงติดผลดี',
      riskAlert: '⚠️ ห้ามพ่นสารเคมีกำจัดแมลงทุกชนิดช่วงดอกบาน เพราะจะทำลายเกสรและผึ้งช่วยผสม',
      critical: true,
    },
    {
      week: 5,
      days: 'วันที่ 29 – 35',
      stageName: 'ระยะคัดผลเดี่ยว (Fruit Selection)',
      focusTitle: 'คัดเลือกผลที่สมบูรณ์ที่สุด 1 ผลต่อต้น',
      checklist: [
        'เมื่อผลขนาดเท่าไข่ไก่ ตรวจดูลักษณะทรงผล',
        'ปลิดผลที่มีตำหนิ ผลบิดเบี้ยว หรือติดที่ข้อต่ำกว่า 12 ทิ้ง',
        'คงเหลือผลเกรด A เพียง 1 ผลต่อต้น เพื่อให้ธาตุอาหารส่งเต็มที่',
        'รองผลด้วยฟางแห้งหรือจานรองโฟมเพื่อไม่ให้ผลสัมผัสดินชื้น',
      ],
      waterAdvice: 'เพิ่มการให้น้ำเป็น 3.0–3.5 ลิตร/ต้น/วัน อย่างสม่ำเสมอ',
      fertilizerPlan: 'ให้ปุ๋ยสูตร 15-0-0 สลับกับ 15-15-15 เร่งการขยายเซลล์ผล',
      riskAlert: 'ระวังโรคแอนแทรคโนสลงผลอ่อนและหนอนเจาะผลแตงโม',
    },
    {
      week: 6,
      days: 'วันที่ 36 – 42',
      stageName: 'ระยะขยายขนาดผล (Bulking Phase)',
      focusTitle: 'เร่งการเจริญเติบโตของเนื้อผลและน้ำหนัก',
      checklist: [
        'ผลแตงโมจะขยายขนาดอย่างรวดเร็ว (น้ำหนักเพิ่ม 1 กก./สัปดาห์)',
        'คลุมฟางข้าวหรือตาข่ายพรางแสงบนผิวผลป้องกันแดดเผา (Sunburn)',
        'ตรวจดูรอยต่อขั้วผลและมือเกาะ',
        'เด็ดยอดปลายเถาที่ยาวเกินไปเพื่อหยุดการเติบโตทางยอด',
      ],
      waterAdvice: 'ระยะต้องการน้ำสูงสุด 4.0–4.5 ลิตร/ต้น/วัน ให้น้ำสม่ำเสมอห้ามขาดน้ำ',
      fertilizerPlan: 'เปลี่ยนเป็นสูตร 13-13-21 เพื่อเริ่มการสะสมแป้งในเนื้อผล',
      riskAlert: 'หากขาดน้ำแล้วให้น้ำกระชากในทันที ผลจะแตกไส้ล้มเสียหายได้',
    },
    {
      week: 7,
      days: 'วันที่ 43 – 49',
      stageName: 'ระยะพลิกผล & ปรับสีผิว',
      focusTitle: 'พลิกผลให้โดนแดดรอบทิศเพื่อสีผิวสวยสม่ำเสมอ',
      checklist: [
        'พลิกผลแตงโมเบาๆ 90 องศา สัปดาห์ละ 1 ครั้ง ช่วงแดดอ่อน',
        'ระวังอย่าให้ขั้วผลบิดหรือหักขณะทำการพลิก',
        'เปลี่ยนวัสดุรองก้นผลให้แห้งสะอาด ป้องกันรอยด่างและเชื้อรา',
        'ตรวจเช็กการเข้าทำลายของแมลงวันทองผลไม้',
      ],
      waterAdvice: 'ให้น้ำวันละ 3.5 ลิตร/ต้น ช่วงเช้าตรู่',
      fertilizerPlan: 'เสริมโพแทสเซียมซัลเฟต (0-0-50 หรือ 0-0-60) ทางระบบน้ำ',
      riskAlert: 'ระวังหนูกัดเจาะผลสุก และนกจิกทำลายผิวผล',
    },
    {
      week: 8,
      days: 'วันที่ 50 – 56',
      stageName: 'ระยะสะสมน้ำตาล (Sugar Accumulation)',
      focusTitle: 'เปลี่ยนแป้งเป็นน้ำตาลซูโครสและฟรุกโตสในเนื้อผล',
      checklist: [
        'สังเกตมือเกาะที่ข้อติดผลเริ่มเปลี่ยนจากสีเขียวเป็นสีเหลืองน้ำตาล',
        'สังเกตขนบนขั้วผลเริ่มหลุดร่วง ผิวผลเริ่มขึ้นนวลมันวาว',
        'สุ่มเคาะทดสอบเสียงผลแตงโม (เริ่มมีเสียงกังวานทึบแน่น)',
        'ตรวจสอบระยะปลอดภัยของสารเคมี (PHI) ต้องพ้นระยะปลอดภัยทั้งหมดแล้ว',
      ],
      waterAdvice: 'เริ่มลดปริมาณน้ำลง 30% เหลือ 2.0 ลิตร/ต้น/วัน',
      fertilizerPlan: 'ให้ปุ๋ยโพแทสเซียมรอบสุดท้าย และหยุดการให้ปุ๋ยไนโตรเจนเด็ดขาด',
      riskAlert: '⚠️ หยุดการพ่นสารเคมีสังเคราะห์ทุกชนิด เพื่อความปลอดภัยของผู้บริโภค',
    },
    {
      week: 9,
      days: 'วันที่ 57 – 63',
      stageName: 'ระยะงดน้ำก่อนเก็บเกี่ยว (Pre-Harvest Dry)',
      focusTitle: 'งดน้ำ 5–7 วันเพื่อบีบความหวานและป้องกันไส้แตก',
      checklist: [
        'งดการให้น้ำเด็ดขาด 5–7 วันก่อนกำหนดวันเก็บเกี่ยว',
        'สุ่มเก็บผลตัวอย่าง 1–2 ผล นำมาตรวจวัดค่าความหวาน Brix (เป้าหมาย > 11.5°)',
        'ใช้เครื่องมือเคาะฟังเสียง AI Acoustic เพื่อประเมินความสุกระดับ 85–90%',
        'ตรวจสอบจุดแต้มดิน (Ground spot) ต้องเปลี่ยนเป็นสีเหลืองครีมเข้ม',
      ],
      waterAdvice: '🚫 งดน้ำโดยเด็ดขาด การงดน้ำจะทำให้น้ำตาลเข้มข้น เนื้อกรอบ และเก็บได้นาน',
      fertilizerPlan: '🚫 งดปุ๋ยทุกชนิด',
      riskAlert: 'หากมีฝนตกหนักก่อนตัด ต้องเลื่อนการตัดออกไป 2–3 วันเพื่อไล่น้ำในผล',
      critical: true,
    },
    {
      week: 10,
      days: 'วันที่ 64 – 70',
      stageName: 'ระยะเก็บเกี่ยว & คัดเกรด (Harvest & Logistics)',
      focusTitle: 'เก็บเกี่ยวผลผลิตช่วงเช้าตรู่ ตัดขั้วรูปตัว T',
      checklist: [
        'เริ่มตัดผลผลิตเวลา 06:00 – 10:00 น. ขณะที่ผลยังไม่สะสมความร้อนจากแดด',
        'ใช้กรรไกรคมตัดขั้วผลให้เหลือกิ่งเป็นรูปตัว T ยาวประมาณ 3–5 ซม.',
        'ลำเลียงวางในที่ร่ม ห้ามโยนหรือวางกระแทกเด็ดขาด',
        'คัดแยกเกรด A, B ตามน้ำหนักและความสมบูรณ์ ชั่งน้ำหนัก และบรรจุขึ้นรถขนส่ง',
      ],
      waterAdvice: 'งดน้ำ',
      fertilizerPlan: 'เตรียมเก็บกวาดแปลงและไถกลบซากพืชเพื่อเตรียมรอบใหม่',
      riskAlert: 'ห้ามวางผลแตงโมตากแดดจัดหลังตัด เพราะจะทำให้เนื้อแตงโมร้อนและเน่าเสียง่าย',
    },
  ];
}
