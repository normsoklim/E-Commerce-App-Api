const errorMiddleware = (err, req, res, next) => {
  console.error('❌ ERROR:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
};

module.exports = errorMiddleware;