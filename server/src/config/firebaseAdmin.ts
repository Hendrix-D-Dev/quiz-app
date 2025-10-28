// server/src/config/firebaseAdmin.ts
import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { debugLogger } from "../utils/debugLogger.js";


const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
const databaseURL = process.env.FIREBASE_DATABASE_URL;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

debugLogger("firebaseAdmin", {
  step: "env-check",
  projectId: projectId ? "✓" : "✗",
  clientEmail: clientEmail ? "✓" : "✗", 
  privateKey: privateKey ? "✓" : "✗",
  storageBucket: storageBucket ? "✓" : "✗"
});

if (!projectId || !clientEmail || !privateKey) {
  debugLogger("firebaseAdmin", {
    step: "missing-env",
    projectId,
    clientEmail,
    privateKeyExists: !!privateKey,
  });

  throw new Error(
    "Missing Firebase environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
  );
}

// Fix formatting issues that commonly appear when embedding private keys in .env
// - Remove surrounding quotes if present
// - Replace literal "\n" sequences with real newlines
privateKey = privateKey.replace(/^"(.*)"$/s, "$1").replace(/\\n/g, "\n");

// Defensive initialization (avoid "already exists" error when running tests / hot reload)
if (!admin.apps.length) {
  const credential = {
    projectId,
    clientEmail,
    privateKey,
  } as admin.ServiceAccount;

  try {
    admin.initializeApp({
      credential: admin.credential.cert(credential),
      storageBucket: storageBucket || undefined,
      databaseURL: databaseURL || undefined,
    });
    debugLogger("firebaseAdmin", { step: "initialized" });
    
    // Test Firestore connection
    const testDb = admin.firestore();
    await testDb.listCollections(); // This will throw if connection fails
    debugLogger("firebaseAdmin", { step: "firestore-connected" });
    
  } catch (err: any) {
    debugLogger("firebaseAdmin", { 
      step: "init-error", 
      error: err?.message || err,
      code: err?.code 
    });
    throw err;
  }
} else {
  debugLogger("firebaseAdmin", { step: "already-initialized" });
}

// Exports for other modules
const db: Firestore = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const bucket = storage.bucket(storageBucket || "");

// Test results collection exists
try {
  const collections = await db.listCollections();
  const collectionNames = collections.map(col => col.id);
  debugLogger("firebaseAdmin", { 
    step: "collections-check",
    collections: collectionNames,
    hasResults: collectionNames.includes('results')
  });
} catch (err: any) {
  debugLogger("firebaseAdmin", { 
    step: "collections-check-failed", 
    error: err.message 
  });
}

export { admin, db, auth, storage, bucket };