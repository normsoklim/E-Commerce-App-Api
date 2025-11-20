require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

/* ----------------------------------------
   1. Connect to Database
----------------------------------------- */
(async () => {
  try {
    await connectDB();
    console.log("✔ Database connected");

    /* ----------------------------------------
       2. Start API Server
    ----------------------------------------- */
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    /* ----------------------------------------
       3. Handle Unexpected Errors
    ----------------------------------------- */
    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Rejection:', err.message);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err.message);
      server.close(() => process.exit(1));
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();





