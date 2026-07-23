import { initializeApp, applicationDefault, App } from "firebase-admin/app";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import { getStorage, Storage } from "firebase-admin/storage";
import { getDatabase, ServerValue } from "firebase-admin/database";
import { logger } from "./lib/utils.js";

// Initialize Firebase Admin with Application Default Credentials
const app: App = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "dreambees-alchemist",
    databaseURL: process.env.RTDB_URL
});

logger.info(`[FirebaseInit] Initialized with project:`, { projectId: app.options.projectId });

const db: Firestore = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

export { db, FieldValue, getFunctions, getStorage, getDatabase, ServerValue };
