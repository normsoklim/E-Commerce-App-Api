import express from 'express';
import { createDeal, updateDeal, getDeals, getDealById } from '../controllers/dealController.js';
import { admin, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", getDeals);            // Get all active deals
router.get("/:id", getDealById);     // Get deal by ID
router.post("/", protect, admin, createDeal); 
router.put("/:id", protect, admin, updateDeal);

export default router;
