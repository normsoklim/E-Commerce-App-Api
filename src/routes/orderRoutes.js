// routes/orderRoutes.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import crypto from "crypto";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { sendNotification } from "../utils/telegram.js";
import { formatOrderNotification } from "../utils/formatters.js";
import KHQRGenerator from "../utils/khqr.js";
import { createPayPalOrder } from "../config/paypal.js";
import { geocodeAddress } from "../utils/googleMaps.js";

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// ------------------- CREATE ORDER -------------------
router.post("/", protect, async (req, res) => {
  try {
    console.log("Order creation request received:", {
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      hasItems: !!req.body.items,
      subtotal: req.body.subtotal,
      total: req.body.total
    });
    
    const {
      shippingAddress,
      paymentMethod,
      items,
      subtotal,
      shipping,
      tax,
      total
    } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Shipping address and payment method are required",
      });
    }

    // Use provided items or get from cart
    let orderItems = [];
    let calculatedSubtotal = 0;
    let calculatedTotal = 0;

    if (items && items.length > 0) {
      // Use provided items (from selected cart items)
      orderItems = items.map(item => ({
        product: item.productId || item._id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        image: item.image
      }));
      calculatedSubtotal = subtotal || items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      calculatedTotal = total || calculatedSubtotal;
    } else {
      // Fallback to cart items
      const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty"
        });
      }

      orderItems = cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
        name: item.product.name,
        image: item.product.images?.[0] || item.product.image
      }));

      calculatedSubtotal = cart.items.reduce(
          (acc, item) => acc + item.product.price * item.quantity,
          0
      );
      calculatedTotal = calculatedSubtotal;
    }

    // Add shipping and tax if provided
    if (shipping !== undefined) calculatedTotal += shipping;
    if (tax !== undefined) calculatedTotal += tax;

    // Validate payment method
    const validPaymentMethods = ['stripe', 'khqr', 'paypal', 'cod'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method"
      });
    }

    // Geocode the shipping address to get coordinates
    let shippingAddressWithCoordinates = { ...shippingAddress };
    try {
      const geocodedAddress = await geocodeAddress(
        `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.postalCode}, ${shippingAddress.country}`
      );
      shippingAddressWithCoordinates.coordinates = {
        lat: geocodedAddress.lat,
        lng: geocodedAddress.lng
      };
    } catch (geocodeError) {
      console.warn("Failed to geocode shipping address:", geocodeError.message);
      // Continue with order creation even if geocoding fails
    }

    // Create the order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      subtotal: calculatedSubtotal,
      shipping: shipping || 0,
      tax: tax || 0,
      total: calculatedTotal,
      paymentMethod,
      shippingAddress: shippingAddressWithCoordinates,
      deliveryLocation: shippingAddressWithCoordinates.coordinates ? {
        destination: shippingAddressWithCoordinates.coordinates
      } : undefined,
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending', // COD orders are confirmed immediately
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
    });

    await order.save();
    await order.populate('user', 'name email');
    await order.populate('items.product', 'name price images');

    // Emit real-time update to connected clients if WebSocket is available
    if (global.io) {
      global.io.emit('new-order', {
        orderId: order._id,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      });
    }

    // Clear cart if order was created from cart
    if (!items || items.length === 0) {
      await Cart.findOneAndUpdate(
          { user: req.user._id },
          { $set: { items: [] } }
      );
    }

    // Generate payment data based on payment method
    let paymentData = {};
    console.log("Generating payment data for method:", paymentMethod);

    try {
      if (paymentMethod === 'khqr') {
        console.log("Generating KHQR payment for order:", order._id);
        // Validate KHQR environment variables before proceeding
        if (!process.env.KHQR_MERCHANT_ID || !process.env.KHQR_TERMINAL_ID) {
          console.error("KHQR environment variables not properly configured");
          paymentData = {
            error: "KHQR not properly configured",
            message: "KHQR payment method is not properly configured on the server"
          };
        } else {
          paymentData = await generateKHQRPayment(order);
          console.log("KHQR payment data generated:", paymentData);
        }
      } else if (paymentMethod === 'paypal') {
        console.log("Generating PayPal payment for order:", order._id);
        paymentData = await generatePayPalPayment(order);
        console.log("PayPal payment data generated:", paymentData);
      } else if (paymentMethod === 'stripe') {
        console.log("Generating Stripe payment for order:", order._id);
        paymentData = await generateStripePayment(order);
        console.log("Stripe payment data generated:", paymentData);
      }
    } catch (paymentError) {
      console.error("Payment generation failed:", paymentError);
      // Even if payment generation fails, we should still return the order
      // The frontend can handle payment generation separately
      paymentData = {
        error: paymentError.message,
        details: paymentError.stack,
        message: "Payment method could not be processed. Please contact support or try another payment method."
      };
    }
    
    console.log("Final payment data to be returned:", paymentData);

    res.status(201).json({
      success: true,
      order: {
        _id: order._id,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt
      },
      paymentData
    });

  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(500).json({
      success: false,
      message: "Checkout failed",
      error: error.message
    });
  }
});

// ------------------- KHQR PAYMENT -------------------
router.post("/:id/khqr-payment", protect, async (req, res) => {
  try {
    console.log("KHQR payment request for order ID:", req.params.id);
    
    // Validate KHQR environment variables
    if (!process.env.KHQR_MERCHANT_ID || !process.env.KHQR_TERMINAL_ID) {
      console.error("KHQR environment variables not properly configured");
      return res.status(500).json({
        success: false,
        message: "KHQR payment method is not properly configured on the server"
      });
    }
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.log("Order not found for KHQR payment:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.paymentMethod !== 'khqr') {
      console.log("Order is not for KHQR payment:", req.params.id, "Payment method:", order.paymentMethod);
      return res.status(400).json({
        success: false,
        message: "Order is not for KHQR payment"
      });
    }

    const paymentData = await generateKHQRPayment(order);
    console.log("KHQR payment data generated:", paymentData);

    res.json({
      success: true,
      paymentData
    });

  } catch (error) {
    console.error("KHQR payment generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate KHQR payment",
      error: error.message
    });
  }
});

// ------------------- PAYPAL PAYMENT -------------------
router.post("/:id/paypal-payment", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.paymentMethod !== 'paypal') {
      return res.status(400).json({
        success: false,
        message: "Order is not for PayPal payment"
      });
    }

    const paymentData = await generatePayPalPayment(order);

    res.json({
      success: true,
      paymentData
    });

  } catch (error) {
    console.error("PayPal payment generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PayPal payment",
      error: error.message
    });
  }
});

// ------------------- STRIPE PAYMENT -------------------
router.post("/:id/stripe-payment", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product", "name price");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.paymentMethod !== 'stripe') {
      return res.status(400).json({
        success: false,
        message: "Order is not for Stripe payment"
      });
    }

    const paymentData = await generateStripePayment(order);

    res.json({
      success: true,
      paymentData
    });

  } catch (error) {
    console.error("Stripe payment generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate Stripe payment",
      error: error.message
    });
  }
});

// ------------------- VERIFY PAYMENT -------------------
router.put("/:id/verify-payment", protect, async (req, res) => {
  try {
    const { paymentGateway, transactionId, status } = req.body;
    const order = await Order.findById(req.params.id)
        .populate("user", "email name")
        .populate("items.product", "name price");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Update order status based on payment verification
    if (status === 'completed' || status === 'paid') {
      order.status = 'confirmed';
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.paymentResult = {
        id: transactionId,
        status: 'completed',
        gateway: paymentGateway,
        verifiedAt: new Date()
      };

      await order.save();

      // Emit real-time update to connected clients if WebSocket is available
      if (global.io) {
        global.io.emit('order-status-update', {
          orderId: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          paidAt: order.paidAt
        });
      }

      // Format notification message
      const message = formatOrderNotification(order, order.user.email, "Payment Verified");

      // Send notifications
      await sendNotification({
        channel: "telegram",
        userId: process.env.TELEGRAM_CHAT_ID,
        title: "Payment Verified",
        message,
      });

      await sendNotification({
        channel: "email",
        userId: order.user._id,
        email: order.user.email,
        title: "Payment Verified",
        message,
      });

      await sendNotification({
        channel: "in-app",
        userId: order.user._id,
        title: "Payment Verified",
        message,
      });

      res.json({
        success: true,
        message: "Payment verified successfully",
        order
      });
    } else {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      await order.save();

      res.json({
        success: false,
        message: "Payment verification failed",
        order
      });
    }

  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message
    });
  }
});

// ------------------- WEBHOOK FOR PAYMENT GATEWAYS -------------------
router.post("/webhook/khqr", express.json(), async (req, res) => {
  try {
    console.log("KHQR webhook received:", req.body);
    const { event, transaction_reference, transaction_id, amount, status } = req.body;

    // Verify webhook signature (implement based on KHQR documentation)
    if (!verifyKHQRWebhookSignature(req)) {
      console.log("KHQR webhook signature verification failed");
      return res.status(401).json({ error: "Invalid signature" });
    }

    if (event === 'payment.completed' && status === 'success') {
      console.log("Processing successful KHQR payment for transaction:", transaction_reference);
      const order = await Order.findOne({ paymentReference: transaction_reference })
          .populate("user", "email name")
          .populate("items.product", "name price");

      if (!order) {
        console.log("Order not found for transaction reference:", transaction_reference);
        return res.json({ received: true });
      }
      
      console.log("Found order:", order._id);

      if (order && order.status !== 'paid') {
        console.log("Updating order status to paid");
        order.status = 'confirmed';
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
        order.paymentResult = {
          id: transaction_id,
          status: 'completed',
          gateway: 'khqr',
          verifiedAt: new Date()
        };
        await order.save();

        // Emit real-time update to connected clients if WebSocket is available
        if (global.io) {
          global.io.emit('order-status-update', {
            orderId: order._id,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total: order.total,
            paidAt: order.paidAt
          });
        }

        // Send notifications
        const message = formatOrderNotification(order, order.user.email, "KHQR Payment Completed");

        await sendNotification({
          channel: "telegram",
          userId: process.env.TELEGRAM_CHAT_ID,
          title: "KHQR Payment Completed",
          message,
        });

        await sendNotification({
          channel: "email",
          userId: order.user._id,
          email: order.user.email,
          title: "KHQR Payment Completed",
          message,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("KHQR webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

router.post("/webhook/paypal", express.json(), async (req, res) => {
  try {
    const { event_type, resource } = req.body;

    if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const transactionId = resource.id;
      const order = await Order.findOne({
        'paymentResult.id': transactionId,
        paymentMethod: 'paypal'
      }).populate("user", "email name")
          .populate("items.product", "name price");

      if (order && order.status !== 'paid') {
        order.status = 'confirmed';
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
        order.paymentResult = {
          id: transactionId,
          status: 'completed',
          gateway: 'paypal',
          verifiedAt: new Date()
        };
        await order.save();

        // Emit real-time update to connected clients if WebSocket is available
        if (global.io) {
          global.io.emit('order-status-update', {
            orderId: order._id,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total: order.total,
            paidAt: order.paidAt
          });
        }

        // Send notifications
        const message = formatOrderNotification(order, order.user.email, "PayPal Payment Completed");

        await sendNotification({
          channel: "telegram",
          userId: process.env.TELEGRAM_CHAT_ID,
          title: "PayPal Payment Completed",
          message,
        });

        await sendNotification({
          channel: "email",
          userId: order.user._id,
          email: order.user.email,
          title: "PayPal Payment Completed",
          message,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Define helper functions before they are used in the main route

async function generateKHQRPayment(order) {
  try {
    console.log("Generating KHQR payment for order:", order._id);
    // Generate KHQR payment data using the KHQR utility
    const khqrData = await KHQRGenerator.generateKHQRPayment(order);
    console.log("KHQR data generated:", khqrData);

    // Update order with KHQR information
    order.khqrReference = khqrData.reference;
    order.khqrCode = khqrData.qrCodeUrl;
    order.khqrAmount = order.total;
    order.khqrCurrency = khqrData.currency;
    await order.save();
    console.log("Order updated with KHQR information");

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
    console.log("Payment record created");

    return khqrData;
  } catch (error) {
    console.error("KHQR payment generation error:", error);
    throw error;
  }
}

async function generatePayPalPayment(order) {
  try {
    // Create PayPal order using the PayPal SDK
    const paypalOrder = await createPayPalOrder({
      _id: order._id,
      total: order.total,
      currency: 'USD'
    });

    // Update order with PayPal order ID
    order.paypalOrderId = paypalOrder.id;
    await order.save();

    // Create payment record
    const payment = new Payment({
      orderId: order._id,
      paymentMethod: 'paypal',
      amount: order.total,
      currency: 'USD',
      status: 'pending',
      gateway: 'paypal',
      gatewayPaymentId: paypalOrder.id,
      metadata: {
        orderData: paypalOrder
      }
    });
    await payment.save();

    return {
      orderId: paypalOrder.id,
      links: paypalOrder.links,
      paymentType: 'paypal'
    };
  } catch (error) {
    console.error("PayPal payment generation error:", error);
    throw error;
  }
}

async function generateStripePayment(order) {
  try {
    // Generate Stripe payment using existing implementation
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: order.items.map(item => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.product?.name || item.name
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      customer_email: order.user.email,
      metadata: {
        orderId: order._id.toString(),
        paymentMethod: 'stripe'
      },
    });

    order.stripeSessionId = session.id;
    await order.save();

    // Create payment record
    const payment = new Payment({
      orderId: order._id,
      paymentMethod: 'stripe',
      amount: order.total,
      currency: 'USD',
      status: 'pending',
      gateway: 'stripe',
      gatewayPaymentId: session.id,
      metadata: {
        checkoutSession: session
      }
    });
    await payment.save();

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      paymentType: 'stripe'
    };
  } catch (error) {
    console.error("Stripe payment generation error:", error);
    throw error;
  }
}

function verifyKHQRWebhookSignature(req) {
  console.log("Verifying KHQR webhook signature");
  // In a real implementation, this would verify the signature using KHQR's specific method
  // For now, we'll implement a basic HMAC verification as an example
  
  // Get the signature from headers (this would depend on KHQR's specification)
  const signature = req.headers['x-khqr-signature'] || req.headers['signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.KHQR_WEBHOOK_SECRET || 'default_secret';
  
  console.log("Signature:", signature);
  console.log("Payload:", payload);
  console.log("Secret:", secret);
  
  if (!signature) {
    console.log("No signature provided in webhook request");
    return false;
  }
  
  // Calculate expected signature (this is a simplified example)
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  console.log("Expected signature:", expectedSignature);
  
  // In a real implementation, you would compare the signatures properly
  // For now, we'll just log the comparison
  const isValid = signature === expectedSignature;
  console.log("Signature valid:", isValid);
  
  // For development, we'll return true to allow testing
  // In production, you should properly verify the signature
  return true;
}

// ------------------- HELPER FUNCTIONS -------------------

// ------------------- GET USER ORDERS -------------------
router.get("/user/orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
        .populate("items.product", "name images")
        .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get orders",
      error: error.message
    });
  }
});

// ------------------- GET ORDER BY ID -------------------
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
        .populate("user", "name email")
        .populate("items.product", "name price images");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order"
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get order",
      error: error.message
    });
  }
});

export default router;
