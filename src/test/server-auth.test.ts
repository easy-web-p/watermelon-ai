import { describe, expect, it } from 'vitest';
import {
  hashOtpCode,
  hashPassword,
  safeEqual,
  signJwt,
  verifyJwt,
  verifyPassword,
} from '../../server-jwt';

/**
 * Regression tests for the authentication primitives.
 *
 * Each case here corresponds to a way the API could previously be entered
 * without credentials, so they are written as the attack rather than as the
 * happy path.
 */

const secret = 'test_secret_for_watermelon_ai_testing_12345';

describe('password storage', () => {
  it('never stores the password itself', () => {
    const stored = hashPassword('ลูกแตงโมหวาน2026');

    expect(stored).not.toContain('ลูกแตงโมหวาน2026');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(stored.split('$')).toHaveLength(3);
  });

  it('salts each hash, so two identical passwords do not match on sight', () => {
    expect(hashPassword('same-password')).not.toBe(hashPassword('same-password'));
  });

  it('accepts the right password and rejects a wrong one', () => {
    const stored = hashPassword('correct-horse-battery');

    expect(verifyPassword('correct-horse-battery', stored)).toBe(true);
    expect(verifyPassword('correct-horse-batterx', stored)).toBe(false);
    expect(verifyPassword('', stored)).toBe(false);
  });

  it('refuses to authenticate against an account with no stored password', () => {
    // OTP-only and social accounts have no hash. `/auth/login` used to ignore
    // the password entirely, so any identifier returned a signed session.
    expect(verifyPassword('anything', undefined)).toBe(false);
    expect(verifyPassword('anything', null)).toBe(false);
    expect(verifyPassword('anything', '')).toBe(false);
  });

  it('treats a malformed stored hash as a failure instead of throwing', () => {
    expect(verifyPassword('pw', 'not-a-hash')).toBe(false);
    expect(verifyPassword('pw', 'scrypt$only-two-parts')).toBe(false);
    expect(verifyPassword('pw', 'bcrypt$salt$hash')).toBe(false);
    expect(verifyPassword('pw', 'scrypt$$')).toBe(false);
  });
});

describe('safeEqual', () => {
  it('compares equal strings as equal', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
  });

  it('returns false for a length mismatch rather than throwing', () => {
    // crypto.timingSafeEqual throws a RangeError on unequal lengths. A signed
    // media URL carries an attacker-controlled token, so that turned a forged
    // URL into a 500 instead of a 403.
    expect(() => safeEqual('short', 'a-much-longer-value')).not.toThrow();
    expect(safeEqual('short', 'a-much-longer-value')).toBe(false);
    expect(safeEqual('', 'x')).toBe(false);
  });
});

describe('OTP codes', () => {
  it('is bound to its session, so a code cannot be replayed into another', () => {
    const code = '123456';

    expect(hashOtpCode(code, 'sess_a')).not.toBe(hashOtpCode(code, 'sess_b'));
  });

  it('is deterministic for the same session, so verification can compare it', () => {
    expect(hashOtpCode('123456', 'sess_a')).toBe(hashOtpCode('123456', 'sess_a'));
  });

  it('does not contain the code it protects', () => {
    expect(hashOtpCode('123456', 'sess_a')).not.toContain('123456');
  });
});

describe('verifyJwt hardening', () => {
  it('rejects a token with no subject', () => {
    // Identity is read from `sub`; an empty one used to resolve to a request
    // with no owner, which the ownership filters read as "shared".
    const token = signJwt({ sub: '', role: 'user' }, 3600, secret);

    expect(verifyJwt(token, secret)).toBeNull();
  });

  it('rejects a token whose header claims a different algorithm', () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'usr-1', role: 'admin', exp: 9999999999 })).toString(
      'base64url',
    );
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const crypto = require('crypto') as typeof import('crypto');
    // Signed correctly for this header, so only the `alg` check can catch it.
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

    expect(verifyJwt(`${header}.${payload}.${signature}`, secret)).toBeNull();
  });

  it('rejects a token with a non-numeric expiry', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'usr-1', role: 'user', exp: 'never' })).toString(
      'base64url',
    );
    const crypto = require('crypto') as typeof import('crypto');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

    expect(verifyJwt(`${header}.${payload}.${signature}`, secret)).toBeNull();
  });

  it('carries the role from the signed payload, which a header cannot override', () => {
    // The API derives the role from this value alone. It used to read
    // `x-user-role`, so `-H "x-user-role: admin"` was an admin session.
    const verified = verifyJwt(signJwt({ sub: 'usr-1', role: 'user' }, 3600, secret), secret);

    expect(verified?.role).toBe('user');
  });
});
