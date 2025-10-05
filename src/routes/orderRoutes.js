// routes/orderRoutes.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { sendNotification } from "../utils/telegram.js";
import { formatOrderNotification } from "../utils/formatters.js";

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// ------------------- CREATE ORDER -------------------
router.post("/", protect, async (req, res) => {
  try {
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

    // Create the order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      subtotal: calculatedSubtotal,
      shipping: shipping || 0,
      tax: tax || 0,
      total: calculatedTotal,
      paymentMethod,
      shippingAddress,
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending', // COD orders are confirmed immediately
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
    });

    await order.save();
    await order.populate('user', 'name email');
    await order.populate('items.product', 'name price images');

    // Clear cart if order was created from cart
    if (!items || items.length === 0) {
      await Cart.findOneAndUpdate(
          { user: req.user._id },
          { $set: { items: [] } }
      );
    }

    // Generate payment data based on payment method
    let paymentData = {};

    if (paymentMethod === 'khqr') {
      paymentData = await generateKHQRPayment(order);
    } else if (paymentMethod === 'paypal') {
      paymentData = await generatePayPalPayment(order);
    } else if (paymentMethod === 'stripe') {
      paymentData = await generateStripePayment(order);
    }

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
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.paymentMethod !== 'khqr') {
      return res.status(400).json({
        success: false,
        message: "Order is not for KHQR payment"
      });
    }

    const paymentData = await generateKHQRPayment(order);

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
    const { event, transaction_reference, transaction_id, amount, status } = req.body;

    // Verify webhook signature (implement based on KHQR documentation)
    if (!verifyKHQRWebhookSignature(req)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    if (event === 'payment.completed' && status === 'success') {
      const order = await Order.findOne({ paymentReference: transaction_reference })
          .populate("user", "email name")
          .populate("items.product", "name price");

      if (order && order.status !== 'paid') {
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

// ------------------- HELPER FUNCTIONS -------------------
async function generateKHQRPayment(order) {
  // Generate KHQR payment data
  // This would integrate with your KHQR service
  const paymentReference = `KHQR_${order._id}_${Date.now()}`;

  // Update order with payment reference
  order.paymentReference = paymentReference;
  await order.save();

  return {
    paymentReference,
    qrCodeData: `https://api.khqr.com/pay?ref=${paymentReference}&amount=${order.total}`,
    paymentUrl: `khqr://pay?ref=${paymentReference}&amount=${order.total}`,
    merchantInfo: {
      name: process.env.KHQR_MERCHANT_NAME || "Your Store",
      account: process.env.KHQR_ACCOUNT_NUMBER || "123456789"
    }
  };
}

async function generatePayPalPayment(order) {
  // Generate PayPal payment
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
      paymentMethod: 'paypal'
    },
  });

  order.stripeSessionId = session.id;
  await order.save();

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    paymentType: 'paypal'
  };
}

async function generateStripePayment(order) {
  // Generate Stripe payment
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

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    paymentType: 'stripe'
  };
}

function verifyKHQRWebhookSignature(req) {
  // Implement KHQR webhook signature verification
  // This would use KHQR's specific verification method
  return true; // Placeholder
}

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
