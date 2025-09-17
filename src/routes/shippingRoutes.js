// routes/shippingRoutes.js
import express from "express";
import ShippingMethod from "../models/ShippingMethod.js";
import Shipment from "../models/Shipment.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();


// ------------------ SHIPPING METHODS ------------------

// Get all shipping methods
router.get("/methods", async (req, res) => {
  const methods = await ShippingMethod.find({ active: true });
  res.json(methods);
});

// Admin: Create shipping method
router.post("/methods", protect, admin, async (req, res) => {
  const { name, provider, cost, estimatedDays } = req.body;
  const method = new ShippingMethod({ name, provider, cost, estimatedDays });
  await method.save();
  res.status(201).json(method);
});

// ------------------ SHIPMENTS ------------------

// Create shipment (after order is paid)
router.post("/:orderId", protect, async (req, res) => {
  const { methodId, provider } = req.body;

  const shipment = new Shipment({
    orderId: req.params.orderId,
    method: methodId,
    provider,
    trackingNumber: `TRK-${Date.now()}`
  });

  await shipment.save();
  res.status(201).json(shipment);
});

// Get shipment status
router.get("/:shipmentId", protect, async (req, res) => {
  const shipment = await Shipment.findById(req.params.shipmentId).populate("method");
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });
  res.json(shipment);
});

// Update shipment status (admin or webhook)
router.put("/:shipmentId/status", async (req, res) => {
  const { status, webhookData } = req.body;
  const shipment = await Shipment.findById(req.params.shipmentId);
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });

  shipment.status = status || shipment.status;
  if (webhookData) shipment.webhookData = webhookData;

  await shipment.save();
  res.json(shipment);
});

export default router;
