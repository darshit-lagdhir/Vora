import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validation.js';
import { uploadResourceBodySchema } from '../utils/schemas.js';
import {
  uploadResource,
  listEventResources,
  generateDownloadLink,
  downloadResourceFile,
  deleteResource,
} from '../controllers/resourceController.js';

const router = express.Router();

// ─── Multer Configuration ────────────────────────────────────────────────────
// Use memory storage so the buffer is available for magic-number byte inspection
// before the file is persisted to disk under a cryptographic filename.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB strict ceiling
    files: 1,                    // Single file per request
  },
});

// ─── Protected Organizer Routes ──────────────────────────────────────────────

// POST /api/v1/resources — Upload a new resource asset (Organizer only)
// Note: validation runs AFTER multer parses multipart form data
router.post(
  '/',
  authenticate,
  roleMiddleware(['organizer']),
  upload.single('file'),
  validate(uploadResourceBodySchema),
  uploadResource
);

// DELETE /api/v1/resources/:id — Purge a resource from storage (Organizer only)
router.delete(
  '/:id',
  authenticate,
  roleMiddleware(['organizer']),
  deleteResource
);

// ─── Authenticated Routes (Organizer OR Attendee) ────────────────────────────

// GET /api/v1/resources/event/:eventId — List all resources for an event
router.get(
  '/event/:eventId',
  authenticate,
  listEventResources
);

// GET /api/v1/resources/download-token/:id — Generate a time-limited signed download URL
router.get(
  '/download-token/:id',
  authenticate,
  generateDownloadLink
);

// ─── Public Token-Gated Route ────────────────────────────────────────────────

// GET /api/v1/resources/download-file?token=<JWT> — Stream the file binary
// No auth middleware: the signed download token IS the authorization mechanism.
router.get(
  '/download-file',
  downloadResourceFile
);

export default router;
