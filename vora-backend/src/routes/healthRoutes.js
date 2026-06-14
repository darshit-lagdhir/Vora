import express from 'express';
import { getLiveHealth, getDeepHealth } from '../controllers/healthController.js';

const router = express.Router();

// Bypasses standard authentication, token checking, and rate limits
router.get('/live', getLiveHealth);
router.get('/deep', getDeepHealth);

export default router;
