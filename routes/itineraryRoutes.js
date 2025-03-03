import express from "express";
import { db, itinerarySchema } from "../db/firebase.js";

const router = express.Router();

// Create a new itinerary
router.post("/create", async (req, res) => {
    try {
        // Extract itinerary data from request body
        const itineraryData = req.body;

        // Validate required fields using itinerarySchema
        const newItinerary = { ...itinerarySchema, ...itineraryData };

        // Ensure required fields are not empty
        if (!newItinerary.userId || !newItinerary.destination || !newItinerary.startDate || !newItinerary.endDate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Store the new itinerary in Firestore
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

export default router;
