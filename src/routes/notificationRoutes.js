import express from "express";
import {
  createNotification,
  getUserNotifications,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendUserNotification,
} from "../controllers/notificationController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.route("/send").post(sendUserNotification);

// User routes (requires authentication)
router
  .route("/user/:userId")
  .get(protect, getUserNotifications)
  .delete(protect, deleteAllNotifications);

router.route("/user/:userId/mark-all-read").put(protect, markAllAsRead);

// Individual notification routes (requires authentication)
router
  .route("/:id")
  .get(protect, getNotificationById)
  .put(protect, updateNotification)
  .patch(protect, updateNotification) // Add PATCH method as well
  .delete(protect, deleteNotification);

// Add specific route for marking notification as read
router.route("/:id/read").patch(protect, updateNotification);

// Route for current user to get their notifications (uses req.user._id)
router.route("/").get(protect, getUserNotifications);

// Admin routes (requires admin authentication)
router.route("/").post(protect, admin, createNotification).get(protect, admin, getAllNotifications);

export default router;