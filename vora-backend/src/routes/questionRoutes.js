import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validation.js';
import { createQuestionSchema } from '../utils/schemas.js';
import {
  getEventQuestions,
  createQuestion,
  upvoteQuestion,
} from '../controllers/questionController.js';

// Enable mergeParams to inherit :eventId from parent router
const router = express.Router({ mergeParams: true });

// 1. Read All Questions for the Event: Sourced from eventId
router.get('/', authenticate, getEventQuestions);

// 2. Submit Question: Associates question with eventId and authenticated user
router.post('/', authenticate, validate(createQuestionSchema), createQuestion);

// 3. Upvote Question: Registers vote incrementing upvotes column for the target question ID
router.post('/:questionId/upvote', authenticate, upvoteQuestion);

export default router;
