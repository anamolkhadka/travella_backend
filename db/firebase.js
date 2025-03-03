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

// Define the schema for the itinerary collection
const itinerarySchema = {
  userId: "",         // User ID
  destination: "",    // Travel destination
  startDate: "",      // Start date of trip
  endDate: "",        // End date of trip
  preferences: {},    // User-selected preferences
  activities: []      // User provided or AI-generated activities
};

export { admin, db, itinerarySchema };
