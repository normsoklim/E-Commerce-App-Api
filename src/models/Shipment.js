// models/Shipment.js
import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  method: { type: mongoose.Schema.Types.ObjectId, ref: "ShippingMethod", required: true },
  trackingNumber: { type: String }, // generated or from provider
  status: {
    type: String,
    enum: ["pending", "shipped", "in_transit", "delivered", "cancelled"],
    default: "pending"
  },
  provider: { type: String }, // DHL, UPS, Cambodia Post
  webhookData: { type: Object }, // store payloads from providers
}, { timestamps: true });

export default mongoose.model("Shipment", shipmentSchema);
