import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { admin, db } from './db/firebase.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
<<<<<<< HEAD
import itineraryRoutes from './routes/itineraryRoutes.js';
import authenticateUser from './middleware/authMiddleware.js'; // Moved middleware to a separate file
import travelUpdatesRoutes from './routes/travelUpdatesRoutes.js';
import flightAlertRoutes from './routes/flightAlertRoutes.js';
=======
import authenticateUser from './middleware/authMiddleware.js';
import bookingRoutes from './routes/bookingRoutes.js';
import recomondRoutes from './routes/rcemondRoutes.js';
import hotelroutes from './routes/hotelroutes.js';

>>>>>>> 4bb15ec (Implement Flights and Hotel Booking System)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
<<<<<<< HEAD
app.use('/auth', authRoutes); // Authentication Routes
app.use('/users', authenticateUser, userRoutes); // Protected User Routes
app.use('/itinerary', authenticateUser, itineraryRoutes); // Protected Itinerary Routes
app.use('/travel-updates', travelUpdatesRoutes); // Travel and weather Updates Routes
///app.use('/flight-alerts', authenticateUser, flightAlertRoutes); // Flight Alert Routes. Implemented but not used in the project because of the FlightAware API limitations.
=======
app.use('/auth', authRoutes);
app.use('/users', authenticateUser, userRoutes);
app.use('/api/booking', authenticateUser, bookingRoutes);
app.use('/api/recomond', authenticateUser, recomondRoutes);
app.use('/api/hotel', authenticateUser, hotelroutes);
>>>>>>> 4bb15ec (Implement Flights and Hotel Booking System)

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on PORT ${PORT}`);
});
