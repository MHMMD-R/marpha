import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvV-VAYyJHsYYk6UIuI1_6nfCUxmuaE8U",
  authDomain: "maraph-fcab7.firebaseapp.com",
  projectId: "maraph-fcab7",
  storageBucket: "maraph-fcab7.firebasestorage.app",
  messagingSenderId: "619008200445",
  appId: "1:619008200445:web:32f3ca4d9443b995f67894",
  measurementId: "G-8TPXY994NS",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

const secondaryApp = getApps().find((app) => app.name === "Secondary")
  ? getApp("Secondary")
  : initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
export const secondaryDb = getFirestore(secondaryApp);
