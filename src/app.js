const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes/index.js');
const errorMiddleware = require('./middleware/error.middleware.js');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

/* ----------------------------------------
   Global Middlewares
----------------------------------------- */
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

/* ----------------------------------------
   Rate Limit
----------------------------------------- */
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

/* ----------------------------------------
   API Routes
----------------------------------------- */
app.use('/api', routes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ----------------------------------------
   Health Check
----------------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ----------------------------------------
   Serve React/Angular in Production
----------------------------------------- */
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

/* ----------------------------------------
   Global Error Middleware
----------------------------------------- */
app.use(errorMiddleware);

module.exports = app;