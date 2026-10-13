import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, setAuthHeaders, ApiError, type AccountSettingsResponse, type ApiUser } from '../lib/api';
import { isValidThaiMobile, normalizePhone } from '../lib/calc';
import { setHistoryScope } from '../lib/chatHistory';

/**
 * Session state. The token and user survive reloads via localStorage; the
 * pending OTP session does not, so an interrupted sign-in starts over rather
 * than leaving a stale token lying around.
 */

export type ConsentFlags = {
  analytics: boolean;
  improveModel: boolean;
  marketing: boolean;
  shareAnonymised: boolean;
  locationAlerts: boolean;
};

export const DEFAULT_CONSENT: ConsentFlags = {
  analytics: false,
  improveModel: false,
  marketing: false,
  shareAnonymised: false,
  locationAlerts: false,
};

type AuthState = {
  user: ApiUser | null;
  token: string | null;
  consent: ConsentFlags;
  /** Set between requesting an OTP and verifying it. Not persisted. */
  pendingOtp: { sessionToken: string; phone: string; demoCode?: string } | null;
  status: 'idle' | 'loading';
  error: string | null;

  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<ApiUser>;
  socialLogin: (provider: 'google' | 'line') => Promise<ApiUser>;
  loginWithPassword: (identifier: string, password?: string) => Promise<ApiUser>;
  register: (data: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    province?: string;
    cultivar?: string;
    plotSize?: string;
  }) => Promise<ApiUser>;
  refreshAccount: () => Promise<AccountSettingsResponse>;
  saveProfile: (next: { name?: string; organization?: string; province?: string; plotSize?: string }) => Promise<ApiUser>;
  setConsent: (next: Partial<ConsentFlags>) => Promise<void>;
  clearError: () => void;
  signOut: () => void;
};

/**
 * Mirrors the token into the API client so every request is authenticated.
 *
 * Only the bearer token is sent. This used to add `x-user-id` and
 * `x-user-role` headers, and the server read the identity out of them
 * instead of the signed token — so the headers were the authorisation, and
 * anyone could set them to anything. The server now derives identity from
 * the JWT alone; sending them as well would only suggest they still matter.
 */
function applyHeaders(user: ApiUser | null, token: string | null) {
  // Local chat history is stored per account. Pointing it at the new session
  // here covers every way the session can change — the four sign-in paths,
  // sign-out, and rehydrate on load — because they all come through this
  // function. Doing it in each caller instead is how one of them gets missed,
  // and a missed call means the next person on the device reads these threads.
  setHistoryScope(user && token ? user.id : null);

  if (!token || !user) {
    setAuthHeaders({});
    return;
  }
  setAuthHeaders({ Authorization: `Bearer ${token}` });
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      consent: DEFAULT_CONSENT,
      pendingOtp: null,
      status: 'idle',
      error: null,

      async requestOtp(phone) {
        const digits = normalizePhone(phone);
        // The message said 10 digits while the check accepted 9, so a
        // mistyped number reached the server and failed there instead.
        if (!isValidThaiMobile(digits)) {
          set({ error: 'กรุณากรอกเบอร์โทรศัพท์มือถือให้ครบ 10 หลัก (ขึ้นต้นด้วย 06, 08 หรือ 09)' });
          throw new Error('invalid phone');
        }

        set({ status: 'loading', error: null });
        try {
          const result = await api.sendOtp(digits);
          set({
            pendingOtp: { sessionToken: result.sessionToken, phone: digits, demoCode: result.demoCode },
            status: 'idle',
          });
        } catch (error) {
          set({ status: 'idle', error: error instanceof Error ? error.message : 'ส่งรหัส OTP ไม่สำเร็จ' });
          throw error;
        }
      },

      async verifyOtp(code) {
        const pending = get().pendingOtp;
        if (!pending) {
          set({ error: 'เซสชันหมดอายุ กรุณาขอรหัส OTP ใหม่' });
          throw new Error('no pending otp');
        }

        set({ status: 'loading', error: null });
        try {
          const result = await api.verifyOtp({
            sessionToken: pending.sessionToken,
            code,
            phone: pending.phone,
          });
          applyHeaders(result.user, result.token);
          set({ user: result.user, token: result.token, consent: DEFAULT_CONSENT, pendingOtp: null, status: 'idle' });
          return result.user;
        } catch (error) {
          set({ status: 'idle', error: error instanceof Error ? error.message : 'ยืนยันรหัสไม่สำเร็จ' });
          throw error;
        }
      },

      async socialLogin(provider) {
        set({ status: 'loading', error: null });
        try {
          let idToken: string | undefined;
          if (provider === 'google' && typeof window !== 'undefined') {
            try {
              // Imported here rather than at the top of the file: the
              // Firebase SDK is the largest dependency in the bundle and
              // initialises Analytics, App Check and Data Connect as import
              // side effects, which every farmer paid for on first paint
              // whether or not they ever signed in with Google.
              const { loginWithFirebaseGoogle } = await import('../lib/firebase');
              const fbUser = await loginWithFirebaseGoogle();
              idToken = await fbUser.getIdToken();
            } catch (fbErr: any) {
              set({ status: 'idle' });
              if (fbErr?.code === 'auth/popup-closed-by-user' || fbErr?.code === 'auth/cancelled-popup-request') {
                set({ error: 'ยกเลิกการเข้าสู่ระบบด้วย Google' });
                throw new Error('ยกเลิกการเข้าสู่ระบบ');
              }
              throw fbErr;
            }
          }
          const result = await api.socialLogin({ provider, idToken });

          applyHeaders(result.user, result.token);
          set({ user: result.user, token: result.token, consent: DEFAULT_CONSENT, status: 'idle' });
          return result.user;
        } catch (error) {
          set({ status: 'idle', error: error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ' });
          throw error;
        }
      },

      async loginWithPassword(identifier, password) {
        set({ status: 'loading', error: null });
        try {
          const result = await api.login({ identifier, password });
          applyHeaders(result.user, result.token);
          set({ user: result.user, token: result.token, consent: DEFAULT_CONSENT, status: 'idle' });
          return result.user;
        } catch (error) {
          set({ status: 'idle', error: error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ' });
          throw error;
        }
      },

      async register(data) {
        set({ status: 'loading', error: null });
        try {
          const result = await api.register(data);
          applyHeaders(result.user, result.token);
          set({ user: result.user, token: result.token, consent: DEFAULT_CONSENT, status: 'idle' });
          return result.user;
        } catch (error) {
          set({ status: 'idle', error: error instanceof Error ? error.message : 'สมัครสมาชิกไม่สำเร็จ' });
          throw error;
        }
      },

      async refreshAccount() {
        if (!get().token || !get().user) throw new Error('กรุณาเข้าสู่ระบบก่อนจัดการบัญชี');
        try {
          const result = await api.accountSettings();
          set({ user: result.user, consent: result.consent, error: null });
          return result;
        } catch (error) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
            get().signOut();
          }
          set({ error: error instanceof Error ? error.message : 'โหลดข้อมูลบัญชีไม่สำเร็จ' });
          throw error;
        }
      },

      async saveProfile(next) {
        if (!get().token || !get().user) throw new Error('กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์');
        const result = await api.updateProfile(next);
        set({ user: result.user, error: null });
        return result.user;
      },

      async setConsent(next) {
        if (!get().token || !get().user) throw new Error('กรุณาเข้าสู่ระบบก่อนตั้งค่าความยินยอม');
        const result = await api.updateConsent(next);
        set({ consent: result.consent, error: null });
      },

      clearError: () => set({ error: null }),

      signOut() {
        applyHeaders(null, null);
        set({ user: null, token: null, consent: DEFAULT_CONSENT, pendingOtp: null, error: null });
      },
    }),
    {
      name: 'watermelon-auth',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted) => {
        const previous = persisted as Partial<AuthState>;
        // Old builds persisted consent flags shared across accounts, including
        // a true-by-default model-training flag. The server is now the source.
        return { user: previous.user ?? null, token: previous.token ?? null } as AuthState;
      },
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) applyHeaders(state.user, state.token);
      },
    },
  ),
);

/** Fallback label for a visitor who has not signed in. */
const GUEST_NAME = 'ผู้เยี่ยมชม';

/**
 * Identity for the account chrome.
 *
 * A signed-out visitor used to be shown as "สมศักดิ์ สวนแตงโมไชโย" on the
 * "PRO เกษตรกรดิจิทัล" plan — a name and a paid tier that belong to nobody.
 * Anyone looking at the sidebar would read it as their own account.
 */
export function useDisplayUser() {
  const user = useAuth((state) => state.user);
  const name = user?.name?.trim() || (user ? 'ผู้ใช้งาน' : GUEST_NAME);
  return {
    name,
    // `''[0]` is undefined, so an account saved with a blank name left the
    // avatar rendering "undefined".
    initial: name.charAt(0) || '🍉',
    role: !user ? 'ยังไม่ได้เข้าสู่ระบบ' : user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เกษตรกร',
    isSignedIn: Boolean(user),
  };
}
