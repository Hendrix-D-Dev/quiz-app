// server/src/config/firebaseAdmin.ts
import dotenv from "dotenv";
dotenv.config();
import admin from "firebase-admin";
import { debugLogger } from "../utils/debugLogger.js";
/**
 * Firebase Admin initialization (TypeScript)
 * - Ensures the PRIVATE_KEY is formatted correctly
 * - Initializes Firestore and Storage
 * - Exports db, auth, storage, bucket
 */
// Load env vars
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
const databaseURL = process.env.FIREBASE_DATABASE_URL;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
if (!projectId || !clientEmail || !privateKey) {
    debugLogger
        ? debugLogger("firebaseAdmin", {
            step: "missing-env",
            projectId,
            clientEmail,
            privateKeyExists: !!privateKey,
        })
        : console.error("❌ Missing Firebase environment variables:", {
            projectId,
            clientEmail,
            privateKeyExists: !!privateKey,
        });
    throw new Error("Missing Firebase environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
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
    };
    try {
        admin.initializeApp({
            credential: admin.credential.cert(credential),
            storageBucket: storageBucket || undefined,
            databaseURL: databaseURL || undefined,
        });
        debugLogger?.("firebaseAdmin", { step: "initialized" });
    }
    catch (err) {
        debugLogger?.("firebaseAdmin", { step: "init-error", error: err?.message || err });
        throw err;
    }
}
else {
    debugLogger?.("firebaseAdmin", { step: "already-initialized" });
}
// Exports for other modules
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const bucket = storage.bucket(storageBucket || "");
export { admin, db, auth, storage, bucket };
