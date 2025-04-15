import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Fetch recommendations based on city/location
router.get('/city/:location', async (req, res) => {
    const { location } = req.params;

    // Validate location parameter
    if (!location) {
        return res.status(400).json({ error: 'Location is required' });
    }
    // Fetch recommendations using Google Places API
    try {
        const placesResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params: {
                query: `restaurants, attractions, and events in ${location}`,
                key: GOOGLE_MAPS_API_KEY
            }
        });
        res.json(placesResponse.data.results);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching recommendations' });
    }
});

// Fetch recommendations based on user preferences
router.post('/user-preferences', async (req, res) => {
    const { location, preferences } = req.body;// Example: "vegan restaurants and museums"

    // Validate request body
    if (!location || !preferences) {
        return res.status(400).json({ error: 'Location and preferences are required' });
    }
    // Validate preferences format.
    // Convert preferences from an array to a comma-separated string
    const query = preferences ? preferences.replace(/\s*,\s*/g, ' and ') : '';

    try {
        const placesResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params: {
                query: `${query} in ${location}`,
                key: GOOGLE_MAPS_API_KEY
            }
        });
        res.json(placesResponse.data.results);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching personalized recommendations' });
    }
});

export default router;
