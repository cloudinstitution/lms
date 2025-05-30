// lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBINi3FAULAkmL7lPg6ENyhcaSzI6MRTSo",
  authDomain: "lms12-feae0.firebaseapp.com",
  projectId: "lms12-feae0",
  storageBucket: "lms12-feae0.appspot.com", // small typo fixed here too
  messagingSenderId: "799740847882",
  appId: "1:799740847882:web:7c4e1a267cb8e813373cf3",
  measurementId: "G-NMZMTP7WHR"
};

// ✅ Export app so it can be used elsewhere
export const app = initializeApp(firebaseConfig);

// Exports for Firestore and Storage
export const db = getFirestore(app);
export const storage = getStorage(app);
