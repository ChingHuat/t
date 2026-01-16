
import { GoogleGenAI } from "@google/genai";

/**
 * Provides general transit advice using Gemini 3 Flash.
 */
export const getSmartTransitAdvice = async (query: string, context: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `As a Singapore Transit Expert, answer the following query: "${query}". Context of current bus arrivals: ${context}. Keep it concise for a mobile user.`,
  });
  return response.text;
};

/**
 * Computes a travel route in Singapore using Gemini 2.5 Flash Lite and Google Maps grounding.
 * Returns steps separated by " ---> " as expected by the Planner UI.
 * 
 * Maps grounding is only supported in Gemini 2.5 series models.
 */
export const getSmartRoute = async (origin: string, destination: string, prefs: string[], lat?: number, lng?: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct a prompt optimized for sequence parsing in the UI (PlannerPage.tsx)
  const prompt = `Plan a trip in Singapore from ${origin || 'my current location'} to ${destination}. 
  Preferences: ${prefs.join(', ')}. 
  Format the output strictly as a single string of steps separated by " ---> ". 
  Example: "Walk to Bus Stop 12345 ---> Take Bus 190 to Orchard Stn ---> Walk to Destination".
  Keep each step description concise. Do not include any introductory or concluding conversational text.`;

  // Maps grounding configuration - mandatory for navigation-related queries
  const config: any = {
    tools: [{ googleMaps: {} }],
  };

  // Include user location if available for better grounding and proximity detection
  if (lat !== undefined && lng !== undefined) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: lat,
          longitude: lng
        }
      }
    };
  }

  // Use Gemini 2.5 Flash Lite as it supports Google Maps grounding and is efficient for text tasks
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt,
    config,
  });

  return {
    text: response.text || '',
    // Extract grounding chunks to provide direct navigation links in the UI
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};
