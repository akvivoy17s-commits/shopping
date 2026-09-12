
import { initializeApp } from "firebase/app";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import { GoogleAuthProvider } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import {
  getMessaging,
  isSupported,
} from "firebase/messaging";

// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyBukbb9PfRJtjLP2VZfmzft2uQi6NGRI9g",
  authDomain: "shopping-ef95f.firebaseapp.com",
  projectId: "shopping-ef95f",
  storageBucket: "shopping-ef95f.firebasestorage.app",
  messagingSenderId: "507169408834",
  appId: "1:507169408834:web:0cd505d281aacc3a352adb",
  measurementId: "G-YBR1FT66QQ",
};

// =====================================================
// INITIALIZE FIREBASE
// =====================================================

export const app = initializeApp(firebaseConfig);

// =====================================================
// AUTH
// =====================================================

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase Auth persistence enabled");
  })
  .catch((error) => {
    console.error(
      "Firebase persistence error:",
      error
    );
  });

// =====================================================
// FIRESTORE
// =====================================================

export const db = getFirestore(app);

// =====================================================
// GOOGLE AUTH
// =====================================================

export const googleProvider =
  new GoogleAuthProvider();

// =====================================================
// FIREBASE CLOUD MESSAGING
// =====================================================

export const getFirebaseMessaging = async () => {
  try {
    const supported = await isSupported();

    if (!supported) {
      console.warn(
        "Firebase Messaging is not supported in this browser."
      );

      return null;
    }

    return getMessaging(app);
  } catch (error) {
    console.error(
      "Firebase Messaging initialization error:",
      error
    );

    return null;
  }
};

export default app;