import { describe, expect, it } from 'vitest';
import { chatModelPolicy } from '../../server-cost-policy';

/**
 * The paid chat model used to run whenever a key existed in the environment,
 * so every text turn in every conversation was billed. These cases are written
 * as "did anybody decide to spend this money?".
 */

describe('paid chat model gate', () => {
  it('stays off when a key exists but nobody turned it on', () => {
    // The whole point: a key in .env is not permission to bill per message.
    const policy = chatModelPolicy({ GEMINI_API_KEY: 'AIza-not-a-real-key' } as NodeJS.ProcessEnv);
    expect(policy.enabled).toBe(false);
    expect(policy.reason).toContain('CHAT_ENABLE_GEMINI');
  });

  it('stays off when it is turned on but no key is set', () => {
    const policy = chatModelPolicy({ CHAT_ENABLE_GEMINI: '1' } as NodeJS.ProcessEnv);
    expect(policy.enabled).toBe(false);
    expect(policy.reason).toContain('GEMINI_API_KEY');
  });

  it('runs only when both are present', () => {
    const policy = chatModelPolicy({
      GEMINI_API_KEY: 'AIza-not-a-real-key',
      CHAT_ENABLE_GEMINI: '1',
    } as NodeJS.ProcessEnv);
    expect(policy.enabled).toBe(true);
    expect(policy.reason).toBe('');
  });

  it('is off by default on a bare environment', () => {
    expect(chatModelPolicy({} as NodeJS.ProcessEnv).enabled).toBe(false);
  });

  it('treats an ambiguous or mistyped switch as off', () => {
    // "ture" is a typo for "true". Reading it as yes would start the charges
    // that the switch exists to prevent; the safer way to be wrong is free.
    for (const value of ['ture', 'maybe', '0', 'false', 'no', '', ' ']) {
      const policy = chatModelPolicy({
        GEMINI_API_KEY: 'AIza-not-a-real-key',
        CHAT_ENABLE_GEMINI: value,
      } as NodeJS.ProcessEnv);
      expect(policy.enabled, `CHAT_ENABLE_GEMINI=${JSON.stringify(value)}`).toBe(false);
    }
  });

  it('accepts the words the rest of the system accepts', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on', ' On ']) {
      const policy = chatModelPolicy({
        GEMINI_API_KEY: 'AIza-not-a-real-key',
        CHAT_ENABLE_GEMINI: value,
      } as NodeJS.ProcessEnv);
      expect(policy.enabled, `CHAT_ENABLE_GEMINI=${JSON.stringify(value)}`).toBe(true);
    }
  });

  it('ignores a key that is only whitespace', () => {
    const policy = chatModelPolicy({
      GEMINI_API_KEY: '   ',
      CHAT_ENABLE_GEMINI: '1',
    } as NodeJS.ProcessEnv);
    expect(policy.enabled).toBe(false);
  });

  it('distinguishes a missing key from a switched-off one', () => {
    // Telling somebody to set a key they already set sends them to the wrong
    // place, and they usually conclude the key is broken.
    const noKey = chatModelPolicy({ CHAT_ENABLE_GEMINI: '1' } as NodeJS.ProcessEnv);
    const switchedOff = chatModelPolicy({
      GEMINI_API_KEY: 'AIza-not-a-real-key',
    } as NodeJS.ProcessEnv);

    expect(noKey.reason).not.toEqual(switchedOff.reason);
    expect(switchedOff.reason).toContain('ไม่มีค่าใช้จ่าย');
  });
});
