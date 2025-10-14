import express from "express";
import client, { createPayPalOrder, capturePayPalPayment } from "../config/paypal.js";
import KHQRGenerator from "../utils/khqr.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Transaction from "../models/Transaction.js";
import { protect } from "../middleware/authMiddleware.js";
import { rateLimitPaymentRequests, sanitizePaymentData } from "../middleware/paymentSecurity.js";

const router = express.Router();

// Create PayPal payment for an order
router.post("/paypal/create-order", protect, async (req, res) => {
  try {
    const { orderId } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Create PayPal order
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

    res.json({
      success: true,
      orderId: paypalOrder.id,
      links: paypalOrder.links
    });
  } catch (error) {
    console.error("PayPal order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create PayPal payment",
      error: error.message
    });
  }
});

// Capture PayPal payment after approval
router.post("/paypal/capture/:orderId", protect, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Capture the payment
    const captureData = await capturePayPalPayment(orderId);

    if (captureData.status === 'COMPLETED') {
      // Find the order associated with this PayPal order ID
      const order = await Order.findOne({ paypalOrderId: orderId });
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      // Update order status
      order.status = 'confirmed';
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.paymentResult = {
        id: captureData.id,
        status: captureData.status,
        email_address: captureData.payer?.email_address,
        name: captureData.payer?.name?.given_name + ' ' + captureData.payer?.name?.surname
      };
      await order.save();

      // Update payment record
      const payment = await Payment.findOne({ gatewayPaymentId: orderId });
      if (payment) {
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.captured = true;
        payment.captureData = captureData;
        await payment.save();
      }

      // Create transaction record
      const transaction = new Transaction({
        orderId: order._id,
        paymentId: payment._id,
        transactionType: 'capture',
        amount: order.total,
        currency: 'USD',
        gateway: 'paypal',
        gatewayTransactionId: captureData.id,
        status: 'completed',
        gatewayResponse: captureData
      });
      await transaction.save();

      res.json({
        success: true,
        message: "Payment captured successfully",
        order: {
          _id: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus
        },
        captureData
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment capture failed",
        status: captureData.status
      });
    }
  } catch (error) {
    console.error("PayPal payment capture error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to capture PayPal payment",
      error: error.message
    });
  }
});

// Create KHQR payment for an order
router.post("/khqr/create-payment", protect, async (req, res) => {
  try {
    const { orderId } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Generate KHQR payment data
    const khqrData = await KHQRGenerator.generateKHQRPayment(order);

    // Update order with KHQR information
    order.khqrReference = khqrData.reference;
    order.khqrCode = khqrData.qrCodeUrl;
    order.khqrAmount = order.total;
    order.khqrCurrency = khqrData.currency;
    await order.save();

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

    res.json({
      success: true,
      khqrData,
      paymentId: payment._id
    });
  } catch (error) {
    console.error("KHQR payment creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create KHQR payment",
      error: error.message
    });
  }
});

// Verify KHQR payment status (for mobile app or manual verification)
router.post("/khqr/verify-payment", protect, async (req, res) => {
  try {
    const { orderId, referenceId } = req.body;

    // In a real implementation, you would check with the bank's API
    // For now, we'll simulate the verification process
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Update order status to confirmed
    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    order.paymentResult = {
      id: referenceId,
      status: 'completed',
      gateway: 'khqr'
    };
    await order.save();

    // Update payment record
    const payment = await Payment.findOne({
      orderId: order._id,
      paymentMethod: 'khqr'
    });
    if (payment) {
      payment.status = 'completed';
      payment.paidAt = new Date();
      await payment.save();
    }

    // Create transaction record
    const transaction = new Transaction({
      orderId: order._id,
      paymentId: payment._id,
      transactionType: 'capture',
      amount: order.total,
      currency: order.khqrCurrency || 'KHR',
      gateway: 'khqr',
      gatewayTransactionId: referenceId,
      status: 'completed'
    });
    await transaction.save();

    res.json({
      success: true,
      message: "KHQR payment verified successfully",
      order: {
        _id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    });
  } catch (error) {
    console.error("KHQR payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify KHQR payment",
      error: error.message
    });
  }
});

// Get payment status
router.get("/:paymentId/status", protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('orderId', 'status paymentStatus')
      .populate('transactionId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment status",
      error: error.message
    });
  }
});

// Refund payment (generic endpoint that handles different payment methods)
router.post("/:paymentId/refund", protect, rateLimitPaymentRequests, sanitizePaymentData, async (req, res) => {
  try {
    const { reason = 'Requested by customer' } = req.body;
    const payment = await Payment.findById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: "Cannot refund incomplete payment"
      });
    }

    let refundResult;

    // Handle refund based on payment method
    if (payment.paymentMethod === 'paypal') {
      // In a real implementation, call PayPal refund API
      // const refund = await paypalRefundAPI(payment.gatewayTransactionId, reason);
      // refundResult = refund;
      
      // For now, simulate refund
      refundResult = {
        id: `refund_${Date.now()}`,
        status: 'completed',
        amount: payment.amount
      };
    } else if (payment.paymentMethod === 'khqr') {
      // KHQR refund would be handled differently based on bank integration
      refundResult = {
        id: `khqr_refund_${Date.now()}`,
        status: 'pending_approval',
        amount: payment.amount
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Refund not supported for this payment method"
      });
    }

    // Update payment record
    payment.status = 'refunded';
    payment.refundData = refundResult;
    await payment.save();

    // Update order status
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.status = 'refunded';
      order.paymentStatus = 'refunded';
      await order.save();
    }

    // Create refund transaction
    const transaction = new Transaction({
      orderId: payment.orderId,
      paymentId: payment._id,
      transactionType: 'refund',
      amount: payment.amount,
      currency: payment.currency,
      gateway: payment.gateway,
      gatewayTransactionId: refundResult.id,
      status: 'completed',
      metadata: { reason }
    });
    await transaction.save();

    res.json({
      success: true,
      message: "Payment refunded successfully",
      refund: refundResult
    });
  } catch (error) {
    console.error("Payment refund error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process refund",
      error: error.message
    });
  }
});

export default router;
