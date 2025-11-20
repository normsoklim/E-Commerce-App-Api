// routes/carrierWebhook.js
import express from "express";
import Shipment from "../models/Shipment.js";

const router = express.Router();
  
router.post("/carrier-webhook", async (req, res) => {
  const { trackingNumber, status } = req.body;

  const shipment = await Shipment.findOne({ trackingNumber });
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });

  shipment.status = status;
  shipment.webhookData = req.body; // keep full carrier response
  await shipment.save();

  res.json({ message: "Shipment updated via webhook" });
});

export default router;
