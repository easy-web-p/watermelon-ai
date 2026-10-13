import crypto from 'node:crypto';

const FIREBASE_CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export class InvalidFirebaseTokenError extends Error {}
export class FirebaseKeysUnavailableError extends Error {}

type FirebaseClaims = {
  aud?: unknown;
  iss?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  auth_time?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
  firebase?: { sign_in_provider?: unknown };
};

export function validatedGoogleClaims(claims: FirebaseClaims, projectId: string, now = Math.floor(Date.now() / 1000)) {
  if (
    !claims || typeof claims !== 'object' ||
    claims.aud !== projectId ||
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 ||
    typeof claims.exp !== 'number' || claims.exp <= now ||
    typeof claims.iat !== 'number' || claims.iat > now ||
    typeof claims.auth_time !== 'number' || claims.auth_time > now ||
    claims.firebase?.sign_in_provider !== 'google.com' ||
    claims.email_verified !== true ||
    typeof claims.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)
  ) {
    throw new InvalidFirebaseTokenError('Google ไม่ได้ยืนยันบัญชีนี้');
  }
  return {
    uid: claims.sub,
    email: claims.email.trim().toLowerCase(),
    name: typeof claims.name === 'string' ? claims.name.slice(0, 120) : '',
    avatar: typeof claims.picture === 'string' ? claims.picture.slice(0, 500) : '',
  };
}

let cachedCertificates: Record<string, string> = {};
let certificateExpiry = 0;

async function certificates() {
  if (certificateExpiry > Date.now() && Object.keys(cachedCertificates).length) return cachedCertificates;
  let response: Response;
  try {
    response = await fetch(FIREBASE_CERT_URL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Certificate response ${response.status}`);
    const body = await response.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length ||
      Object.values(body).some((value) => typeof value !== 'string')) throw new Error('Invalid certificates');
    cachedCertificates = body as Record<string, string>;
    const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] ?? 300);
    certificateExpiry = Date.now() + Math.min(Math.max(maxAge, 60), 3600) * 1000;
    return cachedCertificates;
  } catch {
    throw new FirebaseKeysUnavailableError('ตรวจสอบ Google ไม่ได้ในขณะนี้ กรุณาลองอีกครั้ง');
  }
}

/** Firebase ID tokens are RS256 JWTs. Never trust the email sent separately by a browser. */
export async function verifyFirebaseGoogleIdToken(idToken: unknown, projectId: string) {
  if (typeof idToken !== 'string' || idToken.length > 16384) throw new InvalidFirebaseTokenError('ไม่พบหลักฐานยืนยัน Google');
  const parts = idToken.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) throw new InvalidFirebaseTokenError('รูปแบบหลักฐาน Google ไม่ถูกต้อง');
  let header: { alg?: unknown; kid?: unknown };
  let claims: FirebaseClaims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new InvalidFirebaseTokenError('รูปแบบหลักฐาน Google ไม่ถูกต้อง');
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new InvalidFirebaseTokenError('ลายเซ็น Google ไม่ถูกต้อง');
  }
  // Reject structurally invalid claims before fetching keys, but do not use
  // the returned identity until the signature has been verified below.
  const identity = validatedGoogleClaims(claims, projectId);
  const publicCertificate = (await certificates())[header.kid];
  let validSignature = false;
  try {
    validSignature = Boolean(publicCertificate) && crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicCertificate, Buffer.from(parts[2], 'base64url'));
  } catch {
    validSignature = false;
  }
  if (!validSignature) {
    throw new InvalidFirebaseTokenError('ลายเซ็น Google ไม่ถูกต้อง');
  }
  return identity;
}
