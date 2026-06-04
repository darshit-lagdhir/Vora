import express from 'express';
import { 
  authenticate, 
  authorize, 
  optionalAuthenticate 
} from '../middleware/authMiddleware.js';
import {
  createEvent,
  getAllEvents,
  getActiveEvents,
  getEventById,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';
import sessionRouter from './sessionRoutes.js';

const router = express.Router();

// 1. Create Event: Requires authentication & Organizer RBAC clearance
router.post('/', authenticate, authorize(['organizer']), createEvent);

// 2. Read All Events: Employs optional authentication for role discrimination
router.get('/', optionalAuthenticate, getAllEvents);

// 2b. Read Active Events: Fetches active/published event streams for dashboards
router.get('/active', optionalAuthenticate, getActiveEvents);

// 3. Read Single Event: Employs optional authentication for role discrimination on drafts/cancellations
router.get('/:id', optionalAuthenticate, getEventById);

// 4. Update Event: Requires authentication & Organizer RBAC clearance
router.patch('/:id', authenticate, authorize(['organizer']), updateEvent);

// 5. Delete Event: Requires authentication & Organizer RBAC clearance
router.delete('/:id', authenticate, authorize(['organizer']), deleteEvent);

// Nested sub-routing for child Sessions collection (Task 10) - Reload trigger
router.use('/:eventId/sessions', sessionRouter);

export default router;
