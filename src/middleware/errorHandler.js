const logger = require("../utils/logger");

const TAG = "Error:Handler";

/**
 * Centralized Express error handler middleware
 */
function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 400;
  const message = err.message || "An unexpected server error occurred.";

  logger.error(TAG, `[${req.method}] ${req.originalUrl} - ${status}: ${message}`);

  res.status(status).json({
    success: false,
    error: message
  });
}

/**
 * 404 Not Found handler for undefined API routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `API route not found: [${req.method}] ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
