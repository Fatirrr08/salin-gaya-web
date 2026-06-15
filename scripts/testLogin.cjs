const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyDI2-t9dNqypGm8mau9tKwE3s3dRytb8hw",
  authDomain: "impal-ce890.firebaseapp.com",
  projectId: "impal-ce890",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testLogin() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "admin@salingaya.com", "Salin-gaya#1");
    console.log("SUCCESS! Logged in as:", userCredential.user.uid);
    process.exit(0);
  } catch (error) {
    console.error("FAILED TO LOGIN:", error.message);
    process.exit(1);
  }
}

testLogin();
