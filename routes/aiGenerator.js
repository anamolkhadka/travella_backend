import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// External AI generator service.
// Generates a travel itinerary based on user preferences.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // 3 RPM rate limit.

export const generateAIItinerary = async (preferences, destination, startDate, endDate) => {
    try {
        // Ensure required preference fields exist
        const travelStyle = preferences.style || "general";
        const budgetLevel = preferences.budget || "moderate";

        const response = await axios.post(
            "https://api.openai.com/v1/completions",
            {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are an intelligent travel assistant that generates detailed trip itineraries based on user preferences."
                    },
                    {
                        role: "user",
                        content: `Create a ${travelStyle} travel itinerary for ${destination} from ${startDate} to ${endDate} with a ${budgetLevel} budget.
                        Include key places, recommended activities, and food suggestions in JSON format like this:
                        {
                            "activities": [
                                { "day": 1, "activity": "Visit the Eiffel Tower", "location": "Paris", "cost": "$30" },
                                { "day": 2, "activity": "Explore the Louvre Museum", "location": "Paris", "cost": "$20" }
                            ]
                        }`
                    }
                ],
                max_tokens: 500
            },
            {
                headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` }
            }
        );

        // Extract and format AI response
        const rawText = response.data.choices[0].message.content;

        // Parse response into JSON format
        const itineraryData = JSON.parse(rawText);

        return itineraryData.activities || [];
    } catch (error) {
        console.error("AI Generation Error:", error);
        return [];
    }
};
