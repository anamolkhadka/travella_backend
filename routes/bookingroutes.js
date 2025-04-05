import pkg from "flights";
const { searchFlights } = pkg; // Importing from the flights package using CommonJS compatibility

import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { db } from "../db/firebase.js";
import Amadeus from "amadeus";

dotenv.config(); // Load environment variables

const router = express.Router();

// Note the flights origin and destination are IATA codes.
// Example: "LAX" for Los Angeles International Airport, "JFK" for John F. Kennedy International Airport
// Link: http://www.iata.org/publications/Pages/code-search.aspx
router.get("/flights/search", async (req, res) => {
    try {
        const { origin, destination, departureDate, adults } = req.query;

        if (!origin || !destination || !departureDate || !adults) {
            return res.status(400).json({ error: "Missing required query parameters" });
        }

        // Initialize Amadeus API
        const amadeus = new Amadeus({
            clientId: process.env.AMADEUS_CLIENT_ID,
            clientSecret: process.env.AMADEUS_CLIENT_SECRET,
        });

        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate,
            adults,
        });

        console.log("✅ Amadeus API Response:", response.result); // Log the full response

        if (!response.result || !response.result.data) {
            return res.status(500).json({ error: "Invalid response from Amadeus API" });
        }

        res.status(200).json({
            pagination: {
                limit: 100,
                offset: 0,
                count: response.result.data.length,
                total: response.result.meta?.count || 0, // Ensure 'count' exists
            },
            data: response.result.data,
        });

    } catch (error) {
        console.error("❌ Error fetching flight offers:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch flight offers" });
    }
});

router.post("/flights/book", async (req, res) => {
    try {
        const { email, selectedFlight, passengerDetails } = req.body;

        if (!email || !selectedFlight || !passengerDetails) {
            return res.status(400).json({ error: "Missing required booking details" });
        }

        // 🔍 Lookup user by email in Firebase
        const userSnapshot = await db.collection("users").where("email", "==", email).get();
        if (userSnapshot.empty) {
            return res.status(404).json({ error: "User not found" });
        }

        const userId = userSnapshot.docs[0].id; // Extract Firebase user ID


        // Create the new flight booking object
        const newFlightBooking = {
            userId,
            selectedFlight,
            passengerDetails,
            bookedAt: new Date().toISOString(),
            status: "confirmed", // Simulated status
            confirmationCode: `TRVL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        };

        // ✅ Store booking in Firestore
        const flightBookingRef = await db.collection("flightBookings").add(newFlightBooking);

        res.status(201).json({
            pagination: {
                limit: 1,
                offset: 0,
                count: 1,
                total: 1
            },
            data: {
                booking_id: flightBookingRef.id,
                flight_date: selectedFlight.departureDate,
                flight_status: "confirmed",
                confirmation_code: newFlightBooking.confirmationCode,
                departure: {
                    airport: selectedFlight.departure.airport,
                    iata: selectedFlight.departure.iata,
                    scheduled: selectedFlight.departure.scheduled
                },
                arrival: {
                    airport: selectedFlight.arrival.airport,
                    iata: selectedFlight.arrival.iata,
                    scheduled: selectedFlight.arrival.scheduled
                },
                airline: {
                    name: selectedFlight.airline.name,
                    iata: selectedFlight.airline.iata
                },
                flight: {
                    number: selectedFlight.flight.number,
                    iata: selectedFlight.flight.iata
                },
                passengers: passengerDetails,
                price: selectedFlight.priceDetails
            }
        });
    } catch (error) {
        console.error("❌ Error booking flight:", error);
        res.status(500).json({ error: "Error booking flight" });
    }
});



export default router;