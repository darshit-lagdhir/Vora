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

    logger.info({
      module: 'metricsMiddleware.js',
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs
    }, `HTTP Request: ${req.method} ${req.originalUrl || req.url} resolved with status ${res.statusCode} in ${durationMs}ms`);
  });

  next();
};
