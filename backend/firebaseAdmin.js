import {
  initializeApp,
  cert,
  getApps,
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

let firebaseApp;

if (getApps().length === 0) {
  firebaseApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        .replace(/\\n/g, "\n")
        .replace(/^"|"$/g, ""),
    }),
  });
} else {
  firebaseApp = getApps()[0];
}

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const messaging = getMessaging(firebaseApp);

export {
  firebaseApp,
  db,
  auth,
  messaging,
};

console.log("=================================");
console.log("🔥 Firebase Admin initialized");
console.log("🔥 Firestore initialized");
console.log("🔥 Firebase Auth initialized");
console.log("🔔 Firebase Messaging initialized");
console.log("=================================");
