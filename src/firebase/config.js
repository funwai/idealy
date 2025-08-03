// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";           // ✅ IMPORT THIS
import { getFirestore } from "firebase/firestore"; // ✅ AND THIS
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_qyQ4VU45-viqtTs1q-9jUlzIWuW4-VM",
  authDomain: "funwai-resume.firebaseapp.com",
  projectId: "funwai-resume",
  storageBucket: "funwai-resume.firebasestorage.app",
  messagingSenderId: "707951290380",
  appId: "1:707951290380:web:45734edfd9d09e26d32629",
  measurementId: "G-8N6NBTDP4Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);