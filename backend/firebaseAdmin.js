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

// =====================================================
// FIREBASE ADMIN INITIALIZATION
// =====================================================

let firebaseApp;

if (getApps().length === 0) {
  // ===================================================
  // PRODUCTION / RENDER
  // ===================================================

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.log("🔥 Initializing Firebase Admin from ENV...");

    firebaseApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,

        clientEmail:
          process.env.FIREBASE_CLIENT_EMAIL,

        privateKey:
          process.env.FIREBASE_PRIVATE_KEY.replace(
            /\\n/g,
            "\n"
          ),
      }),
    });

    console.log("✅ Firebase Admin initialized from ENV");
  }

  // ===================================================
  // LOCAL DEVELOPMENT
  // ===================================================

  else {
    console.log(
      "🔥 Firebase ENV not found. Trying local serviceAccountKey.json..."
    );

    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const serviceAccountPath = path.join(
      __dirname,
      "..",
      "serviceAccountKey.json"
    );

    console.log(
      "🔥 Local Service Account:",
      serviceAccountPath
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        `❌ Firebase credentials not found.\n\n` +
        `For Render, add FIREBASE_PROJECT_ID, ` +
        `FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY ` +
        `Environment Variables.\n\n` +
        `For local development, make sure serviceAccountKey.json exists.`
      );
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(
        serviceAccountPath,
        "utf8"
      )
    );

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });

    console.log(
      "✅ Firebase Admin initialized from local JSON"
    );
  }
}

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
console.log("🔥 Firebase Admin ready");
console.log("🔥 Firestore ready");
console.log("🔥 Firebase Auth ready");
console.log("🔔 Firebase Messaging ready");
console.log("=================================");
