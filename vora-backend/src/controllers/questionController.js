import pool from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';
import { eventHub } from '../utils/eventHub.js';

/**
 * Retrieve all questions for a specific event sorted by upvotes and timestamp
 * GET /api/v1/events/:eventId/questions
 */
export const getEventQuestions = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  const result = await pool.query(
    'SELECT id, event_id, attendee_name, question_text, upvotes, created_at FROM questions WHERE event_id = $1 ORDER BY upvotes DESC, created_at DESC',
    [eventId]
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

/**
 * Submit a new question for an event
 * POST /api/v1/events/:eventId/questions
 */
export const createQuestion = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  // Zod schema has already validated question_text (min 10 chars, trimmed)
  const { question_text } = req.body;

  const attendeeName = `${req.user.firstName} ${req.user.lastName || ''}`.trim() || 'Anonymous';

  const result = await pool.query(
    'INSERT INTO questions (event_id, attendee_name, question_text) VALUES ($1, $2, $3) RETURNING *',
    [eventId, attendeeName, question_text.trim()]
  );

  const question = result.rows[0];

  // Publish question added update asynchronously to the event hub
  eventHub.emit('event_mutate', {
    eventId,
    eventType: 'QUESTION_ADDED',
    payload: question
  });

  res.status(201).json({
    success: true,
    data: question,
  });
});

/**
 * Increment upvote count for a target question
 * POST /api/v1/events/:eventId/questions/:questionId/upvote
 */
export const upvoteQuestion = asyncHandler(async (req, res, next) => {
  const { questionId } = req.params;

  const result = await pool.query(
    'UPDATE questions SET upvotes = upvotes + 1 WHERE id = $1 RETURNING *',
    [questionId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Question not found or does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  const question = result.rows[0];

  // Publish question upvoted update asynchronously to the event hub
  eventHub.emit('event_mutate', {
    eventId: question.event_id,
    eventType: 'QUESTION_UPVOTED',
    payload: {
      questionId,
      upvotes: question.upvotes
    }
  });

  res.status(200).json({
    success: true,
    data: question,
  });
});
