import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validation.js';
import { triggerExportSchema } from '../utils/schemas.js';
import {
  getTasks,
  getTaskStatus,
  triggerLedgerExport
} from '../controllers/taskController.js';

const router = express.Router();

// All background task endpoints require Organizer authentication
router.get('/', authenticate, roleMiddleware(['organizer']), getTasks);
router.get('/:id/status', authenticate, roleMiddleware(['organizer']), getTaskStatus);
router.post('/export-ledger', authenticate, roleMiddleware(['organizer']), validate(triggerExportSchema), triggerLedgerExport);

export default router;
