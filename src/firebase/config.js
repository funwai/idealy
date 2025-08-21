import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC_qyQ4VU45-viqtTs1q-9jUlzIWuW4-VM",
  authDomain: "funwai-resume.firebaseapp.com",
  projectId: "funwai-resume",
  storageBucket: "funwai-resume.appspot.com",
  messagingSenderId: "707951290380",
  appId: "1:707951290380:web:45734edfd9d09e26d32629",
  measurementId: "G-8N6NBTDP4Y"
};

// Only initialize if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
