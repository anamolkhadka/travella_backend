import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// External Open Weather API service.
const TRAVEL_UPDATES_URL = process.env.WEATHER_API_URL;
const TRAVEL_UPDATES_API_KEY = process.env.WEATHER_API_KEY;

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

export default router;