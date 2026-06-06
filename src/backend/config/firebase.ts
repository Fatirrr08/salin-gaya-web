import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

// Firebase configuration — credentials managed via environment variables
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
