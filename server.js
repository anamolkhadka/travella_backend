import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { admin, db } from './db/firebase.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import itineraryRoutes from './routes/itineraryRoutes.js';
import travelUpdatesRoutes from './routes/travelUpdatesRoutes.js';
import flightAlertRoutes from './routes/flightAlertRoutes.js';
import authenticateUser from './middleware/authMiddleware.js';
import bookingRoutes from './routes/bookingroutes.js';
import recommendRoutes from './routes/recommendRoutes.js';
import hotelroutes from './routes/hotelroutes.js';
import expenseTrackingRoutes from './routes/expenseTrackingRoutes.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isTestEnv = process.env.NODE_ENV === 'test';

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
// Allow requests from the frontend (React app) to the backend (Express app)
app.use(cors({
    origin: 'http://localhost:4000', // Frontend origin
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'], // Must include 'Authorization'
}));

// Routes. Use authenticateUser if not in test environment. Skip for test environment.
const authenticate = isTestEnv ? (req, res, next) => next() : authenticateUser;
app.use('/auth', authRoutes); // Authentication Routes
app.use('/users', authenticate, userRoutes); // Protected User Routes
app.use('/itinerary', authenticate, itineraryRoutes); // Protected Itinerary Routes
app.use('/travel-updates', travelUpdatesRoutes); // Travel and weather Updates Routes
///app.use('/flight-alerts', authenticateUser, flightAlertRoutes); // Flight Alert Routes. Implemented but not used in the project because of the FlightAware API limitations.
app.use('/api/booking', authenticate, bookingRoutes);
app.use('/api/recommend', authenticate, recommendRoutes);
app.use('/api/hotel', authenticate, hotelroutes);
app.use('/api/expense', authenticate, expenseTrackingRoutes); // Expense Tracking Routes

// Export the app for testing
export default app;

// Only start the server if this file is run directly (not imported)
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on PORT ${PORT}`);
    });
}
