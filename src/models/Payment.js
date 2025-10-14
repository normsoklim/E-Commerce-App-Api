import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['paypal', 'khqr', 'stripe', 'cod']
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  gateway: {
    type: String,
    required: function() {
      return this.paymentMethod !== 'cod';
    }
  },
  gatewayTransactionId: {
    type: String
  },
  gatewayPaymentId: {
    type: String
  },
  paymentReference: {
    type: String
  },
  paymentData: {
    // Store payment-specific data like PayPal order ID, KHQR code, etc.
    type: mongoose.Schema.Types.Mixed
  },
  paidAt: Date,
  captured: {
    type: Boolean,
    default: false
  },
  captureData: {
    type: mongoose.Schema.Types.Mixed
  },
  refundData: {
    type: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

export default mongoose.model('Payment', paymentSchema);