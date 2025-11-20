import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "../utils/email.js";

// Login user
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      token: generateToken(user),
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};


// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, isAdmin } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // If file uploaded
    const avatarPath = req.file ? `/uploads/${req.file.filename}` : "";

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar: avatarPath,
      isAdmin: isAdmin || false,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Logout from all devices
export const logoutAllDevices = async (req, res) => {
  const user = await User.findById(req.user.id); // req.user from JWT middleware
  if (!user) return res.status(404).json({ message: "User not found" });

  user.tokenVersion += 1; // increment tokenVersion to invalidate all existing tokens
  await user.save();

  res.json({ message: "Logged out from all devices successfully" });
};

// @desc Get profile
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({ _id: user._id, name: user.name, email: user.email });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

// @desc Update profile
export const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
   
    if (req.body.password) user.password = req.body.password;
     if (req.file) user.avatar = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      token: generateToken(updatedUser),
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    // Check if user is authenticated (token was validated by middleware)
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, no valid token" });
    }

    // Generate a new token
    const newToken = generateToken(req.user);
    
    res.json({
      token: newToken,
      message: "Token refreshed successfully"
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ message: "Server error during token refresh" });
  }
};

// @desc    Forgot password
export const forgotPassword = async (req, res) => {
  // Add debug logs for password reset flow
  console.log("=== FORGOT PASSWORD DEBUG ===");
  console.log("Request body:", req.body);
  console.log("Email received:", req.body.email);
  try {
    const { email } = req.body;

    // Validate email exists in request
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // Return success response even if user not found to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: "Password reset email sent successfully if email exists"
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    console.log("Generated reset token:", resetToken);
    
    // Hash token and save to user
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    console.log("Hashed token for storage:", hashedToken);
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes (increased from 10)

    await user.save({ validateBeforeSave: false });

    // Create reset URL - using a frontend URL instead of backend
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/reset-password/${resetToken}`;

    // Create email message with HTML version for better formatting
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the following link, or paste this into your browser to complete the process:\n\n${resetUrl}\n\nThe link will expire in 15 minutes.\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`;

    try {
      await sendEmail(user.email, "Password Reset Request", message);

      // Don't expose whether the user exists or not for security
      res.status(200).json({
        success: true,
        data: { user },
        message: "Password reset email sent successfully"
      });
    } catch (err) {
      console.error("Email sending error:", err); // Log the actual error
      // If email sending fails, clear the reset token and expiration
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        message: "Email could not be sent",
        error: err.message
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error); // Log the actual error
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset password
export const resetPassword = async (req, res) => {
  // Add debug logs for reset password flow
  console.log("=== RESET PASSWORD DEBUG ===");
  console.log("Request body:", req.body);
  console.log("Reset token from URL:", req.params.resetToken);
  try {
    // Validate request body
    if (!req.body.password) {
      return res.status(400).json({ message: "New password is required" });
    }

    // Validate password strength
    if (req.body.password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Get reset token from URL
    const urlToken = req.params.resetToken;
    console.log("Reset token from URL:", urlToken);
    
    // Use the token from URL directly for comparison (it was already hashed when stored)
    console.log("Reset token from URL:", urlToken);
    
    // Find user with matching reset token and not expired
    console.log("Searching for user with reset token and expiration > current time");
    console.log("Looking for resetPasswordToken:", urlToken);
    console.log("Current time:", Date.now());
    
    const user = await User.findOne({
      resetPasswordToken: urlToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (user) {
      console.log("Found user with email:", user.email);
      console.log("User's resetPasswordToken:", user.resetPasswordToken);
      console.log("User's resetPasswordExpires:", user.resetPasswordExpires);
      console.log("Is token expired?", user.resetPasswordExpires < Date.now());
    } else {
      console.log("No user found with matching token or token has expired");
    }
    
    if (!user) {
      console.log("No user found with matching token or token has expired");
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    
    console.log("User found:", user.email);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Set new password
    console.log("Setting new password for user:", user.email);
    user.password = hashedPassword;
    // Clear reset token fields to prevent reuse
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // Increment tokenVersion to invalidate all existing tokens
    user.tokenVersion += 1;
    
    console.log("Saving updated user document...");

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Change password (requires old password)
export const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if old password matches
    const isMatch = await user.matchPassword(req.body.oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Validate new password
    if (!req.body.newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    if (req.body.newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // Additional password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(req.body.newPassword)) {
      return res.status(400).json({
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);

    // Update password
    user.password = hashedPassword;
    // Increment tokenVersion to invalidate all existing tokens after password change
    user.tokenVersion += 1;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
