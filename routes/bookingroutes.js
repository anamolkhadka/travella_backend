import express from "express";
import dotenv from "dotenv";
import Amadeus from "amadeus";
import { db } from "../db/firebase.js";

dotenv.config();
const router = express.Router();

// Initialize Amadeus client
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

// Utility to fetch airline name
const airlineNameCache = {};

const fetchAirlineName = async (iataCode) => {
    if (airlineNameCache[iataCode]) {
        return airlineNameCache[iataCode]; // return from cache
    }

    try {
        const res = await amadeus.referenceData.airlines.get({ airlineCodes: iataCode });
        ///console.log(`✈️ Response for ${iataCode}:`, res?.data);

        const airlineData = res.data?.[0];
        const name = airlineData?.businessName || airlineData?.commonName || "Unknown";
        airlineNameCache[iataCode] = name; // cache result
        return name;
    } catch (err) {
        console.error(`Could not fetch airline name for ${iataCode}:`, err.response?.data || err.message);
        return "Unknown";
    }
};
  
// =======================
// GET /flights/search
// =======================
router.get("/flights/search", async (req, res) => {
    const { origin, destination, departureDate, adults = 1 } = req.query;
  
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ error: "Missing required parameters." });
    }
  
    try {
      const response = await amadeus.shopping.flightOffersSearch.get({
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate,
        adults,
      });
  
      const flights = response?.result?.data || [];
  
      const formatted = await Promise.all(flights.map(async (flight) => {
        const airlineCode = flight.validatingAirlineCodes?.[0] ||
                            flight.itineraries?.[0]?.segments?.[0]?.carrierCode || "N/A";
  
        const airlineName = await fetchAirlineName(airlineCode);
  
        return {
          id: flight.id,
          itineraries: flight.itineraries,
          price: flight.price,
          validatingAirline: airlineCode,
          numberOfBookableSeats: flight.numberOfBookableSeats,
          airline: {
            iata: airlineCode,
            name: airlineName
          }
        };
      }));
  
      res.json({ count: formatted.length, data: formatted });
    } catch (err) {
      console.error("Flight Search Error:", err);
      res.status(500).json({ error: "Flight search failed." });
    }
});

// =======================
// POST /flights/book
// =======================
router.post("/flights/book", async (req, res) => {
    const { email, selectedFlight, passengerDetails } = req.body;

    if (!email || !selectedFlight || !passengerDetails) {
        return res.status(400).json({ error: "Missing email, selected flight, or passenger details." });
    }

    try {
        const userSnapshot = await db.collection("users").where("email", "==", email).get();
        if (userSnapshot.empty) return res.status(404).json({ error: "User not found." });

        const userId = userSnapshot.docs[0].id;
        const confirmationCode = `TRVL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const bookedAt = new Date().toISOString();

        const itinerary = selectedFlight.itineraries?.[0];
        const firstSegment = itinerary?.segments?.[0];

        const airlineCode = selectedFlight.validatingAirlineCodes?.[0] || firstSegment?.carrierCode || "N/A";
        const airlineName = await fetchAirlineName(airlineCode);

        const flightInfo = {
            airline: {
                iata: airlineCode,
                name: airlineName
            },
            flightNumber: `${airlineCode} ${firstSegment?.number}`,
            duration: itinerary?.duration || "N/A",
            departure: {
                airport: firstSegment?.departure?.iataCode || "N/A",
                time: firstSegment?.departure?.at || "N/A",
                terminal: firstSegment?.departure?.terminal || "N/A"
            },
            arrival: {
                airport: firstSegment?.arrival?.iataCode || "N/A",
                time: firstSegment?.arrival?.at || "N/A",
                terminal: firstSegment?.arrival?.terminal || "N/A"
            },
            aircraft: firstSegment?.aircraft?.code || "N/A",
            segments: itinerary?.segments?.map(seg => ({
                departure: {
                    airport: seg.departure.iataCode,
                    time: seg.departure.at
                },
                arrival: {
                    airport: seg.arrival.iataCode,
                    time: seg.arrival.at
                },
                duration: seg.duration,
                flightNumber: `${seg.carrierCode} ${seg.number}`,
                aircraft: seg.aircraft?.code || "N/A"
            })) || [],
            price: {
                total: selectedFlight.price.total,
                base: selectedFlight.price.base,
                taxes: (parseFloat(selectedFlight.price.total) - parseFloat(selectedFlight.price.base)).toFixed(2),
                currency: selectedFlight.price.currency
            }
        };

        const bookingData = {
            userId,
            userEmail: email,
            confirmationCode,
            bookedAt,
            status: "confirmed",
            flightInfo,
            passengerDetails
        };

        const bookingRef = await db.collection("flightBookings").add(bookingData);

        const expenseData = {
            userId,
            amount:`${selectedFlight.price.currency} ${selectedFlight.price.total}`,
            category: "Flight",
            vendor: airlineName,
            date: bookedAt.split("T")[0], // Format date as YYYY-MM-DD
        };

        await db.collection("expenses").add(expenseData);

        res.status(201).json({
            success: true,
            bookingId: bookingRef.id,
            confirmationCode,
            flightInfo,
            passengerDetails,
            bookedAt
        });

    } catch (error) {
        console.error("Flight Booking Error:", error);
        res.status(500).json({ error: "Booking failed." });
    }
});

// ==============================
// GET /flights/bookings/:userId
// ==============================
router.get("/flights/bookings/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const snapshot = await db
            .collection("flightBookings")
            .where("userId", "==", userId)
            .orderBy("bookedAt", "desc")
            .get();

        if (snapshot.empty) return res.status(200).json([]);

        const bookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(bookings);
    } catch (err) {
        console.error("Error fetching flight bookings:", err);
        res.status(500).json({ error: "Failed to fetch flight bookings." });
    }
});

export default router;
