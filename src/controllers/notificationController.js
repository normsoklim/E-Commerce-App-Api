import Notification from "../models/Notifications.js";
import { sendNotification } from "../utils/notifications.js";
import mongoose from "mongoose";

// Helper function to check if ID is a valid ObjectId
const isValidObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
};


// Create a new notification
export const createNotification = async (req, res) => {
  try {
    const { user, type, channel, title, message } = req.body;

    // Validate required fields
    if (!channel || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Channel, title, and message are required",
      });
    }

    // Create notification in database
    const notification = new Notification({
      user,
      type: type || "system",
      channel,
      title,
      message,
    });

    const savedNotification = await notification.save();

    // Send the actual notification based on channel
    await sendNotification({
      userId: user,
      channel,
      title,
      message,
      email: req.body.email, // Pass email if provided
    });

    res.status(201).json({
      success: true,
      data: savedNotification,
      message: "Notification created and sent successfully",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({
      success: false,
      message: "Error creating notification",
      error: error.message,
    });
  }
};

// Get all notifications for a user
export const getUserNotifications = async (req, res) => {
  try {
    // Use userId from params if provided, otherwise use authenticated user's ID
    const userId = req.params.userId || req.user._id;
    const { page = 1, limit = 10, type, read } = req.query;

    // Build query
    const query = { user: userId };
    if (type) query.type = type;
    if (read !== undefined) query.read = read === "true";

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalNotifications: total,
        hasNext: skip + notifications.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

// Get all notifications (admin only)
export const getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, channel, read } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type;
    if (channel) query.channel = channel;
    if (read !== undefined) query.read = read === "true";

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalNotifications: total,
        hasNext: skip + notifications.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching all notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

// Get a single notification by ID
export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Attempting to fetch notification with ID: ${id}`);

    let notification = null;

    try {
      // Try to find notification by both ObjectId and string
      let notification = null;
      
      // First try to find by string ID directly
      notification = await Notification.findOne({ _id: id }).populate("user", "name email");
      
      // If not found and it looks like a valid ObjectId, try with ObjectId
      if (!notification && mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
        try {
          notification = await Notification.findOne({ _id: new mongoose.Types.ObjectId(id) }).populate("user", "name email");
        } catch (objectIdError) {
          // If ObjectId conversion fails, we'll stick with the string result (null)
          console.log(`ObjectId conversion failed for ID ${id}:`, objectIdError.message);
        }
      }
    } catch (queryError) {
      console.error(`Error querying notification with ID ${id}:`, queryError);
      // If there's an error with the query, return a 500 error
      return res.status(500).json({
        success: false,
        message: "Error querying notification",
        error: queryError.message,
      });
    }

    if (!notification) {
      console.log(`Notification not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    console.log(`Found notification:`, notification);

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notification",
      error: error.message,
    });
  }
};

// Update notification (mark as read/unread)
export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body;

    console.log(`Attempting to update notification with ID: ${id}`);

    let notification = null;

    try {
      // Try to find notification by both ObjectId and string
      let notification = null;
      
      // First try to find by string ID directly
      notification = await Notification.findOne({ user: req.user._id, _id: id });
      
      // If not found and it looks like a valid ObjectId, try with ObjectId
      if (!notification && mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
        try {
          notification = await Notification.findOne({ user: req.user._id, _id: new mongoose.Types.ObjectId(id) });
        } catch (objectIdError) {
          // If ObjectId conversion fails, we'll stick with the string result (null)
          console.log(`ObjectId conversion failed for ID ${id}:`, objectIdError.message);
        }
      }
    } catch (queryError) {
      console.error(`Error querying notification with ID ${id}:`, queryError);
      // If there's an error with the query, return a 500 error
      return res.status(500).json({
        success: false,
        message: "Error querying notification",
        error: queryError.message,
      });
    }

    if (!notification) {
      console.log(`Notification not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied",
      });
    }

    console.log(`Found notification:`, notification);

    // Update the read status
    notification.read = read;
    const updatedNotification = await notification.save();

    res.status(200).json({
      success: true,
      data: updatedNotification,
      message: "Notification updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({
      success: false,
      message: "Error updating notification",
      error: error.message,
    });
  }
};

// Mark all notifications as read for a user
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId format for userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const result = await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: `${result.nModified} notifications marked as read`,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notifications as read",
      error: error.message,
    });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Attempting to delete notification with ID: ${id}`);

    let notification = null;

    try {
      // Try to find and delete notification by both ObjectId and string
      let notification = null;
      
      // First try to find and delete by string ID directly
      notification = await Notification.findOneAndDelete({ _id: id });
      
      // If not found and it looks like a valid ObjectId, try with ObjectId
      if (!notification && mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
        try {
          notification = await Notification.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id) });
        } catch (objectIdError) {
          // If ObjectId conversion fails, we'll stick with the string result (null)
          console.log(`ObjectId conversion failed for ID ${id}:`, objectIdError.message);
        }
      }
    } catch (queryError) {
      console.error(`Error deleting notification with ID ${id}:`, queryError);
      // If there's an error with the query, return a 500 error
      return res.status(500).json({
        success: false,
        message: "Error deleting notification",
        error: queryError.message,
      });
    }

    if (!notification) {
      console.log(`Notification not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    console.log(`Deleted notification:`, notification);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
      error: error.message,
    });
  }
};

// Delete all notifications for a user
export const deleteAllNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId format for userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const result = await Notification.deleteMany({ user: userId });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} notifications deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting notifications",
      error: error.message,
    });
  }
};

// Send notification to user
export const sendUserNotification = async (req, res) => {
  try {
    const { userId, channel, title, message, email } = req.body;

    if (!userId || !channel || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "User ID, channel, title, and message are required",
      });
    }

    // Validate ObjectId format for userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Send the notification
    await sendNotification({
      userId,
      channel,
      title,
      message,
      email,
    });

    // Save to database
    const notification = new Notification({
      user: userId,
      channel,
      title,
      message,
    });

    const savedNotification = await notification.save();

    res.status(200).json({
      success: true,
      data: savedNotification,
      message: "Notification sent and saved successfully",
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      success: false,
      message: "Error sending notification",
      error: error.message,
    });
  }
};