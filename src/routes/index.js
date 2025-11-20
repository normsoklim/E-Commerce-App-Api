const express = require('express');
const router = express.Router();

// Import individual route files
const authRoutes = require('./authRoutes').default;
const productRoutes = require('./productRoutes').default;
const cartRoutes = require('./cartRoutes').default;
const orderRoutes = require('./orderRoutes').default;
const notificationRoutes = require('./notificationRoutes').default;
const paymentRoutes = require('./paymentRoutes').default;
const categoryRoutes = require('./categoryRoutes').default;
const dealRoutes = require('./dealRoutes').default;
const reportRoutes = require('./reportRoutes').default;
const adminAnalyticsRoutes = require('./adminAnalytics').default;
const shippingRoutes = require('./shippingRoutes').default;
const mapRoutes = require('./mapRouters').default;
const carrierWebhookRoutes = require('./carrierWebhook').default;

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/categories', categoryRoutes);
router.use('/deals', dealRoutes);
router.use('/reports', reportRoutes);
router.use('/admin-analytics', adminAnalyticsRoutes);
router.use('/shipping', shippingRoutes);
router.use('/maps', mapRoutes);
router.use('/carrier-webhook', carrierWebhookRoutes);

module.exports = router;