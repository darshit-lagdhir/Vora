import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validation.js';
import { analyticsQuerySchema } from '../utils/schemas.js';
import {
  getOrganizerAnalytics,
  exportOrganizerLedger,
} from '../controllers/analyticsController.js';
import { cacheRoute } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// 1. Fetch Analytics data: aggregates registrations, downloads, and custom timeframes
router.get('/', authenticate, roleMiddleware(['organizer']), validate(analyticsQuerySchema, 'query'), cacheRoute(600, 'analytics'), getOrganizerAnalytics);

// 2. Export Ledger: generates and downloads CSV reports of registrations
router.get('/export', authenticate, roleMiddleware(['organizer']), exportOrganizerLedger);

export default router;
