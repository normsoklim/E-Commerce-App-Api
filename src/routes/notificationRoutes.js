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
  .delete(protect, deleteNotification);

// Admin routes (requires admin authentication)
router.route("/").post(protect, admin, createNotification).get(protect, admin, getAllNotifications);

export default router;