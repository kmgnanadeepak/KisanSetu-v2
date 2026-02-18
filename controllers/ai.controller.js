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

export const detectDisease = async (req, res) => {
  try {
    const result = await analyzeDisease(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
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
