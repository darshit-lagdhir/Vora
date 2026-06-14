import pool from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createBackgroundTask } from './taskController.js';

/**
 * 1. Read Event Broadcasts (GET /api/v1/events/:eventId/broadcasts)
 */
export const getEventBroadcasts = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  const result = await pool.query(
    'SELECT * FROM broadcasts WHERE event_id = $1 ORDER BY created_at DESC',
    [eventId]
  );

  res.status(200).json({
    success: true,
    data: result.rows
  });
});

/**
 * 2. Create Event Broadcast (POST /api/v1/events/:eventId/broadcasts)
 */
export const createEventBroadcast = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  // Zod schema has already validated subject, content, and audience_cohort
  const { subject, content, audience_cohort } = req.body;

  // Insert broadcast with 'sending' status
  const result = await pool.query(
    `INSERT INTO broadcasts (event_id, subject, content, audience_cohort, status)
     VALUES ($1, $2, $3, $4, 'sending')
     RETURNING *`,
    [eventId, subject.trim(), content.trim(), audience_cohort]
  );

  const newBroadcast = result.rows[0];

  // Register in background operations ledger
  createBackgroundTask('MASS BROADCAST DISPATCH', { 
    eventId, 
    broadcastId: newBroadcast.id,
    subject: newBroadcast.subject 
  });

  // Background timer simulation of SMTP processing (12 seconds)
  setTimeout(async () => {
    try {
      await pool.query(
        `UPDATE broadcasts SET status = 'delivered', updated_at = NOW() WHERE id = $1`,
        [newBroadcast.id]
      );
    } catch (err) {
      console.error('[Broadcast Engine] Delayed SMTP simulation update failed:', err);
    }
  }, 12000);

  res.status(202).json({
    success: true,
    message: 'Manual broadcast dispatch initiated asynchronously.',
    data: newBroadcast
  });
});

/**
 * 3. Read Event Triggers (GET /api/v1/events/:eventId/broadcasts/triggers)
 */
export const getEventTriggers = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  const result = await pool.query(
    `SELECT trigger_registration_confirmation, trigger_t_minus_24h, trigger_t_minus_1h, trigger_t_plus_24h 
     FROM events 
     WHERE id = $1`,
    [eventId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    return next(error);
  }

  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

/**
 * 4. Update Event Triggers (PUT /api/v1/events/:eventId/broadcasts/triggers)
 */
export const updateEventTriggers = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  const { 
    trigger_registration_confirmation, 
    trigger_t_minus_24h, 
    trigger_t_minus_1h, 
    trigger_t_plus_24h 
  } = req.body;

  const result = await pool.query(
    `UPDATE events 
     SET trigger_registration_confirmation = $1,
         trigger_t_minus_24h = $2,
         trigger_t_minus_1h = $3,
         trigger_t_plus_24h = $4,
         updated_at = NOW() 
     WHERE id = $5 
     RETURNING trigger_registration_confirmation, trigger_t_minus_24h, trigger_t_minus_1h, trigger_t_plus_24h`,
    [
      trigger_registration_confirmation === true,
      trigger_t_minus_24h === true,
      trigger_t_minus_1h === true,
      trigger_t_plus_24h === true,
      eventId
    ]
  );

  if (result.rows.length === 0) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    return next(error);
  }

  res.status(200).json({
    success: true,
    message: 'Automated temporal triggers updated successfully.',
    data: result.rows[0]
  });
});
