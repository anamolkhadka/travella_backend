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

// Utility functions
const formatFlightNumber = (carrierCode, number) => `${carrierCode} ${number}`;

const formatResponse = (data, pagination = {}) => {
    return {
        pagination: {
            limit: pagination.limit || data.length,
            offset: pagination.offset || 0,
            count: data.length,
            total: pagination.total || data.length,
            ...pagination
        },
        data
    };
};

const validatePassengerDetails = (details) => {
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'gender'];
    return requiredFields.every(field => details[field]);
};


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
                    flightNumber: formatFlightNumber(segment.carrierCode, segment.number),
                }));
                return {
                    ...itinerary,
                    segments,
                };
            });

            return {
                ...offer,
                itineraries,
                formattedPrice: {
                    ...offer.price,
                    formattedTotal: `${offer.price.currency} ${offer.price.total}`
                }
            };
        });

        res.status(200).json(formatResponse(
            processedData,
            {
                limit: 100,
                total: response.result.meta?.count || processedData.length
            }
        ));

    } catch (error) {
        console.error("❌ Error fetching flight offers:", error.response?.data || error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || "Failed to fetch flight offers";
        res.status(status).json({
            error: message,
            details: status === 500 ? undefined : error.response?.data?.errors
        });
    }
});

// This endpoint is used to book a flight based on the provided parameters.
router.post("/flights/book", async (req, res) => {
    try {
        const { email, selectedFlight, passengerDetails } = req.body;

        if (!email || !selectedFlight || !passengerDetails) {
            return res.status(400).json({
                error: "Missing required booking details",
                required: ["email", "selectedFlight", "passengerDetails"]
            });
        }

        if (!validatePassengerDetails(passengerDetails)) {
            return res.status(400).json({
                error: "Invalid passenger details",
                requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'gender']
            });
        }

        const userSnapshot = await db.collection("users").where("email", "==", email).get();
        if (userSnapshot.empty) {
            return res.status(404).json({ error: "User not found" });
        }

        const userId = userSnapshot.docs[0].id;
        const confirmationCode = `TRVL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const newFlightBooking = {
            userId,
            selectedFlight: {
                ...selectedFlight,
                formattedFlightNumber: formatFlightNumber(
                    selectedFlight.airline.iata,
                    selectedFlight.flight.number
                )
            },
            passengerDetails,
            bookedAt: new Date().toISOString(),
            status: "confirmed",
            confirmationCode,
        };

        const flightBookingRef = await db.collection("flightBookings").add(newFlightBooking);

        // Enhanced booking response
        const bookingResponse = {
            booking_id: flightBookingRef.id,
            flight_date: selectedFlight.departureDate,
            flight_status: "confirmed",
            confirmation_code: confirmationCode,
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
                fullNumber: formatFlightNumber(
                    selectedFlight.airline.iata,
                    selectedFlight.flight.number
                ),
            },
            itinerary: selectedFlight.itineraries?.map(it => ({
                duration: it.duration,
                segments: it.segments?.map(seg => ({
                    departure: seg.departure,
                    arrival: seg.arrival,
                    carrier: seg.carrierCode,
                    flightNumber: seg.flightNumber,
                    duration: seg.duration
                }))
            })) || [],
            passengers: passengerDetails,
            price: selectedFlight.priceDetails,
            amenities: selectedFlight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.amenities || []
        };

        res.status(201).json(formatResponse(
            bookingResponse,
            { limit: 1, total: 1 }
        ));

    } catch (error) {
        console.error("❌ Error booking flight:", error);
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || "Error booking flight";
        res.status(status).json({
            error: message,
            details: status === 500 ? undefined : error.response?.data?.errors
        });
    }
});
export default router;