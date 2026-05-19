// ============================================================
// Auth Service — Firebase Authentication business logic
// All auth-related Firebase calls are centralized here.
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { ref, set, get, child } from "firebase/database";
import { auth, db, googleProvider, facebookProvider } from "@/backend/config/firebase";

export type UserRole = "Pembeli" | "Penjual" | "Admin";

/**
 * Register a new user with email & password.
 * Creates a user record in Firebase Realtime Database with the given role.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  role: UserRole = "Pembeli"
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  await set(ref(db, `users/${user.uid}`), {
    uid: user.uid,
    name,
    email,
    role,
    createdAt: Date.now(),
  });
  return user;
}

/**
 * Sign in with email & password.
 */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

/**
 * Sign in with Google OAuth popup.
 * Creates a user record in RTDB if it does not already exist.
 */
export async function loginWithGoogle(): Promise<User> {
  const { user } = await signInWithPopup(auth, googleProvider);
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, `users/${user.uid}`));
  if (!snapshot.exists()) {
    await set(ref(db, `users/${user.uid}`), {
      uid: user.uid,
      name: user.displayName || "User",
      email: user.email,
      role: "Pembeli",
      createdAt: Date.now(),
    });
  }
  return user;
}

/**
 * Sign in with Facebook OAuth popup.
 * Creates a user record in RTDB if it does not already exist.
 */
export async function loginWithFacebook(): Promise<User> {
  const { user } = await signInWithPopup(auth, facebookProvider);
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, `users/${user.uid}`));
  if (!snapshot.exists()) {
    await set(ref(db, `users/${user.uid}`), {
      uid: user.uid,
      name: user.displayName || "User",
      email: user.email,
      role: "Pembeli",
      createdAt: Date.now(),
    });
  }
  return user;
}

/**
 * Get user data (including role) from RTDB.
 */
export async function getUserData(uid: string) {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, `users/${uid}`));
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return null;
}

/**
 * Sign out the current user.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}
