import express from "express";
import { stripe } from "../config/stripe.js";
import Order from "../models/Order.js";
import { protect} from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Create a PaymentIntent for an order (returns clientSecret)
 * POST /api/payments/create-intent
 * body: { orderId: string }
 */
// Create PaymentIntent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // amount in cents
      currency,
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
