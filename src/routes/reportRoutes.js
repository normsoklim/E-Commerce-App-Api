import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const router = express.Router();

// In-memory storage for real-time report data (in production, use Redis or similar)
let realTimeReportData = {
  totalOrders: 0,
  totalRevenue: 0,
  activeUsers: 0,
  recentOrders: [],
  topProducts: [],
  salesByCategory: [],
  lastUpdated: new Date()
};

// Function to update real-time report data
export const updateRealTimeReportData = async () => {
  console.log('Starting real-time report data update...');
  try {
    // Set timeout for the entire aggregation operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Aggregation operation timed out')), 30000);
    });
    
    const [orderStats, recentOrders, topProducts, salesByCategory] = await Promise.race([
      Promise.all([
        Order.aggregate([
          { $match: { status: { $in: ["paid", "confirmed"] } } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: "$total" }
            }
          }
        ]),
        Order.find({ status: { $in: ["paid", "confirmed"] } })
          .sort({ createdAt: -1 })
          .limit(10)
          .select("total status user createdAt"),
        Order.aggregate([
          { $match: { status: "paid" } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              totalSold: { $sum: "$items.quantity" },
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: "$product" },
          {
            $project: {
              _id: 0,
              productId: "$product._id",
              name: "$product.name",
              totalSold: 1,
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: 5 },
        ]),
        Order.aggregate([
          { $match: { status: "paid" } },
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
          {
            $group: {
              _id: "$productDetails.category",
              totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
              totalQuantity: { $sum: "$items.quantity" },
            },
          },
          { $sort: { totalRevenue: -1 } },
        ])
      ]),
      timeoutPromise
    ]);
    console.log('Aggregation queries completed successfully');
    realTimeReportData.totalOrders = orderStats[0]?.totalOrders || 0;
    realTimeReportData.totalRevenue = orderStats[0]?.totalRevenue || 0;
    realTimeReportData.recentOrders = recentOrders;
    realTimeReportData.topProducts = topProducts;
    realTimeReportData.salesByCategory = salesByCategory;
    realTimeReportData.lastUpdated = new Date();
    
    // Emit real-time update to connected clients if WebSocket is available
    if (global.io) {
      global.io.emit('report-analytics-update', realTimeReportData);
    }
  } catch (error) {
    console.error('Error updating real-time report data:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
};

// Initialize real-time report data
updateRealTimeReportData();

// Get real-time report data
router.get("/realtime", protect, admin, async (req, res) => {
  try {
    // Update data if it's been more than 30 seconds
    if (Date.now() - realTimeReportData.lastUpdated.getTime() > 30000) {
      await updateRealTimeReportData();
    }
    res.json(realTimeReportData);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Endpoint to trigger real-time report data update
router.post("/realtime/refresh", protect, admin, async (req, res) => {
  try {
    await updateRealTimeReportData();
    res.json({ success: true, message: "Real-time report data refreshed", data: realTimeReportData });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Example: total sales by day/week/month
router.get("/sales", protect, admin, async (req, res) => {
  try {
    const { period } = req.query;
    let groupBy;

    switch (period) {
      case "week":
        groupBy = { $week: "$createdAt" };
        break;
      case "month":
        groupBy = { $month: "$createdAt" };
        break;
      case "day":
      default:
        groupBy = { $dayOfMonth: "$createdAt" };
        break;
    }

    const sales = await Order.aggregate([
      { $match: { status: "paid" } }, // only include paid orders
      {
        $group: {
          _id: groupBy,
          totalSales: { $sum: "$total" },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }


});

// Top-selling products
router.get("/top-products", protect, admin, async (req, res) => {
    try {
    const limit = parseInt(req.query.limit) || 5;

    const topProducts = await Order.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productId: "$product._id",
          name: "$product.name",
          totalSold: 1,
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
    ]);

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Revenue report
router.get("/revenue", protect, admin, async (req, res) => {
  try {
    const { period } = req.query;
    let groupBy;

    switch (period) {
      case "week":
        groupBy = { $week: "$createdAt" };
        break;
      case "month":
        groupBy = { $month: "$createdAt" };
        break;
      case "day":
      default:
        groupBy = { $dayOfMonth: "$createdAt" };
        break;
    }

    const revenue = await Order.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: "$total" },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(revenue);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
