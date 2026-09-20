import {
  initializeApp,
  cert,
  getApps,
} from "firebase-admin/app";
import dotenv from "dotenv";
import path from "path";

import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

// This module is imported before server.mjs can run dotenv.config(), because
// ESM imports are evaluated before the importing module's body. Load the
// project environment here so the Firebase credential is always available.
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const requiredFirebaseVariables = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const missingFirebaseVariables = requiredFirebaseVariables.filter(
  (variable) => !process.env[variable],
);

if (missingFirebaseVariables.length > 0) {
  throw new Error(
    `Missing Firebase Admin environment variable(s): ${missingFirebaseVariables.join(", ")}. ` +
      "Add them to the .env file in the project root.",
  );
}

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

