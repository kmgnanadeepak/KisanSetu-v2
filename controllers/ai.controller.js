import { getCropRecommendations } from "../services/cropRecommendation.service.js";
import { analyzeDisease } from "../services/diseaseDetection.service.js";
import { generateAdvisory } from "../services/advisory.service.js";
import { generateCustomerRecommendations } from "../services/customerRecommendations.service.js";
import { generateAgriChatResponse } from "../services/agriChat.service.js";

/** Health/test handler for GET /api/ai */
export const healthCheck = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "AI endpoint working successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/** Agriculture chat handler for POST /api/ai/agri-chat */
export const chatAI = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }
    const aiResponse = await generateAgriChatResponse(message);
    res.json({
      success: true,
      reply: aiResponse,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const createCropRecommendation = async (req, res) => {
  try {
    const result = await getCropRecommendations(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Allowed MIME types for disease detection images
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB decoded

export const detectDisease = async (req, res) => {
  try {
    const { method, imageBase64 } = req.body;

    // --- Input validation for image uploads ---
    if (method === "image" && imageBase64) {
      // MIME type check on data-URI prefix
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1];
        if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
          console.warn(`[Input] Rejected MIME type: ${mimeType}`);
          return res.status(400).json({
            success: false,
            error: `Unsupported image format. Please upload JPEG, PNG, or WebP.`,
          });
        }
      }

      // Approximate decoded size check (base64 ≈ 4/3 × original)
      const base64Part = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;
      const estimatedBytes = (base64Part.length * 3) / 4;
      if (estimatedBytes > MAX_IMAGE_BYTES) {
        console.warn(`[Input] Image too large: ~${(estimatedBytes / 1024 / 1024).toFixed(1)} MB`);
        return res.status(400).json({
          success: false,
          error: "Image is too large. Please upload an image smaller than 10 MB.",
        });
      }
    }

    const result = await analyzeDisease(req.body);

    // Handle rejection from two-stage pipeline
    if (result.error) {
      return res.status(200).json({ success: false, error: result.error });
    }

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[detectDisease] Unhandled error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdvisory = async (req, res) => {
  try {
    const { query } = req.body;
    const result = await generateAdvisory(query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCustomerRecommendations = async (req, res) => {
  try {
    const { customerId } = req.body;
    const result = await generateCustomerRecommendations(customerId);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const agriChat = async (req, res) => {
  try {
    const { message } = req.body;
    const text = await generateAgriChatResponse(message);
    res.status(200).json({ success: true, message: text });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const chat = async (req, res) => {
  try {
    const { message } = req.body;
    const text = await generateAgriChatResponse(message);
    res.status(200).json({ success: true, message: text });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
