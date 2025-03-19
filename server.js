import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { admin, db } from './db/firebase.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import itineraryRoutes from './routes/itineraryRoutes.js';
import authenticateUser from './middleware/authMiddleware.js'; // Moved middleware to a separate file
import travelUpdatesRoutes from './routes/travelUpdatesRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Allow Cross-Origin Requests

// Routes
app.use('/auth', authRoutes); // Authentication Routes
app.use('/users', authenticateUser, userRoutes); // Protected User Routes
app.use('/itinerary', authenticateUser, itineraryRoutes); // Protected Itinerary Routes
app.use('/travel-updates', travelUpdatesRoutes); // Travel Updates Routes

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on PORT ${PORT}`);
});