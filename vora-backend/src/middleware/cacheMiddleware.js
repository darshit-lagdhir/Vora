import crypto from 'crypto';
import { cacheGet, cacheSet } from '../config/redis.js';

/**
 * Route interceptor caching middleware factory.
 * @param {number} ttlSeconds - Time-To-Live for cached entries in seconds.
 * @param {string} [domain] - Optional custom domain tag (e.g. 'events' or 'analytics').
 */
export const cacheRoute = (ttlSeconds, domain) => {
  return async (req, res, next) => {
    // Read-only request check: Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Determine the domain tag
    const domainTag = domain || (req.baseUrl.includes('analytics') ? 'analytics' : 'events');

    // Generate isolated, deterministic cache key
    const pathStr = req.baseUrl + req.path;
    const query = req.query || {};
    const sortedQueryString = Object.keys(query)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');
    const userRole = req.user?.role || '';
    const combinedString = `${pathStr}:${userRole}:${sortedQueryString}`;
    const hash = crypto.createHash('sha256').update(combinedString).digest('hex');
    const cacheKey = `vora:cache:${hash}:domain:${domainTag}`;

    try {
      // Check cache store
      const cachedPayload = await cacheGet(cacheKey);
      if (cachedPayload) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        return res.send(cachedPayload);
      }
    } catch (err) {
      console.warn('[Cache Middleware Warning] Error querying cache, falling back to database:', err.message);
    }

    // Intercept res.json to capture downstream response
    const originalJson = res.json;
    res.json = function (body) {
      res.json = originalJson; // Restore standard method immediately to prevent recursion

      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const stringified = JSON.stringify(body);
          cacheSet(cacheKey, stringified, ttlSeconds).catch((err) => {
            console.warn(`[Cache Middleware Warning] Failed to write cache key "${cacheKey}": ${err.message}`);
          });
        } catch (err) {
          console.warn('[Cache Middleware Warning] Failed to stringify cache payload:', err.message);
        }
      }

      res.setHeader('X-Cache', 'MISS');
      return originalJson.call(this, body);
    };

    next();
  };
};
