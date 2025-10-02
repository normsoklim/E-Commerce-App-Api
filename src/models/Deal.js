import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Deal = mongoose.model('Deal', dealSchema);
export default Deal;
