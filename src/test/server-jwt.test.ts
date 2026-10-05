import { describe, expect, it } from 'vitest';
import { signJwt, verifyJwt } from '../../server-jwt';

describe('server-jwt authentication', () => {
  const secret = 'test_secret_for_watermelon_ai_testing_12345';

  it('signs and verifies a valid JWT payload', () => {
    const payload = {
      sub: 'usr-123456',
      phone: '0812345678',
      role: 'farmer',
    };

    const token = signJwt(payload, 3600, secret);
    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3);

    const verified = verifyJwt(token, secret);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('usr-123456');
    expect(verified?.phone).toBe('0812345678');
    expect(verified?.role).toBe('farmer');
    expect(verified?.exp).toBeGreaterThan(verified?.iat ?? 0);
  });

  it('rejects a token signed with a different secret', () => {
    const token = signJwt({ sub: 'usr-attacker', role: 'admin' }, 3600, secret);
    const verified = verifyJwt(token, 'different_wrong_secret_99999');
    expect(verified).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = signJwt({ sub: 'usr-normal', role: 'user' }, 3600, secret);
    const [header, , signature] = token.split('.');
    // Fake payload attempting privilege escalation to admin
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: 'usr-normal', role: 'admin', iat: 1000, exp: 9999999999 }),
    ).toString('base64url');
    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

    const verified = verifyJwt(tamperedToken, secret);
    expect(verified).toBeNull();
  });

  it('rejects an expired token', () => {
    // expiresInSeconds = -10 (expired 10 seconds ago)
    const token = signJwt({ sub: 'usr-expired', role: 'user' }, -10, secret);
    const verified = verifyJwt(token, secret);
    expect(verified).toBeNull();
  });

  it('rejects malformed token strings gracefully without throwing', () => {
    expect(verifyJwt('', secret)).toBeNull();
    expect(verifyJwt('invalid-token', secret)).toBeNull();
    expect(verifyJwt('a.b', secret)).toBeNull();
    expect(verifyJwt('a.b.c.d', secret)).toBeNull();
    expect(verifyJwt('header.not_json.sig', secret)).toBeNull();
  });
});
