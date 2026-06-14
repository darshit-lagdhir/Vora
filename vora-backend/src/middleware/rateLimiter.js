import crypto from 'crypto';
import { client, isRedisPassThrough } from '../config/redis.js';
import { getClientIp, registerRateLimitBreach } from '../services/securityService.js';

/**
 * Redis-backed distributed sliding-window token-bucket rate limiter middleware factory.
 * @param {Object} options Configuration parameters.
 * @param {number} options.limit Strict maximum request execution threshold.
 * @param {number} options.windowMs Rolling window size in milliseconds.
 * @param {string} options.profileName Volumetric configuration profile name.
 */
export const rateLimiter = (options) => {
  const { limit, windowMs, profileName } = options;

  return async (req, res, next) => {
    // If Redis is offline or running under Jest pass-through, bypass rate limiting silently
    if (isRedisPassThrough() || !client || !client.isOpen) {
      return next();
    }

    const ip = getClientIp(req);
    // Wrap IPv6 addresses to prevent colon delimiters from corrupting Redis namespaces
    const formattedIp = ip.includes(':') ? `[${ip}]` : ip;
    
    // Concatenate IP with path to isolate endpoint tracking buckets
    const routeKey = `rate_limit:${profileName}:${formattedIp}:${req.baseUrl + req.path}`;
    const now = Date.now();
    const uniqueValue = `${now}:${crypto.randomUUID()}`;

    try {
      // Execute pipeline operations atomically
      const multi = client.multi();
      multi.zRemRangeByScore(routeKey, '-inf', `(${now - windowMs})`);
      multi.zCard(routeKey);
      multi.zAdd(routeKey, { score: now, value: uniqueValue });
      // Set TTL to double the window duration to prune dormant keys automatically
      multi.expire(routeKey, Math.ceil((windowMs * 2) / 1000));

      const results = await multi.exec();
      const count = results[1]; // Result of the ZCARD operation

      const activeCount = count + 1; // Include the current request
      const remaining = Math.max(0, limit - activeCount);

      // Append standard network response tracking headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (activeCount > limit) {
        // Fetch oldest score in the sorted set to calculate Retry-After boundary
        const oldestArray = await client.zRangeWithScores(routeKey, 0, 0);
        let retryAfterSeconds = Math.ceil(windowMs / 1000);

        if (oldestArray && oldestArray.length > 0) {
          const oldestScore = oldestArray[0].score;
          retryAfterSeconds = Math.ceil(((oldestScore + windowMs) - now) / 1000);
        }
        
        retryAfterSeconds = Math.max(1, retryAfterSeconds);

        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('Retry-After', String(retryAfterSeconds));

        // Asynchronously log breach to evaluate IP intelligence banning triggers
        registerRateLimitBreach(ip, profileName).catch((err) => {
          console.warn(`[Security Service Warning] IP Correlation breach registration failed for ${ip}: ${err.message}`);
        });

        const error = new Error('Too many requests. IP address rate limit exceeded.');
        error.statusCode = 429;
        return next(error);
      }

      next();
    } catch (err) {
      console.warn(`[Rate Limiter Warning] Sliding window operation failed for ${ip}, routing request via fallback: ${err.message}`);
      next();
    }
  };
};
