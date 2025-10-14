// src/utils/analytics.js
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// Function to update real-time analytics when an order is created or updated
export const updateAnalyticsOnOrderChange = async () => {
  try {
    // Update admin analytics data
    try {
      const adminAnalytics = await import('../routes/adminAnalytics.js');
      if (typeof adminAnalytics.updateRealTimeData === 'function') {
        await adminAnalytics.updateRealTimeData();
      }
    } catch (e) {
      console.error('Error updating admin analytics:', e);
    }
    
    // Update report analytics data
    try {
      const reportRoutes = await import('../routes/reportRoutes.js');
      if (typeof reportRoutes.updateRealTimeReportData === 'function') {
        await reportRoutes.updateRealTimeReportData();
      }
    } catch (e) {
      console.error('Error updating report analytics:', e);
    }
  } catch (error) {
    console.error('Error updating analytics on order change:', error);
  }
};

// Function to get real-time analytics data
export const getRealTimeAnalytics = async () => {
  try {
    const [orderStats, recentOrders, topProducts, salesByCategory] = await Promise.all([
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
    ]);
    
    return {
      totalOrders: orderStats[0]?.totalOrders || 0,
      totalRevenue: orderStats[0]?.totalRevenue || 0,
      recentOrders,
      topProducts,
      salesByCategory,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error getting real-time analytics:', error);
    throw error;
  }
};

// Function to schedule periodic updates to real-time data
export const scheduleAnalyticsUpdates = () => {
  // Update analytics every 30 seconds
  setInterval(async () => {
    try {
      await updateAnalyticsOnOrderChange();
    } catch (error) {
      console.error('Error in scheduled analytics update:', error);
    }
  }, 30000); // 30 seconds
  
  console.log('Scheduled analytics updates every 30 seconds');
};
