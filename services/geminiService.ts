
import { GoogleGenAI } from "@google/genai";

export const getSmartTransitAdvice = async (query: string, context: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `As a Singapore Transit Expert, answer the following query: "${query}". Context of current bus arrivals: ${context}. Keep it concise for a mobile user.`,
  });
  return response.text;
};
