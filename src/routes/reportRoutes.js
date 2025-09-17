import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import Order from "../models/Order.js";

const router = express.Router();

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
          localField: "_id",
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
