import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// External Open Weather API service.
const TRAVEL_UPDATES_URL = process.env.WEATHER_API_URL;
const TRAVEL_UPDATES_API_KEY = process.env.WEATHER_API_KEY;
// External FlightAware API service.
const FLIGHTAWARE_API_KEY = process.env.FLIGHT_API_KEY;
const FLIGHTAWARE_URL = process.env.FLIGHT_API_URL;

const router = express.Router();

// Get weather updates for a specific location. City, Country Code (refer to ISO 3166) are required.
router.post("/weather", async (req, res) => {
    try {
        const { city, country } = req.body;

        if (!city || !country) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const response = await axios.get(
            TRAVEL_UPDATES_URL,
            {
                params: {
                    q: `${city},${country}`,
                    units: "metric",
                    appid: TRAVEL_UPDATES_API_KEY
                }
            }
        );

        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Error fetching weather updates" });
    }
});

// POST route to get flight updates based on flight number, date, from, and to locations.
// The route will return all flights that match the given flight number, date, from, and to locations.
router.post('/flight', async (req, res) => {
    const { flightNumber, date, from, to } = req.body;

    if (!flightNumber || !date || !from || !to) {
        return res.status(400).json({ error: "Missing required fields: flightNumber, date, from, or to" });
    }

    try {
        const response = await axios.get(`${FLIGHTAWARE_URL}/flights/${flightNumber}`, {
            headers: {
                'x-apikey': FLIGHTAWARE_API_KEY
            },
            params: {
                ident_type: 'designator',
                start: `${date}T00:00:00Z`,
                end: `${date}T23:59:59Z`,
                max_pages: 1
            }
        });

        const flights = response.data?.flights || [];
        console.log(flights);

        if (!flights || flights.length === 0) {
            return res.status(404).json({ message: "No matching flights found for the given route." });
        }
        res.status(200).json({ flights });

    } catch (error) {
        console.error("Flight API Error:", error.response?.data || error.message);
        return res.status(500).json({ error: "Failed to fetch flight information." });
    }
});

export default router;