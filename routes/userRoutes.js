import express from 'express';
import { db } from '../db/firebase.js';

const router = express.Router();


// Get User Data (Protected Route)
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id; // Extract user ID from URL params

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: "User not found" });
        }

        const userData = userDoc.data();
        
        res.status(200).json({
            id: userId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            location: userData.location,
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update User Data (Protected Route)
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params; // Extract user ID from URL
        const updates = req.body; // Get the fields to update

        // Reference to the user document in Firestore
        const userRef = db.collection("users").doc(id);

        // Update only the fields provided in `req.body`
        await userRef.update(updates);

        res.status(200).json({ message: "User updated successfully", updates });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;