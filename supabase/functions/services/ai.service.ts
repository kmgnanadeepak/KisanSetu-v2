import {
  analyzeDiseaseWithGemini,
  type DiseaseAnalysisRequest,
  type DiseaseAnalysisResponse,
  generateJsonFromPrompt,
} from "./gemini.service.ts";

export async function analyzeDisease(
  payload: DiseaseAnalysisRequest,
  apiKey: string,
): Promise<DiseaseAnalysisResponse> {
  return analyzeDiseaseWithGemini(payload, apiKey);
}

export interface CropRecommendations {
  recommendations: {
    title: string;
    category: string;
    reason: string;
    listing_id?: string;
    priority: "high" | "medium" | "low" | string;
  }[];
  seasonal_tip: string;
}

export async function generateCropRecommendations(
  prompt: string,
  apiKey: string,
): Promise<CropRecommendations> {
  const text = await generateJsonFromPrompt(
    `${prompt}

Return ONLY a JSON object in the following format:
{
  "recommendations": [
    {
      "title": "Product or crop name",
      "category": "Category",
      "reason": "Why this is recommended",
      "listing_id": "optional listing id from the list above",
      "priority": "high" | "medium" | "low"
    }
  ],
  "seasonal_tip": "One paragraph seasonal tip"
}

The response must be valid JSON with no extra commentary.`,
    apiKey,
  );

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in model response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      seasonal_tip: parsed.seasonal_tip ?? "",
    };
  } catch (error) {
    console.error("Failed to parse crop recommendations JSON:", error, text);
    return {
      recommendations: [],
      seasonal_tip: "",
    };
  }
}

// Placeholders for future AI-powered helpers, implemented through Gemini.
export async function generatePrescription() {
  throw new Error("generatePrescription is not implemented yet.");
}

export async function generateMarketAdvice() {
  throw new Error("generateMarketAdvice is not implemented yet.");
}

export async function generateSmartFarmingTips() {
  throw new Error("generateSmartFarmingTips is not implemented yet.");
}

