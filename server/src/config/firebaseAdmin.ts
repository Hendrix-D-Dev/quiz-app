// server/src/config/firebaseAdmin.ts
import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { debugLogger } from "../utils/debugLogger.js";

/**
 * Firebase Admin initialization (TypeScript)
 * - Ensures the PRIVATE_KEY is formatted correctly
 * - Initializes Firestore and Storage
 * - Exports db, auth, storage, bucket
 */

// Load env vars - NEW PROJECT
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
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
let db: Firestore, auth: any, storage: any, bucket: any;

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
    });
    debugLogger("firebaseAdmin", { step: "initialized" });
    
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

// Initialize Firebase services
db = admin.firestore();
auth = admin.auth();
storage = admin.storage();
bucket = storage.bucket(storageBucket || "");

// ✅ Simple connection test that won't crash
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    debugLogger("firebaseAdmin", { step: "testing-connection" });
    
    // Simple test - try to get a non-existent document
    const testDoc = db.collection("_test").doc("connection");
    await testDoc.get(); // This should work even if collection doesn't exist
    
    debugLogger("firebaseAdmin", { step: "firestore-connected" });
    return true;
  } catch (error: any) {
    debugLogger("firebaseAdmin", { 
      step: "connection-test-failed", 
      error: error.message,
      code: error.code,
      note: "Firestore might not be enabled in your Firebase project" 
    });
    return false;
  }
}

export { admin, db, auth, storage, bucket };