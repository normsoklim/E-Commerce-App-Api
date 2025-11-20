import express from "express";
import { registerUser, loginUser ,logoutAllDevices, refreshToken, getUserProfile, updateUserProfile, forgotPassword, resetPassword, changePassword} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/register",upload.single("avatar") ,registerUser);
router.post("/login", loginUser);
router.post("/logoutAll", protect, logoutAllDevices);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:resetToken", resetPassword);
// Change password route - supports both PUT and POST for compatibility
router.put("/change-password", protect, changePassword);
router.post("/change-password", protect, changePassword);

// Profile (requires token)
router.get("/profile", protect, getUserProfile);
router.post("/refresh", protect, refreshToken);
router.put("/profile", protect,upload.single("avatar"), updateUserProfile);

export default router;
