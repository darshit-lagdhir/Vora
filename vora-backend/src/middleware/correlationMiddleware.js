import crypto from 'crypto';
import { als } from '../utils/als.js';

/**
 * Propagates correlation IDs across horizontal nodes using AsyncLocalStorage context.
 */
export const correlationMiddleware = (req, res, next) => {
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    crypto.randomUUID();

  // Set correlation headers on active client response
  res.setHeader('X-Correlation-Id', correlationId);
  res.setHeader('X-Request-Id', correlationId);

  // Initialize store and run downstream chain in ALS context
  const store = { correlationId, userId: null };
  als.run(store, () => {
    next();
  });
};
