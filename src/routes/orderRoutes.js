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
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({
        message: "Shipping address and payment method are required",
      });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    );
    const total = subtotal; // you can add shipping/taxes here

    // Create the order
    const order = new Order({
      user: req.user._id,
      items: cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      })),
      subtotal,
      total,
      paymentMethod,
      shippingAddress,
      status: "pending",
    });

    await order.save();

    // ✅ Empty the cart instead of deleting it
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [] } }
    );

    res.status(201).json(order);
  } catch (error) {
    console.error("Order creation failed:", error);
    res
      .status(500)
      .json({ message: "Checkout failed", error: error.message });
  }
});

router.post("/:id/checkout", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product", "name price");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Only pending orders can be checked out" });
    }

    // Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: order.items.map(item => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.product.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
      customer_email: req.user.email,
      metadata: { orderId: order._id.toString() },
    });

    // Save session ID in order
    order.stripeSessionId = session.id;
    await order.save();

    res.json({
      orderId: order._id,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.put("/:id/verify", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    .populate("user", "email name")
    .populate("items.product", "name price"); 
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.stripeSessionId) {
      return res.status(400).json({ message: "Order has no Stripe session" });
    }

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({
        message: "Payment not completed yet",
        status: session.payment_status,
      });
    }

    // Update order
    order.status = "paid";
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: session.payment_intent,
      status: session.payment_status,
      email_address: session.customer_email,
    };
    await order.save();

    // Format message
    const message = formatOrderNotification(order, session.customer_email, "Payment Verified");

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
      email: session.customer_email,
      title: "Payment Verified",
      message,
    });

    await sendNotification({
      channel: "in-app",
      userId: order.user._id,
      title: "Payment Verified",
      message,
    });

    res.json({ message: "Payment verified and notifications sent", order });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        // Ensure orderId was passed in session metadata
        const orderId = session.metadata?.orderId;
        if (!orderId) {
          console.error("⚠️ No orderId in session metadata");
          return res.status(400).json({ error: "Missing orderId" });
        }

        const order = await Order.findById(orderId)
        .populate("user", "email name")
        .populate("items.product", "name price"); 

        if (order && order.status !== "paid") {
          order.status = "paid";
          order.paidAt = Date.now();
          order.paymentResult = {
            id: session.payment_intent,
            status: session.payment_status,
            email_address: session.customer_email,
          };
          await order.save();

          // Format message
          const message = formatOrderNotification(order, session.customer_email, "Payment Verified");

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
            email: session.customer_email,
            title: "Payment Verified",
            message,
          });

          await sendNotification({
            channel: "in-app",
            userId: order.user._id,
            title: "Payment Verified",
            message,
          });
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

export default router;
