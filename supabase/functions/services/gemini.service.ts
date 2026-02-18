import { GoogleGenerativeAI } from "npm:@google/generative-ai";

export type DetectionMethod = "image" | "symptom";

export interface DiseaseAnalysisRequest {
  method: DetectionMethod;
  imageBase64?: string | null;
  symptoms?: string[] | null;
}

export interface TreatmentOption {
  name: string;
  pricePerUnit: number;
  unit: string;
  dosagePerAcre: number;
  description: string;
}

export interface ApplicationStep {
  step: string;
  timing?: string;
}

export interface DiseaseAnalysisResponse {
  disease_name: string;
  confidence: "low" | "medium" | "high" | string;
  severity: "low" | "medium" | "high" | string;
  description: string;
  symptoms: string[];
  treatments: TreatmentOption[];
  applicationGuide: ApplicationStep[];
  preventionTips: string[];
  [key: string]: unknown;
}

const MODEL_ID = "gemini-1.5-flash";

export async function generateJsonFromPrompt(
  prompt: string,
  apiKey: string,
  modelId: string = MODEL_ID,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function analyzeDiseaseWithGemini(
  payload: DiseaseAnalysisRequest,
  apiKey: string,
): Promise<DiseaseAnalysisResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_ID });

  const { method, imageBase64, symptoms } = payload;

  if (method === "image" && imageBase64) {
    const prompt = `You are an expert agricultural plant pathologist. Analyze this leaf image and identify any plant diseases present.

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

    const base64Data = imageBase64.startsWith("data:")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
    ]);

    const text = result.response.text();
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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseDiseaseJson(text);
  }

  throw new Error("Invalid request: must provide either imageBase64 or symptoms");
}

function parseDiseaseJson(text: string): DiseaseAnalysisResponse {
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
    console.error("Failed to parse Gemini response as JSON:", error, text);

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

