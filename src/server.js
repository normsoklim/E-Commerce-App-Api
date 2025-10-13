import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js"; 
import productRoutes from "./routes/productRoutes.js"; 
import path from "path";
import categoryRoutes from "./routes/categoryRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { initTelegramBot } from "./utils/telegram.js";
import adminAnalytics from "./routes/adminAnalytics.js";
import shippingRoutes from "./routes/shippingRoutes.js";
import carrierWebhook from "./routes/carrierWebhook.js";
import chatbotRouter from "./routes/chatbot.js";
import dealRoutes from "./routes/dealRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();
connectDB();
initTelegramBot();

const app = express();
// Middleware
app.use(cors());
app.use("/api/orders/webhook", 
  express.raw({ type: "application/json" }), 
  orderRoutes
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/categories", categoryRoutes);

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use("/api/auth", authRoutes); 

app.use("/api/products", productRoutes);

app.use("/api/cart", cartRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/admin",adminAnalytics);

app.use("/api/shipping", shippingRoutes);

app.use("/api/webhook", carrierWebhook);

app.use("/api/chatbot", chatbotRouter);

// Use Deal routes
app.use('/api/deals', dealRoutes);

// Use Notification routes
app.use('/api/notifications', notificationRoutes);

app.use("/uploads", express.static("uploads"));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
