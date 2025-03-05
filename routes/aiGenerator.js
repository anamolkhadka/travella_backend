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

        // Convert JSON string to JavaScript object
        return JSON.parse(itineraryData)?.itinerary?.activities || [];

    } catch (error) {
        console.error("AI Generation Error:", error.response?.data || error.message);
        return [];
    }
};

// // Fix truncated JSON by trimming and closing brackets.
// const fixTruncatedJSON = (jsonString) => {
//     try {
//         return JSON.parse(jsonString); // Try parsing normally
//     } catch (error) {
//         console.warn("⚠️ Truncated JSON detected. Attempting to fix...");

//         let fixedJson = jsonString.trim();

//         // Find the last valid bracket
//         let lastCurlyBracket = fixedJson.lastIndexOf("}");
//         let lastSquareBracket = fixedJson.lastIndexOf("]");
        
//         // Pick the last valid position
//         let lastValidIndex = Math.max(lastCurlyBracket, lastSquareBracket);
//         if (lastValidIndex === -1) {
//             console.error("❌ JSON is too corrupted to fix.");
//             return { itinerary: { activities: [] } }; // Return empty itinerary
//         }

//         // Trim everything after the last valid bracket
//         fixedJson = fixedJson.substring(0, lastValidIndex + 1);

//         // Ensure proper closure
//         if (fixedJson.endsWith(",")) {
//             fixedJson = fixedJson.slice(0, -1); // Remove trailing comma
//         }
//         if (!fixedJson.endsWith("}")) {
//             fixedJson += "}";
//         }

//         try {
//             return JSON.parse(fixedJson);
//         } catch (e) {
//             console.error("❌ Final Fix Failed:", e.message);
//             return { itinerary: { activities: [] } };
//         }
//     }
// };
