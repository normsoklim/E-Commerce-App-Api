import express from "express";
import { registerUser, loginUser ,logoutAllDevices} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import { getUserProfile, updateUserProfile } from "../controllers/authController.js";

const router = express.Router();

router.post("/register",upload.single("avatar") ,registerUser);
router.post("/login", loginUser);
router.post("/logoutAll", protect, logoutAllDevices);

// Profile (requires token)
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect,upload.single("avatar"), updateUserProfile);

export default router;

