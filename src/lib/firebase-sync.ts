import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { db, storage, auth, googleProvider } from "./firebase";
import { WatermelonSpecimen } from "@/types/chat";

/**
 * Save a watermelon specimen directly to Cloud Firestore
 */
export async function saveSpecimenToFirestore(specimen: WatermelonSpecimen): Promise<void> {
  try {
    const docRef = doc(db, "watermelons", specimen.watermelonId);
    await setDoc(docRef, {
      ...specimen,
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    console.warn("Firestore saveSpecimen error (falling back to local):", err);
  }
}

/**
 * Fetch latest watermelon specimens from Cloud Firestore
 */
export async function getSpecimensFromFirestore(): Promise<WatermelonSpecimen[]> {
  try {
    const q = query(collection(db, "watermelons"), orderBy("createdAt", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    const results: WatermelonSpecimen[] = [];
    querySnapshot.forEach((doc) => {
      results.push(doc.data() as WatermelonSpecimen);
    });
    return results;
  } catch (err) {
    console.warn("Firestore getSpecimens error:", err);
    return [];
  }
}

/**
 * Upload an audio knock recording or watermelon photo to Firebase Storage
 */
export async function uploadMediaToFirebaseStorage(
  file: File | Blob,
  path: string = "recordings"
): Promise<{ url: string; fullPath: string }> {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storageRef = ref(storage, `${path}/${filename}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return {
    url: downloadUrl,
    fullPath: snapshot.ref.fullPath,
  };
}

/**
 * Sign in with Google using Firebase Authentication
 */
export async function signInWithFirebaseGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error("Firebase Google Sign-In error:", err);
    throw err;
  }
}

/**
 * Sign out from Firebase Authentication
 */
export async function signOutFromFirebase(): Promise<void> {
  await signOut(auth);
}
