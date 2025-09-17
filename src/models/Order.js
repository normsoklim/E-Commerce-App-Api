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
    enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
  },

  paidAt: Date,
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
  },

  // 🔑 Add this field
  stripeSessionId: { type: String },
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
