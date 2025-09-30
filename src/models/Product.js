import mongoose from "mongoose";

// Sub-schema for individual reviews
const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false } // optional: avoids extra _id for each review
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    rating: { type: Number, default: 0 },          // Average rating
    numReviews: { type: Number, default: 0 },      // Total number of reviews
    reviews: [reviewSchema],                        // Store reviews
    // ✅ Add these fields
    discountPercentage: { type: Number, default: 0 },
    isNew: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
