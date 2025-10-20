import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "paid", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
  },

  paidAt: Date,
  paymentStatus: {
    type: String,
    default: "pending",
    enum: ["pending", "processing", "paid", "failed", "refunded", "cancelled"]
  },
  paymentResult: {
    id: String,
    status: String,
    brand: String,
    last4: String,
    email_address: String,
    client_secret: String,
  },

  deliveredAt: Date,

  shippingAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },

  // Location tracking for delivery
  deliveryLocation: {
    current: {
      lat: { type: Number },
      lng: { type: Number }
    },
    destination: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },

  // Payment reference fields
  paymentReference: String,
  stripeSessionId: { type: String },
  paypalOrderId: { type: String },
  khqrReference: { type: String },
  khqrCode: { type: String },
  khqrAmount: { type: Number },
  khqrCurrency: { type: String },
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
