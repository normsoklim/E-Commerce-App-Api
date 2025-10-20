import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import path from "path";
import categoryRoutes from "./routes/categoryRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { initTelegramBot } from "./utils/telegram.js";
import { scheduleAnalyticsUpdates } from "./utils/analytics.js";
import adminAnalytics from "./routes/adminAnalytics.js";
import shippingRoutes from "./routes/shippingRoutes.js";
import carrierWebhook from "./routes/carrierWebhook.js";
import dealRoutes from "./routes/dealRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import mapRoutes from "./routes/mapRouters.js";

dotenv.config();
connectDB();
initTelegramBot();
scheduleAnalyticsUpdates(); // Start scheduled analytics updates

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow your frontend origin
    methods: ["GET", "POST"]
  }
});

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

// Add payment routes
app.use("/api/payments", paymentRoutes);

app.use("/api/admin",adminAnalytics);

app.use("/api/shipping", shippingRoutes);

app.use("/api/webhook", carrierWebhook);

// Use Deal routes
app.use('/api/deals', dealRoutes);

// Use Report routes
app.use('/api/reports', reportRoutes);

// Use Notification routes
app.use('/api/notifications', notificationRoutes);

// Use Map routes
app.use('/api/maps', mapRoutes);

app.use("/uploads", express.static("uploads"));


// WebSocket connection handling for real-time analytics
io.on('connection', (socket) => {
  console.log('A user connected to real-time analytics');

  // Handle admin dashboard connections
  socket.on('join-admin-room', (adminId) => {
    socket.join(`admin-${adminId}`);
    console.log(`Admin ${adminId} joined admin room`);
  });

  // Handle report dashboard connections
  socket.on('join-report-room', (userId) => {
    socket.join(`report-${userId}`);
    console.log(`User ${userId} joined report room`);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected from real-time analytics');
  });
});

// Make io available globally so routes can emit events
global.io = io;

const PORT = process.env.PORT || 5000;

const startServer = (port) => {
  server.listen(port, () => console.log(`Server running on port ${port}`));
};

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const newPort = PORT + 1;
    console.log(`Port ${PORT} is already in use. Trying port ${newPort}...`);
    startServer(newPort);
  } else {
    console.error('Server error:', err);
  }
});

// Try to start the server, and if it fails due to port in use, the error handler will try the next port
startServer(PORT);
