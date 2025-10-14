import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  transactionType: {
    type: String,
    enum: ['authorization', 'capture', 'refund', 'void'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  gateway: {
    type: String,
    required: true
  },
  gatewayTransactionId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed // Store full gateway response for debugging
  },
  processedAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

export default mongoose.model('Transaction', transactionSchema);