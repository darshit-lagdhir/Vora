import express from 'express';
import { validate } from '../middleware/validation.js';
import { exploreQuerySchema } from '../utils/schemas.js';
import { exploreEvents } from '../controllers/exploreController.js';
import { cacheRoute } from '../middleware/cacheMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const readLimiter = rateLimiter({
  limit: 100,
  windowMs: 60 * 1000,
  profileName: 'public_read'
});

// GET /api/v1/explore/events
router.get('/events', readLimiter, validate(exploreQuerySchema, 'query'), cacheRoute(60, 'events'), exploreEvents);

export default router;
