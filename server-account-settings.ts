/** Validation shared by the account handlers and their tests. */

export const CONSENT_KEYS = [
  'analytics',
  'improveModel',
  'marketing',
  'shareAnonymised',
  'locationAlerts',
] as const;

export type ConsentKey = (typeof CONSENT_KEYS)[number];
export type ConsentSettings = Record<ConsentKey, boolean>;

export const EMPTY_CONSENT: ConsentSettings = {
  analytics: false,
  improveModel: false,
  marketing: false,
  shareAnonymised: false,
  locationAlerts: false,
};

export function consentForAccount(value: unknown): ConsentSettings {
  const stored = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return Object.fromEntries(CONSENT_KEYS.map((key) => [key, stored[key] === true])) as ConsentSettings;
}

export function validateConsentPatch(value: unknown):
  | { ok: true; patch: Partial<ConsentSettings> }
  | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'รูปแบบข้อมูลความยินยอมไม่ถูกต้อง' };
  }
  const entries = Object.entries(value);
  if (!entries.length) return { ok: false, error: 'กรุณาระบุค่าความยินยอมที่ต้องการเปลี่ยน' };
  const patch: Partial<ConsentSettings> = {};
  for (const [key, entry] of entries) {
    if (!CONSENT_KEYS.includes(key as ConsentKey) || typeof entry !== 'boolean') {
      return { ok: false, error: `ค่าความยินยอม ${key} ไม่ถูกต้อง` };
    }
    patch[key as ConsentKey] = entry;
  }
  return { ok: true, patch };
}

const PROFILE_LIMITS = {
  name: 120,
  organization: 120,
  province: 80,
  plotSize: 24,
} as const;

export type ProfilePatch = Partial<Record<keyof typeof PROFILE_LIMITS, string>>;

export function validateProfilePatch(value: unknown):
  | { ok: true; patch: ProfilePatch }
  | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'รูปแบบข้อมูลโปรไฟล์ไม่ถูกต้อง' };
  }
  const entries = Object.entries(value);
  if (!entries.length) return { ok: false, error: 'กรุณาระบุข้อมูลที่ต้องการเปลี่ยน' };
  const patch: ProfilePatch = {};
  for (const [key, entry] of entries) {
    if (!(key in PROFILE_LIMITS)) {
      return { ok: false, error: `ไม่สามารถแก้ข้อมูล ${key} ผ่านหน้านี้ได้` };
    }
    if (typeof entry !== 'string') return { ok: false, error: `${key} ต้องเป็นข้อความ` };
    const clean = entry.trim();
    const limit = PROFILE_LIMITS[key as keyof typeof PROFILE_LIMITS];
    if (clean.length > limit) return { ok: false, error: `${key} ยาวเกิน ${limit} ตัวอักษร` };
    if (key === 'name' && !clean) return { ok: false, error: 'กรุณาระบุชื่อที่ใช้แสดงในบัญชี' };
    if (key === 'plotSize' && clean && (!/^\d+(?:\.\d{1,2})?$/.test(clean) || Number(clean) <= 0 || Number(clean) > 100000)) {
      return { ok: false, error: 'พื้นที่เพาะปลูกต้องเป็นจำนวนไร่ที่มากกว่า 0 และไม่เกิน 100,000' };
    }
    patch[key as keyof typeof PROFILE_LIMITS] = clean;
  }
  return { ok: true, patch };
}

/** A password change increments the stored version and revokes old JWTs. */
export function sessionMatchesAccount(tokenVersion: unknown, storedVersion: unknown): boolean {
  const token = typeof tokenVersion === 'number' && Number.isSafeInteger(tokenVersion) && tokenVersion >= 0 ? tokenVersion : 0;
  const stored = typeof storedVersion === 'number' && Number.isSafeInteger(storedVersion) && storedVersion >= 0 ? storedVersion : 0;
  return token === stored;
}
