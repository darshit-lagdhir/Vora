import express from 'express';
import rateLimit from 'express-rate-limit';
import { exploreEvents } from '../controllers/exploreController.js';

import env from '../config/env.js';

const router = express.Router();

// Public Rate Limiter: 30 requests per minute per IP address in production, relaxed in development
const exploreRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'production' ? 30 : 1000, // Limit each IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many search queries. Please wait a minute before searching again.'
  }
});

// GET /api/v1/explore/events
router.get('/events', exploreRateLimiter, exploreEvents);

export default router;
