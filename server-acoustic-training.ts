/** A training label is useful only when it belongs to a real recording of the same fruit. */
export type KnockAttachment = {
  ownerId?: unknown;
  type?: unknown;
  storedName?: unknown;
};

export function wavHeaderLooksValid(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE';
}

export function linkedKnockError(
  attachment: KnockAttachment | undefined,
  ownerId: string,
  header: Uint8Array | null,
): string | null {
  if (!attachment || attachment.ownerId !== ownerId) return 'ไม่พบไฟล์เสียงเคาะของบัญชีนี้';
  if (attachment.type !== 'audio' || typeof attachment.storedName !== 'string' ||
      !/\.wav$/i.test(attachment.storedName)) {
    return 'ไฟล์เสียงเคาะต้องเป็น WAV';
  }
  if (!header || !wavHeaderLooksValid(header)) return 'ไฟล์เสียงเคาะไม่ใช่ WAV ที่อ่านได้';
  return null;
}

export function validMeasuredBrix(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 30;
}
