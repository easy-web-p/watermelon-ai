import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, validateImage } from './media';

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
