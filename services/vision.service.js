import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Unified GROQ model supporting both text and vision
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

/**
 * Analyze plant disease from image using GROQ Vision
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @param {string} prompt - Analysis prompt
 * @returns {Promise<string>} AI response text
 */
export async function analyzePlantDisease(base64Image, prompt) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  // Clean base64 string (remove data URI prefix if present)
  const base64Data = base64Image.startsWith("data:")
    ? base64Image.split(",")[1]
    : base64Image;

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("GROQ Vision API error:", error);
    throw new Error("AI vision service temporarily unavailable");
  }
}

/**
 * Generate text response using GROQ (for symptom-based analysis)
 * @param {string} prompt - Text prompt
 * @returns {Promise<string>} AI response text
 */
export async function generateGroqText(prompt) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("GROQ Text API error:", error);
    throw new Error("AI service temporarily unavailable");
  }
}
