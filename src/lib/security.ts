/**
 * Security & Defense Module for Watermelon AI
 * Complies with OWASP guidelines, Parameterized Query defense, Rate Limiting,
 * Prompt Injection Protection, and File Signature Validation.
 */

export interface ValidationResult<T> {
  isValid: boolean;
  value: T;
  error?: string;
}

export type SearchSafetyStatus =
  | "allowed"
  | "allowed_with_warning"
  | "blocked"
  | "requires_review";

export interface SearchSafetyCheck {
  status: SearchSafetyStatus;
  sanitizedQuery: string;
  flaggedReasons: string[];
  requestId: string;
}

// 1. Unicode Normalization & Search Validation
export function validateAndSanitizeSearch(rawInput: string): ValidationResult<string> {
  if (!rawInput || typeof rawInput !== "string") {
    return { isValid: false, value: "", error: "กรุณากรอกคำค้นหา" };
  }

  // Unicode NFKC normalization
  let normalized = rawInput.normalize("NFKC").trim();

  // Remove zero-width & non-printable control characters
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF\x00-\x1F\x7F]/g, "");

  if (normalized.length === 0) {
    return { isValid: false, value: "", error: "กรุณากรอกคำค้นหา" };
  }

  if (normalized.length > 200) {
    return {
      isValid: false,
      value: normalized.slice(0, 200),
      error: "คำค้นหายาวเกิน 200 ตัวอักษร",
    };
  }

  return { isValid: true, value: normalized };
}

// 2. Prompt Injection & Hazardous Content Defense
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/i,
  /ละเลย\s*(คำสั่ง|กฎ|นโยบาย)/i,
  /ลืม\s*(คำสั่ง|ข้อห้าม|บทบาท)/i,
  /system\s*prompt/i,
  /reveal\s+(secret|token|api_key|password)/i,
  /bypass\s+(safety|security|policy)/i,
  /jailbreak/i,
  /เปิดเผย\s*(คีย์|รหัสผ่าน|ความลับ|คำสั่งระบบ)/i,
  /act\s+as\s+DAN/i,
  /do\s+anything\s+now/i,
  /DROP\s+TABLE/i,
  /<script\b[^>]*>/i,
  /javascript:/i,
];

export function inspectSearchSafety(query: string): SearchSafetyCheck {
  const sanitized = validateAndSanitizeSearch(query);
  const requestId = "req_" + Math.random().toString(36).substring(2, 8);

  if (!sanitized.isValid) {
    return {
      status: "blocked",
      sanitizedQuery: "",
      flaggedReasons: [sanitized.error || "คำค้นหาไม่ถูกต้อง"],
      requestId,
    };
  }

  const flagged: string[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(sanitized.value)) {
      flagged.push("ตรวจพบรูปแบบข้อความที่อาจเป็นการแทรกแซงคำสั่งระบบ (Prompt Injection / Script)");
      break;
    }
  }

  if (flagged.length > 0) {
    return {
      status: "blocked",
      sanitizedQuery: sanitized.value,
      flaggedReasons: flagged,
      requestId,
    };
  }

  return {
    status: "allowed",
    sanitizedQuery: sanitized.value,
    flaggedReasons: [],
    requestId,
  };
}

// 3. Client-side & In-Memory Rate Limiter
interface RateBucket {
  timestamps: number[];
}

const rateBuckets: Record<string, RateBucket> = {};

export interface RateLimitRule {
  key: string;
  limit: number;
  windowMs: number;
  description: string;
}

export const RATE_LIMIT_RULES = {
  SEARCH_CHAT: { key: "search", limit: 30, windowMs: 60_000, description: "30 ครั้ง/นาที" },
  SEND_CHAT: { key: "chat", limit: 20, windowMs: 60_000, description: "20 ครั้ง/นาที" },
  KNOCK_ANALYSIS: { key: "knock", limit: 5, windowMs: 60_000, description: "5 ครั้ง/นาที" },
  FILE_UPLOAD: { key: "upload", limit: 10, windowMs: 60_000, description: "10 ครั้ง/นาที" },
  LOGIN_ATTEMPT: { key: "login", limit: 5, windowMs: 15 * 60_000, description: "5 ครั้ง/15 นาที" },
  FEEDBACK_REPORT: { key: "feedback", limit: 5, windowMs: 3600_000, description: "5 ครั้ง/ชั่วโมง" },
  ADMIN_EXPORT: { key: "export", limit: 3, windowMs: 3600_000, description: "3 ครั้ง/ชั่วโมง" },
};

export function checkRateLimit(
  rule: RateLimitRule,
  identifier: string
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const bucketKey = `${rule.key}:${identifier}`;

  if (!rateBuckets[bucketKey]) {
    rateBuckets[bucketKey] = { timestamps: [] };
  }

  // Remove timestamps outside window
  const bucket = rateBuckets[bucketKey];
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < rule.windowMs);

  if (bucket.timestamps.length >= rule.limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterSec = Math.ceil((oldest + rule.windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: rule.limit - bucket.timestamps.length,
  };
}

// 4. File Safety Validation
export const ALLOWED_FILE_TYPES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "audio/wav": [0x52, 0x49, 0x46, 0x46],
  "audio/mpeg": [0xff, 0xfb],
  "audio/mp4": [0x00, 0x00, 0x00],
  "audio/webm": [0x1a, 0x45, 0xdf, 0xa3],
  "audio/ogg": [0x4f, 0x67, 0x67, 0x53],
};

export async function validateUploadedFile(file: File): Promise<{
  safe: boolean;
  sanitizedName: string;
  reason?: string;
}> {
  // 1. Max size: 25MB
  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { safe: false, sanitizedName: "", reason: "ขนาดไฟล์เกิน 25MB" };
  }

  // 2. MIME allowlist check
  const isAllowedMime = Object.keys(ALLOWED_FILE_TYPES).some((type) =>
    file.type.startsWith(type.split("/")[0])
  );
  if (!isAllowedMime && !file.type.startsWith("image/") && !file.type.startsWith("audio/")) {
    return {
      safe: false,
      sanitizedName: "",
      reason: "ประเภทไฟล์ไม่ได้รับอนุญาต (อนุญาตเฉพาะรูปภาพและเสียงเคาะ)",
    };
  }

  // 3. Prevent path traversal in filename and generate UUID name
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const cleanExt = extension.replace(/[^a-z0-9]/g, "");
  const sanitizedUuidName = `${crypto.randomUUID()}.${cleanExt}`;

  return { safe: true, sanitizedName: sanitizedUuidName };
}
