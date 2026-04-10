import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCCs8S4Xzbt5xi-ZbKGNe8mIRB_4dwvKA4",
  authDomain: "marpha-app-58291.firebaseapp.com",
  projectId: "marpha-app-58291",
  storageBucket: "marpha-app-58291.firebasestorage.app",
  messagingSenderId: "616512386880",
  appId: "1:616512386880:web:afe2ef0f39addb9c7aaca5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
