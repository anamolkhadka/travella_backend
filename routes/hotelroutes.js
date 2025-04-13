import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { db } from "../db/firebase.js";
dotenv.config();

const router = express.Router();
const TRIPADVISOR_API_HOST = "tripadvisor16.p.rapidapi.com";
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Hotel Search using TripAdvisor API
// This endpoint searches for hotels based on location and dates
router.get("/hotels/search", async (req, res) => {
    try {
        const { location, checkin_date, checkout_date, adults = 2 } = req.query;

        if (!location || !checkin_date || !checkout_date || !adults) {
            return res.status(400).json({ error: "Missing required query parameters" });
        }

        // First get the geoId for the location
        const geoResponse = await axios.get(
            `https://${TRIPADVISOR_API_HOST}/api/v1/hotels/searchLocation`,
            {
                params: {
                    query: location,
                },
                headers: {
                    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
                    "X-RapidAPI-Host": TRIPADVISOR_API_HOST,
                },
            }
        );

        const geoId = geoResponse.data?.data[0]?.geoId;
        if (!geoId) {
            return res.status(404).json({
                success: false,
                error: "Location not found",
                debug: geoResponse.data,
            });
        }

        // Now search hotels with the geoId
        const hotelsResponse = await axios.get(
            `https://${TRIPADVISOR_API_HOST}/api/v1/hotels/searchHotels`,
            {
                params: {
                    geoId,
                    checkIn: checkin_date,
                    checkOut: checkout_date,
                    adults: parseInt(adults),
                    currency: "USD",
                    lang: "en_US",
                    limit: 20,
                },
                headers: {
                    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
                    "X-RapidAPI-Host": TRIPADVISOR_API_HOST,
                },
            }
        );
        // Transform results and enhance with Google Places if needed
        const hotels = await Promise.all(
            hotelsResponse.data?.data?.data?.map(async (hotel) => {
                let enhancedInfo = {
                    id: hotel.id,
                    name: hotel.title,
                    price: hotel.priceForDisplay || "Price unavailable",
                    address: hotel.primaryInfo || "Address not available",
                    image: hotel.cardPhotos?.[0]?.sizes?.urlTemplate?.replace("{width}", "600") || null,
                    rating: hotel.bubbleRating?.rating || 0,
                    reviews: hotel.bubbleRating?.number || "0",
                    url: hotel.commerceInfo?.externalUrl || null,
                };

                // If address is missing or incomplete, try to get it from Google Places
                if (!enhancedInfo.address || enhancedInfo.address === "Address not available") {
                    try {
                        const placesResponse = await axios.get(
                            "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
                            {
                                params: {
                                    input: `${enhancedInfo.name}, ${location}`,
                                    inputtype: "textquery",
                                    fields: "formatted_address",
                                    key: GOOGLE_PLACES_API_KEY,
                                },
                            }
                        );

                        if (placesResponse.data?.candidates?.[0]?.formatted_address) {
                            enhancedInfo.address = placesResponse.data.candidates[0].formatted_address;
                        }
                    } catch (error) {
                        console.error("Google Places API error:", error.message);
                        // Continue with original address if Google Places fails
                    }
                }

                return enhancedInfo;
            }) || []
        );

        if (hotels.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No hotels found for these dates",
                debug: hotelsResponse.data,
            });
        }

        res.json({
            success: true,
            data: hotels,
            pagination: {
                total: hotels.length,
                limit: 20,
            },
        });

    } catch (error) {
        console.error("Hotel search error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: "Hotel search failed",
            details: error.response?.data?.message || error.message,
            ...(error.response?.data && { debug: error.response.data }),
        });
    }
});

// Create a new hotel booking
// This route does not check for API availability; it assumes the booking is successful.
router.post("/hotels/book", async (req, res) => {
    try {
        const {email, selectedHotel, guestDetails, checkInDate, checkOutDate, adults } = req.body;

        // 1. Input validation
        if (!email || !selectedHotel?.id || !guestDetails || !checkInDate || !checkOutDate) {
            return res.status(400).json({
                error: "Missing required fields: email, hotelId, guestDetails, dates"
            });
        }

        // 2. Verify user exists
        const userSnapshot = await db.collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            return res.status(404).json({ error: "User account not found" });
        }
        const userId = userSnapshot.docs[0].id;

        // 3. Create booking record (no API availability check)
        const bookingData = {
            userId,
            userEmail: email,
            hotel: {
                id: selectedHotel.id,
                name: selectedHotel.name,
                price: selectedHotel.price,
                image: selectedHotel.image,
                address: selectedHotel.address
            },
            dates: {
                checkIn: checkInDate,
                checkOut: checkOutDate
            },
            guests: guestDetails,
            status: "confirmed", // or "pending" for payments
            createdAt: new Date().toISOString()
        };

        // 4. Save to Firestore
        const bookingRef = await db.collection("hotelBookings").add(bookingData);

        // 5. Add to expenses collection for tracking
        const expenseData = {
            userId,
            amount: selectedHotel.price,
            category: "Hotel",
            vendor: selectedHotel.name,
            date: new Date().toISOString().split("T")[0], // Format date as YYYY-MM-DD
        };
        await db.collection("expenses").add(expenseData);

        res.status(201).json({
            success: true,
            bookingId: bookingRef.id,
            hotel: selectedHotel.name,
            dates: `${checkInDate} to ${checkOutDate}`,
            confirmationEmail: email
        });

    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({
            error: "Failed to complete booking",
            details: error.message
        });
    }
});

// Get all hotel bookings for a user
router.get("/hotels/bookings/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const bookingsSnapshot = await db.collection("hotelBookings")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        if (bookingsSnapshot.empty) {
            return res.status(200).json([]); // No bookings found
        }

        const bookings = bookingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(bookings);

    } catch (error) {
        console.error("Error fetching hotel bookings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;