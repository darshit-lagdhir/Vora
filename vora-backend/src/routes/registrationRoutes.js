import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validation.js';
import {
  createRegistrationSchema,
  updateRegistrationSchema,
  bulkUpdateRegistrationSchema,
} from '../utils/schemas.js';
import {
  createRegistration,
  getRegistrations,
  updateRegistrationStatus,
  bulkUpdateRegistrations
} from '../controllers/registrationController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const mutationLimiter = rateLimiter({
  limit: 15,
  windowMs: 60 * 1000,
  profileName: 'resource_modification'
});

// POST /api/v1/registrations (Requires JWT Authentication)
router.post('/', authenticate, mutationLimiter, validate(createRegistrationSchema), createRegistration);

// Administrative/Attendee Routes: Requires JWT authentication
router.get('/', authenticate, getRegistrations);
router.patch('/:id', authenticate, roleMiddleware(['organizer']), mutationLimiter, validate(updateRegistrationSchema), updateRegistrationStatus);
router.post('/bulk-update', authenticate, roleMiddleware(['organizer']), mutationLimiter, validate(bulkUpdateRegistrationSchema), bulkUpdateRegistrations);

export default router;
