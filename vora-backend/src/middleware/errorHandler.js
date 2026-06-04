import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Global Express error handling middleware.
 * It intercepts all thrown errors, validation failures, or database exceptions,
 * formats them, and returns a sanitized payload based on the environment (development vs. production).
 *
 * In production, stack traces are NEVER exposed to the client.
 * A unique X-Request-Id header is injected for error correlation in log aggregation systems.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const errMessage = err.message || 'Internal Server Error';

  // Generate unique request identifier for production error tracing
  const requestId = crypto.randomUUID();

  // Log error telemetry internally on the server
  console.error(`[Error Middleware] [${requestId}] [${req.method}] ${req.url} - Status ${statusCode} - Error: ${errMessage}`);
  if (err.stack) {
    // In production, we log the full stack trace to the terminal, but do NOT send it to the client.
    console.error(err.stack);
  }

  // Inject correlation header for production monitoring
  res.setHeader('X-Request-Id', requestId);

  // Response configuration
  const responsePayload = {
    success: false,
    status: statusCode,
    message: env.NODE_ENV === 'production' && statusCode === 500 
      ? 'An unexpected error occurred on the server.' 
      : errMessage,
    requestId,
  };

  // Expose additional debugging metrics ONLY in development mode
  if (env.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
    responsePayload.details = err.details || null;
  }

  return res.status(statusCode).json(responsePayload);
};

export default errorHandler;
