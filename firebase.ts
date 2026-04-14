import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
// @ts-ignore: getReactNativePersistence is valid at runtime in RN but missing in types
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCCs8S4Xzbt5xi-ZbKGNe8mIRB_4dwvKA4",
  authDomain: "marpha-app-58291.firebaseapp.com",
  projectId: "marpha-app-58291",
  storageBucket: "marpha-app-58291.firebasestorage.app",
  messagingSenderId: "616512386880",
  appId: "1:616512386880:web:afe2ef0f39addb9c7aaca5",
};

let app;
let authInstance;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  authInstance = getAuth(app);
}

export { app };
export const auth = authInstance;

export const db = getFirestore(app);
export const storage = getStorage(app);
