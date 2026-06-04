import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { 
  createRegistration,
  getRegistrations,
  updateRegistrationStatus,
  bulkUpdateRegistrations
} from '../controllers/registrationController.js';

import env from '../config/env.js';

const router = express.Router();

// Strict Checkout Rate Limiter: 15 registration requests per minute per IP address in production, relaxed in development
const checkoutRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'production' ? 15 : 1000, // Limit each IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many registration checkout attempts. Please wait a minute before trying again.'
  }
});

// POST /api/v1/registrations (Requires JWT Authentication)
router.post('/', authenticate, checkoutRateLimiter, createRegistration);

// Administrative Routes: Requires JWT authentication and Organizer Role validation
router.get('/', authenticate, authorize(['organizer']), getRegistrations);
router.patch('/:id', authenticate, authorize(['organizer']), updateRegistrationStatus);
router.post('/bulk-update', authenticate, authorize(['organizer']), bulkUpdateRegistrations);

export default router;
