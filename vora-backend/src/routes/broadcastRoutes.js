import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validation.js';
import {
  createBroadcastSchema,
  updateTriggersSchema,
} from '../utils/schemas.js';
import {
  getEventBroadcasts,
  createEventBroadcast,
  getEventTriggers,
  updateEventTriggers
} from '../controllers/broadcastController.js';

const router = express.Router({ mergeParams: true });

// Require authentication and Organizer RBAC validation across all actions
router.use(authenticate, roleMiddleware(['organizer']));

router.route('/')
  .get(getEventBroadcasts)
  .post(validate(createBroadcastSchema), createEventBroadcast);

router.route('/triggers')
  .get(getEventTriggers)
  .put(validate(updateTriggersSchema), updateEventTriggers);

export default router;
