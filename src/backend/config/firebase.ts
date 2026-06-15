import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

// ─────────────────────────────────────────────────────────────────────────────
// PENTING: ARSITEKTUR MULTI-PROJECT FIREBASE
// ─────────────────────────────────────────────────────────────────────────────
// Aplikasi ini menggunakan dua proyek Firebase yang terpisah demi keamanan & performa:
// 1. Proyek `salin-gaya`  : Dikhususkan untuk Firebase Hosting (Front-end Web)
// 2. Proyek `impal-ce890` : Dikhususkan untuk Backend (Auth, Firestore, Realtime DB, Storage)
//
// Konfigurasi di bawah ini terhubung ke backend `impal-ce890`. Semua data (produk,
// pengguna, chat, ulasan) disimpan di sana. 
// Jika Anda perlu memperbarui *Rules* (Database/Firestore/Storage), pastikan 
// untuk mendepoy ke project `impal-ce890`.
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDI2-t9dNqypGm8mau9tKwE3s3dRytb8hw",
  authDomain: "impal-ce890.firebaseapp.com",
  databaseURL: "https://impal-ce890-default-rtdb.firebaseio.com",
  projectId: "impal-ce890",
  storageBucket: "impal-ce890.firebasestorage.app",
  messagingSenderId: "868138414622",
  appId: "1:868138414622:web:a693a5079d83131992740f",
  measurementId: "G-61LFLD4KVC",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Firebase Realtime Database
export const db = getDatabase(app);

// Firebase Firestore
export const dbFirestore = getFirestore(app);

// Firebase Cloud Storage
export const storage = getStorage(app);
