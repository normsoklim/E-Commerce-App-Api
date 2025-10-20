// routes/shippingRoutes.js
import express from "express";
import ShippingMethod from "../models/ShippingMethod.js";
import Shipment from "../models/Shipment.js";
import Order from "../models/Order.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { calculateDistance, getDirections } from "../utils/googleMaps.js";

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

// Update shipment location (for tracking)
router.put("/:shipmentId/location", async (req, res) => {
  try {
    const { lat, lng, status } = req.body;
    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) return res.status(404).json({ message: "Shipment not found" });

    // Update shipment status if provided
    if (status) shipment.status = status;

    await shipment.save();

    // Update the associated order with current location
    const order = await Order.findById(shipment.orderId);
    if (order) {
      if (!order.deliveryLocation) order.deliveryLocation = {};
      order.deliveryLocation.current = { lat, lng };
      await order.save();
    }

    res.json(shipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get shipment tracking information with location data
router.get("/:shipmentId/tracking", async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.shipmentId)
      .populate("method")
      .populate({
        path: "orderId",
        populate: {
          path: "user",
          select: "name email"
        }
      });
    
    if (!shipment) return res.status(404).json({ message: "Shipment not found" });

    // Get the associated order to access location data
    const order = await Order.findById(shipment.orderId);
    
    const trackingInfo = {
      shipment,
      status: shipment.status,
      trackingNumber: shipment.trackingNumber,
      provider: shipment.provider,
      order: {
        shippingAddress: order?.shippingAddress,
        deliveryLocation: order?.deliveryLocation
      }
    };

    res.json(trackingInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
