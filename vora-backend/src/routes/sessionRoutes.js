import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validation.js';
import {
  createSessionSchema,
  updateSessionSchema,
} from '../utils/schemas.js';
import {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession
} from '../controllers/sessionController.js';

// Parameter merging is enabled strictly to resolve parent eventId context (Task 10)
const router = express.Router({ mergeParams: true });

// 1. Create Session: Requires authentication & Organizer RBAC clearance
router.post('/', authenticate, roleMiddleware(['organizer']), validate(createSessionSchema), createSession);

// 2. Read All Sessions: Fetches all child sessions for the parent event scope
router.get('/', getAllSessions);

// 3. Read Single Session: Fetches hydrated session details
router.get('/:id', getSessionById);

// 4. Update Session: Requires authentication & Organizer RBAC clearance
router.patch('/:id', authenticate, roleMiddleware(['organizer']), validate(updateSessionSchema), updateSession);

// 5. Delete Session: Requires authentication & Organizer RBAC clearance
router.delete('/:id', authenticate, roleMiddleware(['organizer']), deleteSession);

export default router;
