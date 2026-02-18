import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  analyzeDisease,
  type DiseaseAnalysisRequest,
} from "../services/ai.service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_TIMEOUT_MS = 10_000;
const GEMINI_MAX_RETRIES = 1;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Gemini request timed out after ${ms}ms`));
    }, ms) as unknown as number;
  });

  try {
    // Race the original promise against the timeout.
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function callAnalyzeDiseaseWithRetry(
  payload: DiseaseAnalysisRequest,
  apiKey: string,
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      console.log(`analyze-disease: calling AI service, attempt ${attempt + 1}`);
      const result = await withTimeout(analyzeDisease(payload, apiKey), GEMINI_TIMEOUT_MS);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`analyze-disease: AI call failed on attempt ${attempt + 1}`, error);

      if (attempt === GEMINI_MAX_RETRIES) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Unknown AI error");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("analyze-disease: request received");
    const body = await req.json();
    console.log("analyze-disease: payload", {
      hasImage: Boolean(body?.imageBase64),
      symptomsCount: Array.isArray(body?.symptoms) ? body.symptoms.length : 0,
      method: body?.method,
    });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const { imageBase64, symptoms, method } = body as {
      imageBase64?: string | null;
      symptoms?: string[] | null;
      method?: string;
    };

    if (method !== "image" && method !== "symptom") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid detection method. Use 'image' or 'symptom'.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method === "image" && !imageBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Image data is required for image-based analysis.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method === "symptom" && (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "At least one symptom must be provided for symptom-based analysis.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload: DiseaseAnalysisRequest = {
      method,
      imageBase64,
      symptoms,
    };

    console.log("analyze-disease: validated payload, invoking AI");

    try {
      const analysisResult = await callAnalyzeDiseaseWithRetry(payload, GEMINI_API_KEY);

      console.log("analyze-disease: AI analysis completed successfully");

      return new Response(JSON.stringify({ success: true, analysis: analysisResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (aiError) {
      console.error("analyze-disease: AI analysis failed after retries", aiError);

      return new Response(
        JSON.stringify({
          success: false,
          error: "AI analysis service temporarily unavailable",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("analyze-disease: unexpected error", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
