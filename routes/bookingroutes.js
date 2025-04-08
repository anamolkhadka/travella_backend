import pkg from "flights";
const { searchFlights } = pkg;
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { db } from "../db/firebase.js";
import Amadeus from "amadeus";

dotenv.config();
const router = express.Router();
///const BOOKING_API_HOST = "booking-com15.p.rapidapi.com";

// This endpoint is used to search for flights based on the provided parameters
// Note the flights origin and destination are IATA codes.
// Example: "LAX" for Los Angeles International Airport, "JFK" for John F. Kennedy International Airport
// Link: http://www.iata.org/publications/Pages/code-search.aspx
router.get("/flights/search", async (req, res) => {
    try {
        const { origin, destination, departureDate, adults } = req.query;

        if (!origin || !destination || !departureDate || !adults) {
            return res.status(400).json({ error: "Missing required query parameters" });
        }

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

        if (!response.result || !response.result.data) {
            return res.status(500).json({ error: "Invalid response from Amadeus API" });
        }

        // Process flight offers to include formatted flight numbers
        const processedData = response.result.data.map(offer => {
            const itineraries = offer.itineraries.map(itinerary => {
                const segments = itinerary.segments.map(segment => ({
                    ...segment,
                    flightNumber: `${segment.carrierCode} ${segment.number}`, // Add formatted flight number
                }));
                return {
                    ...itinerary,
                    segments,
                };
            });
            return {
                ...offer,
                itineraries,
            };
        });

        res.status(200).json({
            pagination: {
                limit: 100,
                offset: 0,
                count: processedData.length,
                total: response.result.meta?.count || 0,
            },
            data: processedData,
        });

    } catch (error) {
        console.error("❌ Error fetching flight offers:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch flight offers" });
    }
});

// This endpoint is used to book a flight based on the provided parameters.
router.post("/flights/book", async (req, res) => {
    try {
        const { email, selectedFlight, passengerDetails } = req.body;

        if (!email || !selectedFlight || !passengerDetails) {
            return res.status(400).json({ error: "Missing required booking details" });
        }

        const userSnapshot = await db.collection("users").where("email", "==", email).get();
        if (userSnapshot.empty) {
            return res.status(404).json({ error: "User not found" });
        }

        const userId = userSnapshot.docs[0].id;
        const newFlightBooking = {
            userId,
            selectedFlight,
            passengerDetails,
            bookedAt: new Date().toISOString(),
            status: "confirmed",
            confirmationCode: `TRVL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        };

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
                    iata: selectedFlight.flight.iata,
                    fullNumber: `${selectedFlight.airline.iata} ${selectedFlight.flight.number}`, // <-- Added formatted flight number
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