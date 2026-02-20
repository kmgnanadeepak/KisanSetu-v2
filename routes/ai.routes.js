import { Router } from "express";
import {
  chatAI,
  healthCheck,
  createCropRecommendation,
  detectDisease,
  getAdvisory,
  getCustomerRecommendations,
  agriChat,
  chat,
} from "../controllers/ai.controller.js";

const router = Router();

router.get("/", healthCheck);
router.post("/crop-recommendation", createCropRecommendation);
router.post("/disease-detection", detectDisease);
router.post("/advisory", getAdvisory);
router.post("/customer-recommendations", getCustomerRecommendations);
router.post("/agri-chat", chatAI);
router.post("/chat", chat);

export default router;
