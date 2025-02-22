import admin from "firebase-admin";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

// Read the Firebase service account JSON file path from .env
const serviceAccount = JSON.parse(readFileSync(process.env.FIREBASE_ADMIN_SDK_PATH, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

export { admin, db };
