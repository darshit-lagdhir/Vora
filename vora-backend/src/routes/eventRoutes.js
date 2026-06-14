import express from 'express';
import {
  authenticate,
  optionalAuthenticate
} from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validation.js';
import {
  createEventSchema,
  updateEventSchema,
  idParamsSchema,
  eventIdParamsSchema,
  createRegistrationSchema,
  launchPollSchema,
  submitVoteSchema,
  dispatchOverrideSchema,
} from '../utils/schemas.js';
import {
  createEvent,
  getAllEvents,
  getActiveEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventLiveStats
} from '../controllers/eventController.js';
import sessionRouter from './sessionRoutes.js';
import questionRouter from './questionRoutes.js';
import broadcastRouter from './broadcastRoutes.js';
import { createRegistration, cancelRegistration } from '../controllers/registrationController.js';
import { uploadResource, listEventResources } from '../controllers/resourceController.js';
import {
  streamEventUpdates,
  launchLivePoll,
  submitPollVote,
  terminateLivePoll,
  dispatchOverride,
  revokeOverride
} from '../controllers/sseController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const mutationLimiter = rateLimiter({
  limit: 15,
  windowMs: 60 * 1000,
  profileName: 'resource_modification'
});

// 1. Create Event: Requires authentication & Organizer RBAC clearance
router.post('/', authenticate, roleMiddleware(['organizer']), mutationLimiter, validate(createEventSchema), createEvent);

// 2. Read All Events: Employs optional authentication for role discrimination
router.get('/', optionalAuthenticate, getAllEvents);

// 2b. Read Active Events: Fetches active/published event streams for dashboards
router.get('/active', optionalAuthenticate, getActiveEvents);

// 3. Read Single Event: Employs optional authentication for role discrimination on drafts/cancellations
router.get('/:id', optionalAuthenticate, getEventById);

// 3b. Read Event Live Stats: Requires authentication & Organizer clearance
router.get('/:id/live-stats', authenticate, roleMiddleware(['organizer']), getEventLiveStats);

// 4. Update Event: Requires authentication & Organizer RBAC clearance
router.patch('/:id', authenticate, roleMiddleware(['organizer']), mutationLimiter, validate(updateEventSchema), updateEvent);

// 5. Delete Event: Requires authentication & Organizer RBAC clearance
router.delete('/:id', authenticate, roleMiddleware(['organizer']), mutationLimiter, deleteEvent);

// 5b. Attendee Registration Hook: Maps params to body payload to trigger createRegistration
router.post('/:id/register', authenticate, mutationLimiter, (req, res, next) => {
  req.body.event_id = req.params.id;
  createRegistration(req, res, next);
});

// 5c. Cancel Registration Hook: Destructive DELETE action
router.delete('/:id/register', authenticate, mutationLimiter, cancelRegistration);

// 5d. Post-Event Resources Hooks
router.get('/:eventId/resources', authenticate, listEventResources);
router.post('/:eventId/resources', authenticate, roleMiddleware(['organizer']), mutationLimiter, uploadResource);

// 6. Server-Sent Events unidirectional stream handshake
router.get('/:id/stream', optionalAuthenticate, streamEventUpdates);

// 7. Live audience polling REST endpoints
router.post('/:id/polls', authenticate, roleMiddleware(['organizer']), mutationLimiter, validate(launchPollSchema), launchLivePoll);
router.post('/:id/polls/vote', authenticate, mutationLimiter, validate(submitVoteSchema), submitPollVote);
router.post('/:id/polls/terminate', authenticate, roleMiddleware(['organizer']), mutationLimiter, terminateLivePoll);

// 8. Global operational warning banner overrides
router.post('/:id/override', authenticate, roleMiddleware(['organizer']), mutationLimiter, validate(dispatchOverrideSchema), dispatchOverride);
router.post('/:id/override/revoke', authenticate, roleMiddleware(['organizer']), mutationLimiter, revokeOverride);

// Nested sub-routing for child Sessions collection (Task 10) - Reload trigger
router.use('/:eventId/sessions', sessionRouter);

// Nested sub-routing for child Questions collection
router.use('/:eventId/questions', questionRouter);

// Nested sub-routing for child Broadcasts collection
router.use('/:eventId/broadcasts', broadcastRouter);

export default router;
