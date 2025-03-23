import express from "express";
import axios from 'axios';
import dotenv from 'dotenv';
import { db } from "../db/firebase.js";
dotenv.config();

// External FlightAware API service.
const FLIGHTAWARE_API_KEY = process.env.FLIGHT_API_KEY;
const FLIGHTAWARE_URL = process.env.FLIGHT_API_URL;
const webhookUrl = `${process.env.BACKEND_URL}/flight-alerts/webhook`; // e.g., https://yourdomain.com/flight-alerts/webhook. This is secure Public URL created from Ngrok.

const router = express.Router();

// POST /api/flight-alerts/create: Create a new flight alert
router.post('/create', async (req, res) => {
    const { ident, origin, destination, start, end, userId } = req.body;

    if (!ident || !start || !end || !origin || !destination || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const response = await axios.post(
            `${FLIGHTAWARE_URL}/alerts`,
            {
                ident,
                origin,
                destination,
                start,
                end,
                events: {
                    arrival: true,
                    departure: true,
                    cancelled: true,
                    diverted: true,
                },
                impending_arrival: [15],
                impending_departure: [15],
                target_url: webhookUrl,
            },
            {
                headers: {
                'x-apikey': FLIGHTAWARE_API_KEY,
                'Content-Type': 'application/json',
                },
            }
        );

        const alertId = response.headers.location;

        // Save to TrackedFlights collection
        await db.collection("TrackedFlights").add({
            ident,
            origin,
            destination,
            start,
            end,
            alertId,
            userId,
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({ message: 'Alert created', alertId: response.headers.location });
    } catch (error) {
        console.error('Create Alert Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// POST /flight-alerts/webhook: Webhook to receive alert updates from FlightAware
router.post('/webhook', async (req, res) => {
    try {
        const alertData = req.body;

        // Save alert to Firebase (Firestore collection: alerts)
        await db.collection('FlightAlerts').add({
        ...alertData,
        receivedAt: new Date().toISOString(),
        });

        res.status(200).json({ message: 'Flight Alert received and stored' });
    } catch (error) {
        console.error('Webhook Save Error:', error);
        res.status(500).json({ error: 'Failed to save alert' });
    }
  });

  // GET /api/flight-alerts: Get stored alerts from Firestore
router.get('/flight-alerts', async (req, res) => {
    try {
        const snapshot = await db.collection('alerts').orderBy('receivedAt', 'desc').get();
        const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(alerts);

    } catch (error) {
        console.error('Fetch Alerts Error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts from database' });
    }
});

// GET /api/flight-alerts/tracked/:userId: Get all flights a user is tracking
router.get("/tracked/:userId", async (req, res) => {
    try {
        const snapshot = await db
            .collection("TrackedFlights")
            .where("userId", "==", req.params.userId)
            .orderBy("createdAt", "desc")
            .get();

        const tracked = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(tracked);
    } catch (error) {
        console.error("Fetch Tracked Flights Error:", error);
        res.status(500).json({ error: "Failed to fetch tracked flights" });
    }
});

// DELETE /api/flight-alerts/:id: Delete a flight alert from FlightAware and Firebase
router.delete('/tracked/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'Alert ID is required' });
    }

    try {
        // 1. Delete from FlightAware
        await axios.delete(`${FLIGHTAWARE_URL}/alerts/${id}`, {
            headers: {
                'x-apikey': FLIGHTAWARE_API_KEY
            }
        });

        // 2. Delete from Firestore if it exists
        const snapshot = await db.collection('TrackedFlights').where('id', '==', id).get();
        const batch = db.batch();

        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        res.status(200).json({ message: `Flight alert with ID ${id} deleted` });
    } catch (error) {
        console.error('Delete Alert Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to delete flight alert' });
    }
});

export default router;