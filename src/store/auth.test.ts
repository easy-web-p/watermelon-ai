import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONSENT, useAuth, useDisplayUser } from './auth';
import { renderHook } from '@testing-library/react';
import { api } from '../lib/api';
import * as apiModule from '../lib/api';

const FARMER = { id: 'usr-1', name: 'สมศักดิ์ เกษตรมั่งคั่ง', role: 'user', phone: '0845928190' };

function resetStore() {
  useAuth.setState({
    user: null,
    token: null,
    consent: DEFAULT_CONSENT,
    pendingOtp: null,
    status: 'idle',
    error: null,
  });
}

describe('auth store', () => {
  beforeEach(resetStore);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a short phone number before calling the server', async () => {
    const send = vi.spyOn(api, 'sendOtp');

    await expect(useAuth.getState().requestOtp('08459')).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
    expect(useAuth.getState().error).toContain('10 หลัก');
  });

  it('strips formatting before sending the number', async () => {
    const send = vi
      .spyOn(api, 'sendOtp')
      .mockResolvedValue({ success: true, sessionToken: 'sess_1', message: 'ok' });

    await useAuth.getState().requestOtp('084-592-8190');

    expect(send).toHaveBeenCalledWith('0845928190');
    expect(useAuth.getState().pendingOtp).toMatchObject({ sessionToken: 'sess_1', phone: '0845928190' });
  });

  it('refuses to verify without a pending session', async () => {
    await expect(useAuth.getState().verifyOtp('123456')).rejects.toThrow();
    expect(useAuth.getState().error).toContain('ขอรหัส OTP ใหม่');
  });

  it('stores the user and clears the pending session on success', async () => {
    vi.spyOn(api, 'sendOtp').mockResolvedValue({ success: true, sessionToken: 'sess_1', message: 'ok' });
    vi.spyOn(api, 'verifyOtp').mockResolvedValue({ success: true, user: FARMER, token: 'jwt-1' });

    await useAuth.getState().requestOtp('0845928190');
    const user = await useAuth.getState().verifyOtp('123456');

    expect(user).toEqual(FARMER);
    const state = useAuth.getState();
    expect(state.token).toBe('jwt-1');
    expect(state.pendingOtp).toBeNull();
    expect(state.status).toBe('idle');
  });

  it('keeps the pending session when the code is wrong, so the user can retry', async () => {
    vi.spyOn(api, 'sendOtp').mockResolvedValue({ success: true, sessionToken: 'sess_1', message: 'ok' });
    vi.spyOn(api, 'verifyOtp').mockRejectedValue(new Error('รหัส OTP ไม่ถูกต้อง (เหลือโอกาส 4 ครั้ง)'));

    await useAuth.getState().requestOtp('0845928190');
    await expect(useAuth.getState().verifyOtp('000000')).rejects.toThrow();

    const state = useAuth.getState();
    expect(state.pendingOtp).not.toBeNull();
    expect(state.user).toBeNull();
    expect(state.error).toContain('ไม่ถูกต้อง');
  });

  it('never leaves status stuck on loading after a failure', async () => {
    vi.spyOn(api, 'sendOtp').mockRejectedValue(new Error('เครือข่ายขัดข้อง'));

    await expect(useAuth.getState().requestOtp('0845928190')).rejects.toThrow();
    expect(useAuth.getState().status).toBe('idle');
  });

  it('does not claim consent changed when the server call fails', async () => {
    useAuth.setState({ user: FARMER, token: 'jwt-1' });
    const update = vi.spyOn(api, 'updateConsent').mockRejectedValue(new Error('offline'));

    await expect(useAuth.getState().setConsent({ improveModel: true })).rejects.toThrow('offline');

    expect(useAuth.getState().consent.improveModel).toBe(false);
    expect(update).toHaveBeenCalled();
  });

  it('rejects consent changes while signed out', async () => {
    const update = vi.spyOn(api, 'updateConsent');

    await expect(useAuth.getState().setConsent({ marketing: true })).rejects.toThrow('เข้าสู่ระบบ');

    expect(useAuth.getState().consent.marketing).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('loads account and consent from the server instead of an old local default', async () => {
    useAuth.setState({ user: FARMER, token: 'jwt-1' });
    vi.spyOn(api, 'accountSettings').mockResolvedValue({
      success: true,
      user: { ...FARMER, organization: 'สวนจริง' },
      consent: { ...DEFAULT_CONSENT, improveModel: true },
      capabilities: { passwordChange: true, avatarUpload: false, twoFactor: false, lineNotifications: false },
    });

    await useAuth.getState().refreshAccount();

    expect(useAuth.getState().user?.organization).toBe('สวนจริง');
    expect(useAuth.getState().consent.improveModel).toBe(true);
  });

  it('updates the visible profile only after the server confirms the save', async () => {
    useAuth.setState({ user: FARMER, token: 'jwt-1' });
    const save = vi.spyOn(api, 'updateProfile').mockResolvedValue({ success: true, user: { ...FARMER, name: 'ชื่อใหม่' } });

    await useAuth.getState().saveProfile({ name: 'ชื่อใหม่' });

    expect(save).toHaveBeenCalledWith({ name: 'ชื่อใหม่' });
    expect(useAuth.getState().user?.name).toBe('ชื่อใหม่');
  });

  it('rejects a 9-digit number, which the old message asked for 10 of', async () => {
    const send = vi.spyOn(api, 'sendOtp');

    await expect(useAuth.getState().requestOtp('084592819')).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects a landline-style prefix', async () => {
    const send = vi.spyOn(api, 'sendOtp');

    await expect(useAuth.getState().requestOtp('021234567')).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends only the bearer token, never a self-declared user id', async () => {
    // The server used to read the identity out of `x-user-id` /
    // `x-user-role`, so sending them made the headers the authorisation.
    const captured: Record<string, string>[] = [];
    vi.spyOn(apiModule, 'setAuthHeaders').mockImplementation((headers) => {
      captured.push(headers);
    });
    vi.spyOn(api, 'sendOtp').mockResolvedValue({ success: true, sessionToken: 'sess_1', message: 'ok' });
    vi.spyOn(api, 'verifyOtp').mockResolvedValue({ success: true, user: FARMER, token: 'jwt-1' });

    await useAuth.getState().requestOtp('0845928190');
    await useAuth.getState().verifyOtp('123456');

    const applied = captured.at(-1) ?? {};
    expect(applied.Authorization).toBe('Bearer jwt-1');
    expect(applied['x-user-id']).toBeUndefined();
    expect(applied['x-user-role']).toBeUndefined();
  });

  it('never presents a signed-out visitor as a named PRO subscriber', () => {
    // The sidebar used to show "สมศักดิ์ สวนแตงโมไชโย" on the
    // "PRO เกษตรกรดิจิทัล" plan to anyone who had not signed in.
    const { result } = renderHook(() => useDisplayUser());

    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.name).not.toContain('สมศักดิ์');
    expect(result.current.role).not.toContain('PRO');
    expect(result.current.initial).toBeTruthy();
  });

  it('keeps the avatar initial usable for an account saved with a blank name', () => {
    useAuth.setState({ user: { ...FARMER, name: '' }, token: 'jwt-1' });

    const { result } = renderHook(() => useDisplayUser());

    // `''[0]` was undefined, which rendered as the text "undefined".
    expect(result.current.initial).toBeTruthy();
    expect(result.current.initial).not.toBe('undefined');
  });

  it('clears the session on sign out', async () => {
    vi.spyOn(api, 'sendOtp').mockResolvedValue({ success: true, sessionToken: 'sess_1', message: 'ok' });
    vi.spyOn(api, 'verifyOtp').mockResolvedValue({ success: true, user: FARMER, token: 'jwt-1' });

    await useAuth.getState().requestOtp('0845928190');
    await useAuth.getState().verifyOtp('123456');
    useAuth.getState().signOut();

    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.pendingOtp).toBeNull();
  });

  it('does not fabricate a social session when the API is offline', async () => {
    vi.spyOn(api, 'socialLogin').mockRejectedValue(new apiModule.ApiError('เซิร์ฟเวอร์ยังไม่เปิดให้บริการ', 502));

    await expect(useAuth.getState().socialLogin('line')).rejects.toThrow();

    expect(useAuth.getState().token).toBeNull();
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().status).toBe('idle');
  });

  it('does not fabricate a password session when the API is offline', async () => {
    vi.spyOn(api, 'login').mockRejectedValue(new apiModule.ApiError('เซิร์ฟเวอร์ยังไม่เปิดให้บริการ', 502));

    await expect(useAuth.getState().loginWithPassword('farmer@test.com', 'pass123')).rejects.toThrow();

    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().token).toBeNull();
  });

  it('does not invent an OTP code when the API is offline', async () => {
    vi.spyOn(api, 'sendOtp').mockRejectedValue(new apiModule.ApiError('เซิร์ฟเวอร์ยังไม่เปิดให้บริการ', 502));

    await expect(useAuth.getState().requestOtp('0845928190')).rejects.toThrow();

    expect(useAuth.getState().pendingOtp).toBeNull();
    expect(useAuth.getState().user).toBeNull();
  });
});
