import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDI2-t9dNqypGm8mau9tKwE3s3dRytb8hw",
  authDomain: "impal-ce890.firebaseapp.com",
  databaseURL: "https://impal-ce890-default-rtdb.firebaseio.com",
  projectId: "impal-ce890",
  storageBucket: "impal-ce890.firebasestorage.app",
  messagingSenderId: "868138414622",
  appId: "1:868138414622:web:a693a5079d83131992740f",
  measurementId: "G-61LFLD4KVC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Initialize Realtime Database and get a reference to the service
export const db = getDatabase(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);
