import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

/**
 * Firebase Configuration for Acoustic Fruit Ripeness (Watermelon AI)
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDmTJS7LESnZfbr6_ewxgkmui9gcgBcLKA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "acoustic-fruit-ripeness.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "acoustic-fruit-ripeness",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "acoustic-fruit-ripeness.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "635676387940",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:635676387940:web:92aab889e08bf4c1a44d71",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3X579XMXK0",
};

// Initialize Firebase App
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics conditionally
let analyticsInstance: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {});
}

export { analyticsInstance as analytics };
