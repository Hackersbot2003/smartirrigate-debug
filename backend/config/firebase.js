const admin = require("firebase-admin");

let db = null;

function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.database();
    console.log("[Firebase] Already initialized, reusing existing app");
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  console.log("[Firebase] Initializing with:");
  console.log("  PROJECT_ID:   ", process.env.FIREBASE_PROJECT_ID || "❌ MISSING");
  console.log("  CLIENT_EMAIL: ", process.env.FIREBASE_CLIENT_EMAIL || "❌ MISSING");
  console.log("  DATABASE_URL: ", process.env.FIREBASE_DATABASE_URL || "❌ MISSING");
  console.log("  PRIVATE_KEY:  ", privateKey ? `✅ present (${privateKey.length} chars)` : "❌ MISSING");

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = admin.database();
    console.log("✅ Firebase Admin SDK connected");
    console.log("   DB URL:", process.env.FIREBASE_DATABASE_URL);
  } catch (err) {
    console.error("❌ Firebase initializeApp FAILED:", err.message);
    throw err;
  }
}

function getDb() {
  if (!db) {
    console.warn("[Firebase] getDb() called before initFirebase() — initializing now");
    initFirebase();
  }
  return db;
}

module.exports = { initFirebase, getDb };
