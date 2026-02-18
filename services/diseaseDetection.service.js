import { analyzePlantDisease, generateGroqText } from "./vision.service.js";

export async function analyzeDisease(payload) {
  const { method, imageBase64, symptoms } = payload;

  if (method === "image" && imageBase64) {
    const prompt = `You are an expert agricultural plant pathologist analyzing a crop leaf image for Indian farmers. 

Analyze the image and return ONLY a JSON object in the following format:
{
  "disease_name": "Name of the detected disease",
  "confidence": "high" | "medium" | "low",
  "severity": "low" | "medium" | "high",
  "description": "Brief description of the disease",
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

The response must be valid JSON with no extra commentary. Tailor recommendations for Indian farmers.`;

    const text = await analyzePlantDisease(imageBase64, prompt);
    return parseDiseaseJson(text);
  }

  if (method === "symptom" && symptoms && symptoms.length > 0) {
    const prompt = `You are an expert agricultural plant pathologist. Based on the following symptoms observed by a farmer, identify the most likely plant disease and provide guidance.

Observed symptoms: ${symptoms.join(", ")}

Analyze this information and return ONLY a JSON object in the following format:
{
  "disease_name": "Most likely disease name",
  "confidence": "medium",
  "severity": "low" | "medium" | "high",
  "description": "Brief description of the probable disease",
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
  "preventionTips": ["tip1", "tip2"],
  "note": "This is preliminary guidance based on symptoms only. For accurate diagnosis, please submit a leaf image."
}

The response must be valid JSON with no extra commentary and should be practical for Indian farmers.`;

    const text = await generateGroqText(prompt);
    return parseDiseaseJson(text);
  }

  throw new Error("Invalid request: must provide either imageBase64 or symptoms");
}

function parseDiseaseJson(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in model response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      disease_name: parsed.disease_name ?? "Analysis Pending",
      confidence: parsed.confidence ?? "low",
      severity: parsed.severity ?? "medium",
      description: parsed.description ?? "No description available.",
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
      applicationGuide: Array.isArray(parsed.applicationGuide) ? parsed.applicationGuide : [],
      preventionTips: Array.isArray(parsed.preventionTips) ? parsed.preventionTips : [],
      ...parsed,
    };
  } catch (error) {
    console.error("Failed to parse AI response as JSON:", error, text);

    return {
      disease_name: "Analysis Pending",
      confidence: "low",
      severity: "medium",
      description: "Unable to parse AI response. Please try again.",
      symptoms: [],
      treatments: [],
      applicationGuide: [],
      preventionTips: [],
    };
  }
}
