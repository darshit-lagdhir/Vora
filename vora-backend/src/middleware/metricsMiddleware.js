import logger from '../services/loggerService.js';

/**
 * Captures request latency with microsecond precision using high-resolution timers.
 */
export const metricsMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    // Convert duration to milliseconds
    const durationMs = parseFloat((elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(3));
    const statusCode = res.statusCode;

    const logPayload = {
      module: 'metricsMiddleware.js',
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs
    };
    const logMsg = `HTTP Request: ${req.method} ${req.originalUrl || req.url} resolved with status ${statusCode} in ${durationMs}ms`;

    if (statusCode >= 500) {
      logger.error(logPayload, logMsg);
    } else if (statusCode >= 400) {
      logger.warn(logPayload, logMsg);
    } else if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production') {
      logger.info(logPayload, logMsg);
    }
  });

  next();
};
