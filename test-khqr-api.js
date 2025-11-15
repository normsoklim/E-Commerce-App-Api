import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import KHQRGenerator from './src/utils/khqr.js';
import Order from './src/models/Order.js';
import Payment from './src/models/Payment.js';

dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// Test route to create a KHQR payment
app.post('/api/test/khqr/create-payment', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    console.log('Received request to create KHQR payment for order:', orderId);
    
    // Create a test order if orderId is not provided
    let order;
    if (!orderId) {
      console.log('Creating a new test order');
      order = new Order({
        user: new mongoose.Types.ObjectId(),
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            quantity: 1,
            price: 100.00
          }
        ],
        subtotal: 100.00,
        total: 100.00,
        paymentMethod: 'khqr',
        status: 'pending',
        paymentStatus: 'pending',
        shippingAddress: {
          address: 'Test Address',
          city: 'Phnom Penh',
          postalCode: '12000',
          country: 'Cambodia'
        }
      });
      await order.save();
      console.log('Created test order with ID:', order._id);
    } else {
      console.log('Finding existing order with ID:', orderId);
      order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
    }
    
    console.log('Generating KHQR payment for order:', order._id);
    
    // Generate KHQR payment data
    const khqrData = await KHQRGenerator.generateKHQRPayment(order);
    console.log('KHQR data generated successfully');
    
    // Update order with KHQR information
    order.khqrReference = khqrData.reference;
    order.khqrCode = khqrData.qrCodeUrl;
    order.khqrAmount = order.total;
    order.khqrCurrency = khqrData.currency;
    await order.save();
    console.log('Order updated with KHQR information');
    
    // Create payment record
    const payment = new Payment({
      orderId: order._id,
      paymentMethod: 'khqr',
      amount: order.total,
      currency: khqrData.currency,
      status: 'pending',
      gateway: 'khqr',
      paymentReference: khqrData.reference,
      paymentData: khqrData,
      metadata: {
        bank: khqrData.merchantInfo.bank
      }
    });
    await payment.save();
    console.log('Payment record created with ID:', payment._id);
    
    res.json({
      success: true,
      khqrData,
      paymentId: payment._id,
      orderId: order._id
    });
  } catch (error) {
    console.error('KHQR payment creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create KHQR payment',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test route to get order details
app.get('/api/test/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: error.message
    });
  }
});

// Health check route
app.get('/api/test/health', (req, res) => {
  res.json({
    success: true,
    message: 'KHQR Test API is running',
    timestamp: new Date()
  });
});

const PORT = 3001; // Use a different port
app.listen(PORT, () => {
  console.log(`KHQR Test API server running on port ${PORT}`);
});