import express from "express";
import { db, itinerarySchema } from "../db/firebase.js";
import { generateAIItinerary } from "./aiGenerator.js";

const router = express.Router();

// Create a new itinerary
router.post("/create", async (req, res) => {
    try {
        const { userId, destination, startDate, endDate, preferences, activities = [] } = req.body;

        if (!userId || !destination || !startDate || !endDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newItinerary = {
            userId,
            destination,
            startDate,
            endDate,
            preferences,
            activities
        };

        const itineraryRef = await db.collection("itineraries").add(newItinerary);
        res.status(201).json({ message: "Itinerary created", id: itineraryRef.id });
    } catch (error) {
        res.status(500).json({ error: "Error creating itinerary" });
    }
});

// Get itineraries for a user
router.get("/user/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const snapshot = await db.collection("itineraries").where("userId", "==", userId).get();

        if (snapshot.empty) {
            return res.status(404).json({ message: "No itineraries found" });
        }

        const itineraries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(itineraries);
    } catch (error) {
        res.status(500).json({ error: "Error fetching itineraries" });
    }
});

// Update an itinerary
router.put("/update/:id", async (req, res) => {
    try {
        const itineraryId = req.params.id;
        const updates = req.body;

        // Ensure only valid fields from schema are updated
        const validUpdates = Object.keys(updates).reduce((acc, key) => {
            if (key in itinerarySchema) {
                acc[key] = updates[key];
            }
            return acc;
        }, {});

        await db.collection("itineraries").doc(itineraryId).update(validUpdates);
        res.status(200).json({ message: "Itinerary updated" });
    } catch (error) {
        res.status(500).json({ error: "Error updating itinerary" });
    }
});

// Delete an itinerary
router.delete("/delete/:id", async (req, res) => {
    try {
        const itineraryId = req.params.id;
        await db.collection("itineraries").doc(itineraryId).delete();
        res.status(200).json({ message: "Itinerary deleted" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting itinerary" });
    }
});

// AI-Generated Itinerary
router.post("/generate", async (req, res) => {
    try {
        const { userId, destination, startDate, endDate, preferences } = req.body;

        if (!userId || !destination || !startDate || !endDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Generate itinerary using AI
        const aiGeneratedActivities = await generateAIItinerary(preferences, destination, startDate, endDate);

        // Create the itinerary object
        const newItinerary = {
            userId,
            destination,
            startDate,
            endDate,
            preferences,
            activities: aiGeneratedActivities
        };

        // Save itinerary to Firestore
        const itineraryRef = await db.collection("itineraries").add(newItinerary);

        res.status(201).json({ message: "AI-generated itinerary created", id: itineraryRef.id, activities: aiGeneratedActivities });
    } catch (error) {
        res.status(500).json({ error: "Error generating itinerary" });
    }
});

export default router;
