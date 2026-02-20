import { analyzePlantDisease, generateGroqText } from "./vision.service.js";
import { enrichTreatmentsWithPricing } from "./pricingService.js";

// ---------- constants ----------
const CONFIDENCE_THRESHOLD = 65;
const BANNED_WORDS = ["human", "skin", "face", "person", "animal"];

// ---------- Stage 1: Image Validation ----------

const IMAGE_VALIDATION_PROMPT = `You are a strict agricultural image classifier.
Determine whether the image contains a clear plant leaf or crop suitable for disease analysis.

Rules:
- If the image does NOT contain a plant leaf or crop, return ONLY:
  { "isPlant": false }
- If it DOES contain a plant leaf or crop, return ONLY:
  { "isPlant": true }

Do not guess.
Return valid JSON only.
No explanations.`;

async function validatePlantImage(imageBase64) {
  const text = await analyzePlantDisease(imageBase64, IMAGE_VALIDATION_PROMPT);

  try {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON in validation response");
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.isPlant === true;
  } catch (err) {
    console.warn("[Stage-1] Failed to parse validation response:", err.message, text);
    return false;
  }
}

// ---------- Stage 2: Disease Detection ----------

const DISEASE_DETECTION_PROMPT = `You are an agricultural plant disease expert AI.

Analyze the plant leaf image and return ONLY valid JSON:

{
  "disease": "Disease name or Unknown",
  "confidence": <number 0-100>,
  "disease_name": "Disease name or Unknown",
  "severity": "low" | "medium" | "high",
  "description": "Brief description of the disease",
  "symptoms": ["symptom1", "symptom2"],
  "recommendedChemicals": [
    {
      "name": "Chemical name",
      "dosagePerAcre": "e.g., 500 ml per acre"
    }
  ],
  "applicationGuide": [
    { "step": "Step description", "timing": "When to do it" }
  ],
  "preventionTips": ["tip1", "tip2"]
}

STRICT RULES:
- If unsure, set disease to "Unknown"
- Do NOT guess
- Do NOT return explanations
- Do NOT generate price
- Do NOT generate cost
- Do NOT generate savings
- Do NOT generate financial values
- Return valid JSON only
- Tailor recommendations for Indian farmers`;

// ---------- Safety Filters ----------

function applySafetyFilters(parsed) {
  const confidence = Number(parsed.confidence);
  if (!Number.isNaN(confidence) && confidence < CONFIDENCE_THRESHOLD) {
    console.warn(`[Safety] Low confidence (${confidence}). Rejected.`);
    return {
      rejected: true,
      error: "Low confidence detection. Please upload a clearer plant leaf image.",
    };
  }

  const diseaseLower = String(parsed.disease || parsed.disease_name || "").toLowerCase();
  for (const word of BANNED_WORDS) {
    if (diseaseLower.includes(word)) {
      console.warn(`[Safety] Banned word "${word}" found in disease: "${diseaseLower}". Rejected.`);
      return {
        rejected: true,
        error: "Please upload a plant leaf image only.",
      };
    }
  }

  return { rejected: false };
}

// ---------- Public API ----------

export async function analyzeDisease(payload) {
  const { method, imageBase64, symptoms } = payload;

  // ===== Image-based detection (two-stage) =====
  if (method === "image" && imageBase64) {
    const isPlant = await validatePlantImage(imageBase64);
    if (!isPlant) {
      console.warn("[Stage-1] Non-plant image rejected.");
      return { error: "Please upload a plant leaf image only." };
    }

    const text = await analyzePlantDisease(imageBase64, DISEASE_DETECTION_PROMPT);
    const analysis = parseDiseaseJson(text);
    if (analysis.error) return analysis;

    const safety = applySafetyFilters(analysis);
    if (safety.rejected) return { error: safety.error };

    // Enrich with static prices (strips any AI-hallucinated price fields)
    analysis.treatments = enrichTreatmentsWithPricing(
      analysis.recommendedChemicals || analysis.treatments || []
    );

    return { analysis };
  }

  // ===== Symptom-based detection =====
  if (method === "symptom" && symptoms && symptoms.length > 0) {
    const prompt = `You are an expert agricultural plant pathologist. Based on the following symptoms observed by a farmer, identify the most likely plant disease and provide guidance.

Observed symptoms: ${symptoms.join(", ")}

Return ONLY a JSON object in this format:
{
  "disease_name": "Most likely disease name",
  "confidence": 70,
  "severity": "low" | "medium" | "high",
  "description": "Brief description of the probable disease",
  "symptoms": ["symptom1", "symptom2"],
  "recommendedChemicals": [
    {
      "name": "Chemical name",
      "dosagePerAcre": "e.g., 2.5 kg per acre"
    }
  ],
  "applicationGuide": [
    { "step": "Step description", "timing": "When to do it" }
  ],
  "preventionTips": ["tip1", "tip2"],
  "note": "This is preliminary guidance based on symptoms only."
}

STRICT RULES:
- Do NOT generate price
- Do NOT generate cost
- Do NOT generate savings
- Do NOT generate financial values
- Return valid JSON only
- Practical for Indian farmers.`;

    const text = await generateGroqText(prompt);
    const analysis = parseDiseaseJson(text);
    if (analysis.error) return analysis;

    // Enrich with static prices
    analysis.treatments = enrichTreatmentsWithPricing(
      analysis.recommendedChemicals || analysis.treatments || []
    );

    return { analysis };
  }

  throw new Error("Invalid request: must provide either imageBase64 or symptoms");
}

// ---------- JSON Parser ----------

function parseDiseaseJson(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in model response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      disease_name: parsed.disease_name ?? parsed.disease ?? "Analysis Pending",
      confidence: parsed.confidence ?? "low",
      severity: parsed.severity ?? "medium",
      description: parsed.description ?? "No description available.",
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      treatments: [], // populated by enrichTreatmentsWithPricing
      recommendedChemicals: Array.isArray(parsed.recommendedChemicals) ? parsed.recommendedChemicals : [],
      applicationGuide: Array.isArray(parsed.applicationGuide) ? parsed.applicationGuide : [],
      preventionTips: Array.isArray(parsed.preventionTips) ? parsed.preventionTips : [],
      disease: parsed.disease ?? parsed.disease_name ?? "Analysis Pending",
      prescription: parsed.prescription ?? "",
    };
  } catch (error) {
    console.error("[Parser] Failed to parse AI response as JSON:", error.message, text);
    return {
      error: "Failed to parse AI response. Please try again.",
    };
  }
}
