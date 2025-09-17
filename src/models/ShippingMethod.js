// models/ShippingMethod.js
import mongoose from "mongoose";

const shippingMethodSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., Standard, Express, Pickup
  provider: { type: String, default: "Local" }, // e.g., DHL, UPS, Cambodia Post
  cost: { type: Number, required: true }, // shipping fee
  estimatedDays: { type: Number, required: true }, // delivery time
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("ShippingMethod", shippingMethodSchema);
