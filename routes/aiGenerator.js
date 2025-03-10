import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// External AI generator service.
// Generates a travel itinerary based on user preferences.
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


export const generateAIItinerary = async (preferences, destination, startDate, endDate) => {
    try {
        // Ensure required preference fields exist
        const travelStyle = preferences.style || "general";
        const budgetLevel = preferences.budget || "moderate";

        // Make OpenAI API request
        const response = await axios.post(
            OPENAI_URL,
            {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are an intelligent travel assistant that generates detailed trip itineraries based on user preferences. Always respond in valid JSON format."
                    },
                    {
                        role: "user",
                        content: `Create a ${travelStyle} travel itinerary for ${destination} from ${startDate} to ${endDate} with a ${budgetLevel} budget.
                        The response **must be in strict JSON format**, like this:
                        {
                            "itinerary": {
                                "dates": {
                                    "start": "${startDate}",
                                    "end": "${endDate}"
                                },
                                "activities": [
                                    { "day": 1, "activity": "Visit the Eiffel Tower", "location": "Paris", "cost": "$30" },
                                    { "day": 2, "activity": "Explore the Louvre Museum", "location": "Paris", "cost": "$20" }
                                ]
                            }
                        }
                        **Do not include any explanation** before or after the JSON.
                        🚨 **Important Instruction:** 🚨
                        **If the response exceeds ${300} tokens, remove the last day(s) instead of truncating the JSON mid-way. Ensure all brackets are properly closed.**`
                    }
                ],
                temperature: 0.7,
                max_tokens: 300,
                response_format: { "type": "json_object"},
            },
            {
                headers: { 
                    "Authorization": `Bearer ${OPENAI_API_KEY}`, 
                    "Content-Type": "application/json" 
                }
            }
        );

        // Extract AI response (which should be valid JSON)
        const itineraryData = response.data.choices[0]?.message?.content;
        console.log(itineraryData);

        // Handle JSON parsing errors and response truncation.
        const parsedData = handleResponse(itineraryData);
        console.log(parsedData);
        
        if (parsedData) {
            console.log("Parsed JSON:", parsedData);
            return parsedData.itinerary.activities;
        } else {
            console.log("Failed to parse the response.");
            return [];
        }

    } catch (error) {
        console.error("AI Generation Error:", error.response?.data || error.message);
        return [];
    }
};

// // Fix truncated JSON by trimming and closing brackets.
function handleResponse(response) {
    // Check if the response is a valid JSON structure
    try {
        const data = JSON.parse(response);
        return data;
    } catch (error) {
        // Attempt to fix the truncated JSON
        const lastCommaIndex = response.lastIndexOf(",");
        if (lastCommaIndex !== -1) {
            response = response.substring(0, lastCommaIndex); // Remove the last incomplete object
            response += "}]}}"; // Close the JSON structure
            try {
                const data = JSON.parse(response);
                return data;
            } catch (error) {
                console.error("Failed to parse truncated JSON.");
                return null;
            }
        } else {
            console.error("Failed to parse truncated JSON.");
            return null;
        }
    }
}
