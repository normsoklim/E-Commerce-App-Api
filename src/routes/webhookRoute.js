import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import bodyParser from "body-parser";
dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

// ⚠️ IMPORTANT: Webhook must use raw body


// For the webhook route ONLY
router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // ⚠ Must be raw!
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("❌ Webhook signature failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Now you can handle the event safely
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("✅ Webhook received for session:", session.id);
      // handle order payment logic here...
    }

    res.json({ received: true });
  }
);


export default router;
