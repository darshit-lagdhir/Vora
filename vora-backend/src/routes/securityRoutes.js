import express from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validation.js';
import { logViolationSchema } from '../utils/schemas.js';
import {
  getAuditLogs,
  getWafStats,
  triggerDefconLockdown,
  logRbacViolation,
  generateKeyPair,
  verifySignature
} from '../controllers/securityController.js';
import {
  validateGenerateKeyPairPayload,
  validateVerifySignaturePayload
} from '../middleware/ffiValidationMiddleware.js';

const router = express.Router();

// Protected endpoints requiring Organizer authentication
router.get('/audit-logs', authenticate, roleMiddleware(['organizer']), getAuditLogs);
router.get('/waf-stats', authenticate, roleMiddleware(['organizer']), getWafStats);
router.post('/defcon', authenticate, roleMiddleware(['organizer']), triggerDefconLockdown);
router.post('/generate-key', authenticate, roleMiddleware(['organizer']), validateGenerateKeyPairPayload, generateKeyPair);
router.post('/verify-signature', authenticate, roleMiddleware(['organizer']), validateVerifySignaturePayload, verifySignature);

// Anonymous or authenticated violation logger
router.post('/log-violation', optionalAuthenticate, validate(logViolationSchema), logRbacViolation);

export default router;
