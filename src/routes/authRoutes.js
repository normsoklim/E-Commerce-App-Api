import express from "express";
import { registerUser, loginUser ,logoutAllDevices} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logoutAll", protect, logoutAllDevices);

export default router;

