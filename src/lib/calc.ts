/** Shared, pure calculations. Kept free of React so they can be unit tested. */

/* ── Passwords ───────────────────────────────────────────────────── */

/** Scores a password on length and character variety; returns 0–100. */
export function scorePassword(value: string): number {
  if (!value) return 0;
  let score = Math.min(value.length / 12, 1) * 45;
  if (/[a-z]/.test(value)) score += 12;
  if (/[A-Z]/.test(value)) score += 14;
  if (/[0-9]/.test(value)) score += 14;
  if (/[^A-Za-z0-9]/.test(value)) score += 15;
  return Math.min(100, Math.round(score));
}

export type PasswordStrength = 'อ่อนเกินไป' | 'พอใช้' | 'ดี' | 'แข็งแรงมาก';

export function passwordStrengthLabel(score: number): PasswordStrength {
  if (score < 35) return 'อ่อนเกินไป';
  if (score < 65) return 'พอใช้';
  if (score < 85) return 'ดี';
  return 'แข็งแรงมาก';
}

/** Minimum score the sign-up and change-password forms accept. */
export const MIN_PASSWORD_SCORE = 35;

/* ── Phone numbers ───────────────────────────────────────────────── */

/** Strips formatting to the bare digits the API expects. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidThaiMobile(value: string): boolean {
  const digits = normalizePhone(value);
  return /^0[689]\d{8}$/.test(digits);
}

/** `0845928190` → `084-XXX-8190`, for echoing a number back without exposing it. */
export function maskPhone(value: string): string {
  const digits = normalizePhone(value);
  if (digits.length < 10) return value;
  return `${digits.slice(0, 3)}-XXX-${digits.slice(-4)}`;
}

/* ── Planting calculator ─────────────────────────────────────────── */

/** Thai land units: 1 rai = 4 ngan = 400 square wa = 1,600 m². */
export const SQM_PER_RAI = 1600;
export const SQM_PER_NGAN = 400;
export const SQM_PER_WA = 4;

/** 0.5 × 2.5 m spacing leaves 1.25 m² per plant. */
const SQM_PER_PLANT = 1.25;
/** Share of the plot lost to paths, headlands and the irrigation main. */
const USABLE_FRACTION = 0.9;
/** Seed, tray and growing medium, per plant. */
const COST_PER_PLANT_THB = 8.75;
/** Farm-gate price band, THB per kg. */
const PRICE_LOW_THB = 15;
const PRICE_HIGH_THB = 18;
/** Share of gross revenue left after all input costs. */
const NET_MARGIN = 0.56;

export type PlantingPlan = {
  sqm: number;
  plants: number;
  tonnesLow: number;
  tonnesHigh: number;
  seedCost: number;
  grossLow: number;
  grossHigh: number;
  netLow: number;
  netHigh: number;
};

/**
 * Estimates plant count, yield and revenue from a plot size in Thai units.
 * `fruitKgLow`/`fruitKgHigh` come from the chosen cultivar's weight range.
 */
export function plantingPlan(
  area: { rai: number; ngan: number; wa: number },
  fruitKgLow = 4.0,
  fruitKgHigh = 5.0,
): PlantingPlan {
  const sqm = area.rai * SQM_PER_RAI + area.ngan * SQM_PER_NGAN + area.wa * SQM_PER_WA;
  const plants = Math.round((sqm / SQM_PER_PLANT) * USABLE_FRACTION);

  const tonnesLow = (plants * fruitKgLow) / 1000;
  const tonnesHigh = (plants * fruitKgHigh) / 1000;

  const grossLow = Math.round(tonnesLow * 1000 * PRICE_LOW_THB);
  const grossHigh = Math.round(tonnesHigh * 1000 * PRICE_HIGH_THB);

  return {
    sqm,
    plants,
    tonnesLow,
    tonnesHigh,
    seedCost: Math.round(plants * COST_PER_PLANT_THB),
    grossLow,
    grossHigh,
    netLow: Math.round(grossLow * NET_MARGIN),
    netHigh: Math.round(grossHigh * NET_MARGIN),
  };
}

/* ── Money and units ─────────────────────────────────────────────── */

export function formatTHB(amount: number): string {
  return `฿${Math.round(amount).toLocaleString('th-TH')}`;
}

/** `194400` → `฿194K`, for tiles where the exact baht does not matter. */
export function formatTHBCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `฿${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `฿${Math.round(amount / 1_000)}K`;
  return formatTHB(amount);
}
