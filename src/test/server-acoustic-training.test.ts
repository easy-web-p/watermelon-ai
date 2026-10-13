import { describe, expect, it } from 'vitest';
import { linkedKnockError, validMeasuredBrix, wavHeaderLooksValid } from '../../server-acoustic-training';

const wav = Uint8Array.from(Buffer.from('RIFF\u0000\u0000\u0000\u0000WAVEfmt ', 'binary'));

describe('sound training evidence', () => {
  it('requires a real WAV owned by the specimen owner', () => {
    const attachment = { ownerId: 'farmer-1', type: 'audio', storedName: 'knock.wav' };
    expect(wavHeaderLooksValid(wav)).toBe(true);
    expect(linkedKnockError(attachment, 'farmer-1', wav)).toBeNull();
    expect(linkedKnockError(attachment, 'farmer-2', wav)).not.toBeNull();
    expect(linkedKnockError(attachment, 'farmer-1', null)).not.toBeNull();
    expect(linkedKnockError({ ...attachment, storedName: 'leaf.jpg' }, 'farmer-1', wav)).not.toBeNull();
    expect(wavHeaderLooksValid(Uint8Array.from(Buffer.from('fake audio clip')))).toBe(false);
  });

  it('rejects impossible or missing measured Brix labels', () => {
    expect(validMeasuredBrix(12.3)).toBe(true);
    for (const value of [null, undefined, '12.3', -1, 31, Infinity, NaN]) {
      expect(validMeasuredBrix(value)).toBe(false);
    }
  });
});
