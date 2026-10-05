import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken,
  type AppCheck,
} from 'firebase/app-check';
import { getDataConnect, connectDataConnectEmulator, type DataConnect } from 'firebase/data-connect';
import { connectorConfig } from './dataconnect/esm/index.esm.js';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDmTJS7LESnZfbr6_ewxgkmui9gcgBcLKA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "acoustic-fruit-ripeness.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "acoustic-fruit-ripeness",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "acoustic-fruit-ripeness.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "635676387940",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:635676387940:web:92aab889e08bf4c1a44d71",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3X579XMXK0",
};

// Initialize Firebase once
export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const firebaseAuth: Auth = getAuth(firebaseApp);

/**
 * True under Vitest. Importing this module used to start App Check and
 * Analytics as import side effects, so the unit tests printed a live App
 * Check debug token to stdout on every run and then failed to persist it
 * because jsdom has no IndexedDB.
 */
const IS_TEST = import.meta.env.MODE === 'test' || Boolean(import.meta.env.VITEST);

export let firebaseAnalytics: Analytics | null = null;
if (typeof window !== 'undefined' && !IS_TEST) {
  isSupported()
    .then((supported) => {
      if (supported) {
        firebaseAnalytics = getAnalytics(firebaseApp);
      }
    })
    .catch(() => null);
}

export const googleAuthProvider = new GoogleAuthProvider();

export async function loginWithFirebaseGoogle() {
  const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
  return result.user;
}

/**
 * Firebase App Check with reCAPTCHA Enterprise & Debug Provider
 * Protects backend and Firebase resources from abuse, bots, and fraud.
 */
export let appCheck: AppCheck | null = null;

if (typeof window !== 'undefined' && !IS_TEST) {
  try {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1';

    const recaptchaKey =
      import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY ||
      import.meta.env.VITE_FIREBASE_APPCHECK_KEY ||
      '';

    // In local development, let a configured debug token stand in for the
    // reCAPTCHA Enterprise domain check.
    const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
    if ((isLocalhost || import.meta.env.DEV) && debugToken) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }

    /**
     * A real site key is required.
     *
     * The debug token used to default to `true`, which made this condition
     * always true in development, and App Check was then initialised with a
     * literal '6Lf-placeholder-dev-key'. That cannot attest anything: it
     * only produced console noise and a token request that always failed,
     * while looking from the outside like abuse protection was on.
     */
    if (recaptchaKey) {
      appCheck = initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (!import.meta.env.DEV) {
      console.warn(
        'Firebase App Check is not configured: set VITE_RECAPTCHA_ENTERPRISE_KEY to enable abuse protection.',
      );
    }
  } catch (error) {
    console.warn('Firebase App Check initialization skipped or failed:', error);
  }
}

/**
 * Retrieves the current App Check token, refreshing if necessary.
 */
export async function getAppCheckToken(forceRefresh = false): Promise<string | null> {
  if (!appCheck) return null;
  try {
    const result = await getToken(appCheck, forceRefresh);
    return result.token;
  } catch (err) {
    console.warn('Error fetching App Check token:', err);
    return null;
  }
}

/**
 * Firebase SQL Connect (Data Connect)
 */
export let dataConnect: DataConnect | null = null;
if (!IS_TEST) {
  try {
    dataConnect = getDataConnect(firebaseApp, connectorConfig);
    if (
      typeof window !== 'undefined' &&
      import.meta.env.DEV &&
      import.meta.env.VITE_USE_DATA_CONNECT_EMULATOR === 'true'
    ) {
      connectDataConnectEmulator(dataConnect, 'localhost', 9399);
    }
  } catch (e) {
    console.warn('Firebase Data Connect initialization skipped or failed:', e);
  }
}
