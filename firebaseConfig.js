import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDxsYUThMEOKu1JFyp9-5DGpWKsq57KY3k",
  authDomain: "localhands-275dd.firebaseapp.com",
  projectId: "localhands-275dd",
  storageBucket: "localhands-275dd.firebasestorage.app",
  messagingSenderId: "175132500108",
  appId: "1:175132500108:web:2f6be7d98a8d58761d5ba9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);