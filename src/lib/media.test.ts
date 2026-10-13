import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_IMAGE_BYTES, pcmFloat32ToWavDataUrl, recordingToPcm, validateImage } from './media';

afterEach(() => vi.unstubAllGlobals());

function fakeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  // Size is read-only on File, so override it for the size-limit cases.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateImage', () => {
  it('accepts the formats a phone camera produces', () => {
    expect(validateImage(fakeFile('leaf.jpg', 'image/jpeg', 2_000_000))).toBeNull();
    expect(validateImage(fakeFile('leaf.png', 'image/png', 2_000_000))).toBeNull();
    expect(validateImage(fakeFile('leaf.webp', 'image/webp', 2_000_000))).toBeNull();
    expect(validateImage(fakeFile('leaf.heic', 'image/heic', 2_000_000))).toBeNull();
  });

  it('rejects non-images with a message a farmer can act on', () => {
    expect(validateImage(fakeFile('notes.pdf', 'application/pdf', 1000))).toBe(
      'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG หรือ WEBP)',
    );
  });

  it('rejects image formats the pipeline cannot decode', () => {
    expect(validateImage(fakeFile('leaf.gif', 'image/gif', 1000))).toContain('รองรับเฉพาะไฟล์');
  });

  it('rejects files over the 10 MB limit', () => {
    expect(validateImage(fakeFile('huge.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1))).toContain('ใหญ่เกิน 10 MB');
  });

  it('accepts a file exactly at the limit', () => {
    expect(validateImage(fakeFile('edge.jpg', 'image/jpeg', MAX_IMAGE_BYTES))).toBeNull();
  });
});

describe('recordingToPcm', () => {
  it('averages real audio channels and preserves sample rate', async () => {
    const close = vi.fn(async () => undefined);
    vi.stubGlobal('AudioContext', class {
      decodeAudioData = vi.fn(async () => ({
        duration: 0.5,
        length: 2,
        sampleRate: 8_000,
        numberOfChannels: 2,
        getChannelData: (index: number) => index === 0
          ? new Float32Array([0.5, 0.25])
          : new Float32Array([-0.5, 0.75]),
      }));
      close = close;
    });
    const result = await recordingToPcm({
      dataUrl: 'data:audio/webm;base64,AA==',
      mimeType: 'audio/webm',
      durationMs: 500,
      levels: [],
    });
    const bytes = Uint8Array.from(atob(result.pcmBase64), (char) => char.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    expect(result.sampleRate).toBe(8_000);
    expect(view.getFloat32(0, true)).toBe(0);
    expect(view.getFloat32(4, true)).toBe(0.5);
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('pcmFloat32ToWavDataUrl', () => {
  it('creates a mono PCM WAV preserving the sample rate and signed samples', () => {
    const samples = new Float32Array([-1, 0, 0.5, 1]);
    const encoded = btoa(String.fromCharCode(...new Uint8Array(samples.buffer)));
    const wav = pcmFloat32ToWavDataUrl(encoded, 8_000);
    const bytes = Uint8Array.from(atob(wav.split(',')[1]), (char) => char.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...bytes.subarray(8, 12))).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(8_000);
    expect(view.getUint32(40, true)).toBe(8);
    expect([0, 1, 2, 3].map((i) => view.getInt16(44 + i * 2, true))).toEqual([-32768, 0, 16384, 32767]);
  });
});
