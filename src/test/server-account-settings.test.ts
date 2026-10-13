import { describe, expect, it } from 'vitest';
import {
  consentForAccount,
  sessionMatchesAccount,
  validateConsentPatch,
  validateProfilePatch,
} from '../../server-account-settings';

describe('account settings validation', () => {
  it('does not invent consent for an account with no saved record', () => {
    expect(consentForAccount(undefined)).toEqual({
      analytics: false,
      improveModel: false,
      marketing: false,
      shareAnonymised: false,
      locationAlerts: false,
    });
    expect(consentForAccount({ improveModel: true, analytics: 'true' }).improveModel).toBe(true);
    expect(consentForAccount({ improveModel: true, analytics: 'true' }).analytics).toBe(false);
  });

  it('rejects unknown or non-boolean consent flags', () => {
    expect(validateConsentPatch({ improveModel: true })).toEqual({ ok: true, patch: { improveModel: true } });
    expect(validateConsentPatch({ improveModel: 'yes' }).ok).toBe(false);
    expect(validateConsentPatch({ admin: true }).ok).toBe(false);
    expect(validateConsentPatch({}).ok).toBe(false);
  });

  it('accepts only editable profile fields and valid plot sizes', () => {
    expect(validateProfilePatch({ name: '  มะลิ  ', organization: 'สวนจริง', plotSize: '12.5' })).toEqual({
      ok: true,
      patch: { name: 'มะลิ', organization: 'สวนจริง', plotSize: '12.5' },
    });
    expect(validateProfilePatch({ phone: '0899999999' }).ok).toBe(false);
    expect(validateProfilePatch({ role: 'admin' }).ok).toBe(false);
    expect(validateProfilePatch({ email: 'unverified@example.com' }).ok).toBe(false);
    expect(validateProfilePatch({ name: '' }).ok).toBe(false);
    expect(validateProfilePatch({ plotSize: '-1' }).ok).toBe(false);
    expect(validateProfilePatch({ plotSize: '1,000' }).ok).toBe(false);
  });

  it('revokes an old token when the account session version increases', () => {
    expect(sessionMatchesAccount(undefined, undefined)).toBe(true);
    expect(sessionMatchesAccount(undefined, 1)).toBe(false);
    expect(sessionMatchesAccount(2, 2)).toBe(true);
    expect(sessionMatchesAccount(1, 2)).toBe(false);
  });
});
