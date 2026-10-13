import { describe, expect, it } from 'vitest';
import { InvalidFirebaseTokenError, validatedGoogleClaims, verifyFirebaseGoogleIdToken } from '../../server-firebase-auth';

const NOW = 1_800_000_000;
const validClaims = {
  aud: 'project-1',
  iss: 'https://securetoken.google.com/project-1',
  sub: 'firebase-user-1',
  exp: NOW + 3600,
  iat: NOW - 60,
  auth_time: NOW - 60,
  email: 'Farmer@Example.com',
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
};

describe('Firebase Google login evidence', () => {
  it('accepts only verified Google claims for the configured project', () => {
    expect(validatedGoogleClaims(validClaims, 'project-1', NOW)).toMatchObject({
      uid: 'firebase-user-1', email: 'farmer@example.com',
    });
  });

  it.each([
    { aud: 'another-project' },
    { iss: 'https://securetoken.google.com/another-project' },
    { exp: NOW },
    { iat: NOW + 60 },
    { auth_time: NOW + 60 },
    { sub: '' },
    { email_verified: false },
    { email: 'not-an-email' },
    { firebase: { sign_in_provider: 'password' } },
  ])('rejects claims that cannot establish Google identity: %j', (changes) => {
    expect(() => validatedGoogleClaims({ ...validClaims, ...changes }, 'project-1', NOW)).toThrow(InvalidFirebaseTokenError);
  });

  it('rejects an email or fake token supplied without a signed Firebase JWT', async () => {
    await expect(verifyFirebaseGoogleIdToken(undefined, 'project-1')).rejects.toThrow(InvalidFirebaseTokenError);
    await expect(verifyFirebaseGoogleIdToken('farmer@example.com', 'project-1')).rejects.toThrow(InvalidFirebaseTokenError);
    await expect(verifyFirebaseGoogleIdToken('a.b.c', 'project-1')).rejects.toThrow(InvalidFirebaseTokenError);
  });
});
