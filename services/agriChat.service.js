import { generateGroqText } from "./vision.service.js";

const SYSTEM_PROMPT = `You are an agricultural expert assistant. Answer only agriculture-related questions including crops, soil, fertilizers, irrigation, pests, diseases, weather farming guidance, and market selling tips. If the user asks anything unrelated to agriculture, politely respond: "I can assist only with agriculture-related questions." Provide concise farmer-friendly responses.`;

export async function generateAgriChatResponse(userMessage) {
  const fullPrompt = `${SYSTEM_PROMPT}

User question: ${userMessage}

Provide a helpful agriculture-focused response:`;

  const response = await generateGroqText(fullPrompt);
  return response.trim();
}
