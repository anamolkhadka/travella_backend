    import pkg from "flights";
    const { searchFlights } = pkg; // Importing from the flights package using CommonJS compatibility

    import express from "express";
    import axios from "axios";
    import dotenv from "dotenv";
    import { db } from "../db/firebase.js";
    import Amadeus from "amadeus";

    dotenv.config(); // Load environment variables

    const router = express.Router();



    // ------------------ HOTEL BOOKING ROUTES ------------------

    // Hotel Search using Google Places API
    router.get("/hotels/search", async (req, res) => {
        try {
            const { destination } = req.query;

            if (!destination) {
                return res.status(400).json({ error: "Missing required query parameter: destination" });
            }

            const googlePlacesResponse = await axios.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                {
                    params: {
                        query: `hotels in ${destination}`,
                        key: process.env.GOOGLE_PLACES_API_KEY,
                    },
                }
            );

            res.status(200).json({ hotels: googlePlacesResponse.data.results });
        } catch (error) {
            console.error("Error fetching hotels from Google Places API:", error.response?.data || error.message);
            res.status(500).json({ error: "Failed to fetch hotel listings" });
        }
    });

    // Create a new hotel booking
    router.post("/hotels/book", async (req, res) => {
        try {
            const { email, selectedHotel, guestDetails } = req.body;

            if (!email || !selectedHotel || !guestDetails) {
                return res.status(400).json({ error: "Missing required booking details" });
            }

            // 🔍 Lookup user by email in Firebase
            const userSnapshot = await db.collection("users").where("email", "==", email).get();
            if (userSnapshot.empty) {
                return res.status(404).json({ error: "User not found" });
            }

            const userId = userSnapshot.docs[0].id; // Extract Firebase user ID

            const newHotelBooking = {
                userId,
                selectedHotel,
                guestDetails,
                bookedAt: new Date().toISOString(),
            };

            // ✅ Store booking in Firestore
            const hotelBookingRef = await db.collection("hotelBookings").add(newHotelBooking);
            res.status(201).json({ message: "Hotel booking created", id: hotelBookingRef.id });
        } catch (error) {
            console.error("Error booking hotel:", error);
            res.status(500).json({ error: "Error booking hotel" });
        }
    });


    export default router;