// Modular v9+ Firebase imports from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Manual Firebase configuration object (no /__/firebase/init.json dependency)
const firebaseConfig = {
  apiKey: "AIzaSyBzG7S0AcPmmDacywAv5PjQAHrbvHmrMGE",
  authDomain: "student-assistant-16d10.firebaseapp.com",
  projectId: "student-assistant-16d10",
  storageBucket: "student-assistant-16d10.appspot.com",
  messagingSenderId: "16943551989",
  appId: "1:16943551989:web:02270265e0efae24327cbc"
};

// Initialize Firebase app and services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
export { onAuthStateChanged };
