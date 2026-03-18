const logger = require('../utils/logger');

// Global error handler — catches all unhandled errors from routes
function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack?.split('\n').slice(0, 3).join(' | '),
    method: req.method,
    url: req.originalUrl,
    body: req.body ? JSON.stringify(req.body).slice(0, 200) : undefined,
  });

  // Don't leak error details in production
  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack?.split('\n').slice(0, 3) })
  });
}

// Catch async errors in route handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };
