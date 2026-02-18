import { generateGroqText } from "./vision.service.js";

/**
 * Generate crop advisory based on voice/text query
 * Used by Voice Assistant for general farming questions
 */
export async function generateAdvisory(query) {

  const prompt = `You are an expert agricultural advisor helping Indian farmers. A farmer has asked: "${query}"

Provide helpful, practical advice tailored for Indian farming conditions. If the query seems to be about crop disease or symptoms, analyze it as a symptom-based disease detection.

Return ONLY a JSON object in the following format:
{
  "disease_name": "Most likely disease name (if applicable)",
  "confidence": "medium",
  "severity": "low" | "medium" | "high",
  "description": "Brief description of the probable disease or issue",
  "symptoms": ["symptom1", "symptom2"],
  "treatments": [
    {
      "name": "Treatment product name",
      "pricePerUnit": 500,
      "unit": "kg",
      "dosagePerAcre": 2.5,
      "description": "How to apply"
    }
  ],
  "applicationGuide": [
    { "step": "Step description", "timing": "When to do it" }
  ],
  "preventionTips": ["tip1", "tip2"]
}

The response must be valid JSON with no extra commentary. Be practical and specific for Indian farmers.`;

  try {
    const text = await generateGroqText(prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in model response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      disease_name: parsed.disease_name ?? "Crop Issue",
      confidence: parsed.confidence ?? "medium",
      severity: parsed.severity ?? "medium",
      description: parsed.description ?? "No description available.",
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
      applicationGuide: Array.isArray(parsed.applicationGuide) ? parsed.applicationGuide : [],
      preventionTips: Array.isArray(parsed.preventionTips) ? parsed.preventionTips : [],
      ...parsed,
    };
  } catch (error) {
    console.error("Failed to generate advisory:", error);
    throw error;
  }
}
