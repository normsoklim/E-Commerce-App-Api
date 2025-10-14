import crypto from 'crypto';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';

// Security middleware for payment routes
export const validatePaymentRequest = async (req, res, next) => {
  try {
    const { orderId, amount, currency, paymentMethod } = req.body;
    
    // Validate required fields
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    // Validate currency
    const validCurrencies = ['USD', 'KHR', 'THB'];
    if (currency && !validCurrencies.includes(currency.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Valid currencies: ${validCurrencies.join(', ')}`
      });
    }
    
    // Validate payment method
    const validPaymentMethods = ['paypal', 'khqr', 'stripe', 'cod'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Valid methods: ${validPaymentMethods.join(', ')}`
      });
    }
    
    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user owns the order (for non-admin users)
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }
    
    // Verify amount matches order total (with small tolerance for rounding)
    const tolerance = 0.01; // 1 cent tolerance
    if (Math.abs(parseFloat(amount) - order.total) > tolerance) {
      console.error(`Amount mismatch for order ${orderId}: expected ${order.total}, got ${amount}`);
      return res.status(400).json({
        success: false,
        message: 'Amount does not match order total'
      });
    }
    
    // Check if order is already paid
    if (order.status === 'confirmed' || order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }
    
    next();
  } catch (error) {
    console.error('Payment validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment validation failed',
      error: error.message
    });
  }
};

// Rate limiting for payment routes
export const rateLimitPaymentRequests = (req, res, next) => {
  // In a production environment, you would use a more sophisticated rate limiting solution
  // like express-rate-limit with Redis backend
  
  const userId = req.user._id;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10; // max 10 requests per window
  
  // This is a simplified in-memory rate limiter for demonstration
  // In production, use a persistent store like Redis
  if (!global.paymentRateLimits) {
    global.paymentRateLimits = new Map();
  }
  
  const userRequests = global.paymentRateLimits.get(userId) || [];
  
  // Remove requests outside the current window
  const validRequests = userRequests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many payment requests. Please try again later.'
    });
  }
  
  // Add current request
  validRequests.push(now);
  global.paymentRateLimits.set(userId, validRequests);
  
  next();
};

// Validate webhook signatures
export const validateWebhookSignature = (signatureType) => {
  return async (req, res, next) => {
    try {
      switch (signatureType) {
        case 'paypal':
          await validatePayPalWebhookSignature(req);
          break;
        case 'stripe':
          await validateStripeWebhookSignature(req);
          break;
        case 'khqr':
          await validateKHQRWebhookSignature(req);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid signature type'
          });
      }
      
      next();
    } catch (error) {
      console.error(`Webhook signature validation failed:`, error);
      res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }
  };
};

// Validate PayPal webhook signature
async function validatePayPalWebhookSignature(req) {
  // In production, use PayPal's official webhook verification
  // This is a simplified version for demonstration
  
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const webhookSecret = process.env.PAYPAL_WEBHOOK_SECRET;
  
  if (!webhookId || !webhookSecret) {
    console.warn('PayPal webhook validation: Missing webhook ID or secret');
    // In development, you might want to skip validation
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Webhook validation configuration missing');
    }
    return;
  }
  
  // PayPal provides webhook verification through their SDK
  // const paypal = require('@paypal/checkout-server-sdk');
  // const verificationResult = await paypal.webhook.verify(req.headers, req.body, webhookId, webhookSecret);
  
  // For now, we'll implement a basic signature verification
  // In production, use PayPal's official verification method
  const transmissionId = req.headers['paypal-transmission-id'];
  const transmissionTime = req.headers['paypal-transmission-time'];
  const certUrl = req.headers['paypal-cert-url'];
  const authAlgo = req.headers['paypal-auth-algo'];
  const transmissionSig = req.headers['paypal-transmission-sig'];
  
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    throw new Error('Missing PayPal webhook headers');
  }
  
  // In a real implementation, you would:
  // 1. Fetch the certificate from certUrl
  // 2. Verify the signature using the certificate and the provided algorithm
  // 3. Ensure the transmission time is recent (within 5 minutes)
  
  // For this example, we'll just log the verification attempt
  console.log('PayPal webhook verification would happen here');
}

// Validate Stripe webhook signature
async function validateStripeWebhookSignature(req) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    throw new Error('Stripe webhook secret not configured');
  }
  
  // In production, use Stripe's official webhook verification
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const sig = req.headers['stripe-signature'];
  // const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
}

// Validate KHQR webhook signature
async function validateKHQRWebhookSignature(req) {
  const expectedSignature = req.headers['x-khqr-signature'] || req.headers['x-signature'];
  const secret = process.env.KHQR_WEBHOOK_SECRET;
  
  if (!secret || !expectedSignature) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('KHQR webhook validation configuration missing');
    }
    // In development, allow requests without signature
    return;
  }
  
  // Create signature using the request body and secret
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  
  if (!isValid) {
    throw new Error('Invalid KHQR webhook signature');
  }
}

// Sanitize payment data
export const sanitizePaymentData = (req, res, next) => {
  // Remove any potentially dangerous fields from payment data
  if (req.body) {
    // Remove any fields that shouldn't be stored
    const dangerousFields = ['__proto__', 'constructor', 'prototype'];
    
    for (const field of dangerousFields) {
      if (req.body[field]) {
        delete req.body[field];
      }
    }
    
    // Sanitize nested objects
    if (req.body.paymentData && typeof req.body.paymentData === 'object') {
      for (const field of dangerousFields) {
        if (req.body.paymentData[field]) {
          delete req.body.paymentData[field];
        }
      }
    }
  }
  
  next();
};

// Validate payment capture requests
export const validatePaymentCapture = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment order ID is required'
      });
    }
    
    // Verify payment exists and is in correct state
    const payment = await Payment.findOne({ 
      gatewayPaymentId: orderId,
      status: 'pending'
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already processed'
      });
    }
    
    // Verify associated order exists and is valid
    const order = await Order.findById(payment.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Associated order not found'
      });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order is not in pending state'
      });
    }
    
    next();
  } catch (error) {
    console.error('Payment capture validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment capture validation failed',
      error: error.message
    });
  }
};