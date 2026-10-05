import { describe, expect, it } from 'vitest';
import { CloudStorageService, MAX_SIGNED_URL_TTL_SEC } from '../../server-storage';

/**
 * Signed media URLs are the only thing standing between a leaf photo in
 * `uploads/` and anyone who can guess a filename, so the failure modes matter
 * more than the happy path.
 */
describe('signed media URLs', () => {
  it('round-trips a URL it issued', () => {
    const { token, expiresAt } = CloudStorageService.generateSignedUrl('leaf.jpg', 'read', 600);

    expect(CloudStorageService.verifySignedUrl(token, 'leaf.jpg', expiresAt, 'read')).toBe(true);
  });

  it('rejects the token for a different file', () => {
    const { token, expiresAt } = CloudStorageService.generateSignedUrl('mine.jpg', 'read', 600);

    expect(CloudStorageService.verifySignedUrl(token, 'someone-elses.jpg', expiresAt, 'read')).toBe(false);
  });

  it('rejects a read token presented for a write', () => {
    const { token, expiresAt } = CloudStorageService.generateSignedUrl('leaf.jpg', 'read', 600);

    expect(CloudStorageService.verifySignedUrl(token, 'leaf.jpg', expiresAt, 'write')).toBe(false);
  });

  it('rejects an expired token', () => {
    const expiresAt = Math.floor(Date.now() / 1000) - 10;
    const { token } = CloudStorageService.generateSignedUrl('leaf.jpg', 'read', 600);

    expect(CloudStorageService.verifySignedUrl(token, 'leaf.jpg', expiresAt, 'read')).toBe(false);
  });

  it('returns false for a token of the wrong length instead of throwing', () => {
    // This came back as an unhandled RangeError out of timingSafeEqual, so a
    // forged URL produced a 500 with a stack trace rather than a 403.
    const expiresAt = Math.floor(Date.now() / 1000) + 600;

    expect(() => CloudStorageService.verifySignedUrl('abc', 'leaf.jpg', expiresAt, 'read')).not.toThrow();
    expect(CloudStorageService.verifySignedUrl('abc', 'leaf.jpg', expiresAt, 'read')).toBe(false);
    expect(CloudStorageService.verifySignedUrl('', 'leaf.jpg', expiresAt, 'read')).toBe(false);
  });

  it('rejects a non-numeric or infinite expiry', () => {
    // `expiresAt` arrives as a path segment and was passed through Number().
    // `now > NaN` is false, so the expiry check simply did not apply.
    const { token } = CloudStorageService.generateSignedUrl('leaf.jpg', 'read', 600);

    expect(CloudStorageService.verifySignedUrl(token, 'leaf.jpg', Number('nonsense'), 'read')).toBe(false);
    expect(CloudStorageService.verifySignedUrl(token, 'leaf.jpg', Infinity, 'read')).toBe(false);
    expect(CloudStorageService.verifySignedUrl(token, 'leaf.jpg', Number.MAX_VALUE, 'read')).toBe(false);
  });

  it('caps the lifetime a caller can ask for', () => {
    // The TTL came from a request body and was used unchecked, so one request
    // could mint a URL valid for a thousand years.
    const now = Math.floor(Date.now() / 1000);
    const { expiresAt } = CloudStorageService.generateSignedUrl('leaf.jpg', 'read', 99_999_999_999);

    expect(expiresAt - now).toBeLessThanOrEqual(MAX_SIGNED_URL_TTL_SEC);
  });

  it('falls back to the default lifetime for a nonsensical TTL', () => {
    const now = Math.floor(Date.now() / 1000);
    const { expiresAt } = CloudStorageService.generateSignedUrl('leaf.jpg', 'read', Number.NaN);

    expect(expiresAt).toBeGreaterThan(now);
    expect(expiresAt - now).toBeLessThanOrEqual(MAX_SIGNED_URL_TTL_SEC);
  });

  it('keeps the filename inside the uploads directory', () => {
    // getFilePath basenames its argument, so a traversal attempt resolves to a
    // plain filename that does not exist rather than to /etc/passwd.
    expect(CloudStorageService.getFilePath('../../../../etc/passwd')).toBeNull();
    expect(CloudStorageService.getFilePath('..\\..\\windows\\win.ini')).toBeNull();
  });
});
