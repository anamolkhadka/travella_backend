import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/firebase.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const SALT_ROUNDS = 10;

// User Registration
router.post("/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password, location } = req.body;

        // Check if user already exists
        const usersRef = db.collection("users").where("email", "==", email);
        const snapshot = await usersRef.get();
        if (!snapshot.empty) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Store user in Firestore
        const newUser = {
            firstName,
            lastName,
            email,
            password: hashedPassword, // Store hashed password
            location,
            createdAt: new Date(),
        };
        const userRef = await db.collection("users").add(newUser);
        const userId = userRef.id; // Firestore-generated ID

        res.status(201).json({ message: "User registered successfully", userId });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// User Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user in Firestore
        const usersRef = db.collection("users").where("email", "==", email);
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Get user data
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id; // Firestore document ID

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { uid: userId, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "1h" } // Default to 1 hour
        );

        res.json({ message: "Login successful", token, userId });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// JWT is stateless. Tell the frontend to delete the token.
router.post("/logout", (req, res) => {
    res.json({ message: "User logged out successfully" });
});

export default router;