import { Router } from "express";
import {
  createCropRecommendation,
  detectDisease,
  getAdvisory,
  getCustomerRecommendations,
  agriChat,
  chat,
} from "../controllers/ai.controller.js";

const router = Router();

router.post("/crop-recommendation", createCropRecommendation);
router.post("/disease-detection", detectDisease);
router.post("/advisory", getAdvisory);
router.post("/customer-recommendations", getCustomerRecommendations);
router.post("/agri-chat", agriChat);
router.post("/chat", chat);

export default router;

