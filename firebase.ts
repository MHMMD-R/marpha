import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBvV-VAYyJHsYYk6UIuI1_6nfCUxmuaE8U",
  authDomain: "maraph-fcab7.firebaseapp.com",
  projectId: "maraph-fcab7",
  storageBucket: "maraph-fcab7.firebasestorage.app",
  messagingSenderId: "619008200445",
  appId: "1:619008200445:web:32f3ca4d9443b995f67894",
  measurementId: "G-8TPXY994NS",
};

type ReactNativePersistenceFactory = (
  storage: typeof AsyncStorage
) => NonNullable<Parameters<typeof FirebaseAuth.initializeAuth>[1]>["persistence"];

const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence?: ReactNativePersistenceFactory;
  }
).getReactNativePersistence;

let app: FirebaseApp;
let authInstance: Auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  const persistence = getReactNativePersistence?.(AsyncStorage);
  authInstance = persistence
    ? FirebaseAuth.initializeAuth(app, { persistence })
    : FirebaseAuth.getAuth(app);
} else {
  app = getApp();
  authInstance = FirebaseAuth.getAuth(app);
}

export { app };
export const auth = authInstance;

export const db = getFirestore(app);
export const storage = getStorage(app);
