import crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  phone?: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Development-only fallback. A deployment that reaches production without
 * JWT_SECRET set would otherwise sign tokens with a value committed to this
 * repository, which means anyone who can read the source can mint an admin
 * session. `assertSecretsConfigured()` refuses to boot in that case.
 */
const DEV_FALLBACK_SECRET = 'watermelon_ai_dev_only_insecure_secret_do_not_deploy';

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET || process.env.STORAGE_SECRET;
  if (configured) return configured;
  if (isProduction()) {
    throw new Error('JWT_SECRET is not configured — refusing to sign tokens with the development fallback.');
  }
  return DEV_FALLBACK_SECRET;
}

/**
 * Called once at startup so a missing secret is a boot failure with a clear
 * message, not a 500 on the first login attempt.
 */
export function assertSecretsConfigured(): void {
  if (!isProduction()) return;
  const missing: string[] = [];
  if (!process.env.JWT_SECRET && !process.env.STORAGE_SECRET) missing.push('JWT_SECRET');
  if (!process.env.STORAGE_SECRET) missing.push('STORAGE_SECRET');
  if (missing.length) {
    throw new Error(
      `Refusing to start in production without ${[...new Set(missing)].join(' and ')}. ` +
        'Set them to long random values (see .env.example).',
    );
  }
}

export function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64url');
}

export function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  expiresInSeconds = 7 * 24 * 3600,
  secret = getJwtSecret(),
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const fullPayload: JwtPayload = { ...payload, iat, exp };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/** Constant-time compare that tolerates attacker-controlled lengths. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on a length mismatch, so the length is checked
  // first. The length of an HMAC digest is not a secret.
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyJwt(token: string, secret = getJwtSecret()): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  if (!encodedHeader || !encodedPayload || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (!safeEqual(signature, expectedSignature)) {
    return null; // Invalid signature
  }

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader)) as { alg?: unknown };
    // The header is covered by the signature, so this cannot be forged — but a
    // token minted by an older build with a different algorithm must not be
    // accepted silently either.
    if (header.alg !== 'HS256') return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
    if (typeof payload?.sub !== 'string' || !payload.sub) return null;
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null; // Expired
    return payload;
  } catch {
    return null;
  }
}

/* ── Passwords ────────────────────────────────────────────────────────────── */

const SCRYPT_KEYLEN = 64;

/**
 * `scrypt$<salt>$<hash>`. Node ships scrypt, so no native dependency is needed
 * to stop storing credentials in a form that a database leak hands over.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/** False for any malformed or absent stored hash — never throws. */
export function verifyPassword(password: string, stored: string | undefined | null): boolean {
  if (!password || !stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  if (!salt || !hash) return false;
  try {
    const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
    return safeEqual(candidate, hash);
  } catch {
    return false;
  }
}

/** OTP codes are credentials too; they are stored hashed, not in cleartext. */
export function hashOtpCode(code: string, sessionToken: string): string {
  return crypto.createHmac('sha256', getJwtSecret()).update(`${sessionToken}:${code}`).digest('hex');
}
