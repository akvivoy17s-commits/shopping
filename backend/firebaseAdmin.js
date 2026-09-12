// import fs from "fs";
// import path from "path";

// import {
//   initializeApp,
//   cert,
//   getApps,
// } from "firebase-admin/app";

// import {
//   getFirestore,
// } from "firebase-admin/firestore";

// import {
//   getAuth,
// } from "firebase-admin/auth";

// import {
//   getMessaging,
// } from "firebase-admin/messaging";

// import { fileURLToPath } from "url";



// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // // Firebase Service Account JSON
// const serviceAccountPath = path.join(
//   __dirname,
//   "..",
//   "serviceAccountKey.json"
// );

// // =============================
// // READ SERVICE ACCOUNT
// // =============================

// if (!fs.existsSync(serviceAccountPath)) {
//   throw new Error(
//     `❌ Firebase service account file not found:\n${serviceAccountPath}`
//   );
// }

// const serviceAccount = JSON.parse(
//   fs.readFileSync(serviceAccountPath, "utf8")
// );

// // =============================
// // INITIALIZE FIREBASE ADMIN
// // =============================

// const firebaseApp =
//   getApps().length === 0
//     ? initializeApp({
//         credential: cert(serviceAccount),
//       })
//     : getApps()[0];

// // =============================
// // FIREBASE SERVICES
// // =============================

// export const db = getFirestore(firebaseApp);

// export const auth = getAuth(firebaseApp);

// export const messaging = getMessaging(firebaseApp);

// // =============================
// // FIREBASE ADMIN APP
// // =============================

// export { firebaseApp };

// // =============================
// // LOGS
// // =============================

// console.log("=================================");
// console.log("🔥 Firebase Admin initialized");
// console.log("🔥 Firestore initialized");
// console.log("🔥 Firebase Auth initialized");
// console.log("🔔 Firebase Cloud Messaging initialized");
// console.log("=================================");

// console.log("=================================");
// console.log("🔥 FIREBASE ADMIN PROJECT");
// console.log("Project ID:", serviceAccount.project_id);
// console.log("Client Email:", serviceAccount.client_email);
// console.log("=================================");






import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  initializeApp,
  cert,
  getApps,
} from "firebase-admin/app";

import {
  getFirestore,
} from "firebase-admin/firestore";

import {
  getAuth,
} from "firebase-admin/auth";

import {
  getMessaging,
} from "firebase-admin/messaging";

// =====================================================
// PATH
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// SERVICE ACCOUNT
// =====================================================

const serviceAccountPath = path.join(
  __dirname,
  "..",
  "serviceAccountKey.json"
);

console.log(
  "🔥 Service Account:",
  serviceAccountPath
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `❌ Firebase service account file not found:\n${serviceAccountPath}`
  );
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);

// =====================================================
// INITIALIZE FIREBASE ADMIN
// =====================================================

const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

// =====================================================
// FIREBASE SERVICES
// =====================================================

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const messaging = getMessaging(firebaseApp);

// =====================================================
// EXPORT
// =====================================================

export {
  firebaseApp,
  db,
  auth,
  messaging,
};

// =====================================================
// LOGS
// =====================================================

console.log("=================================");
console.log("🔥 Firebase Admin initialized");
console.log("🔥 Firestore initialized");
console.log("🔥 Firebase Auth initialized");
console.log("🔔 Firebase Cloud Messaging initialized");
console.log("=================================");

console.log("🔥 FIREBASE ADMIN PROJECT");
console.log("Project ID:", serviceAccount.project_id);
console.log("Client Email:", serviceAccount.client_email);
console.log("=================================");
