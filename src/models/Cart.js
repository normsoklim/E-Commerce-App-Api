import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true } // <- must exist
  }
],

  subtotal: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Cart", cartSchema);
