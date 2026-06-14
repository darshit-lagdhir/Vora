import pool from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';

// Regular expression to validate standard UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 1. Create Session (POST /api/v1/events/:eventId/sessions)
 * Creates a child session within the boundary lifespan of the parent event, enforcing overlap guards.
 */
export const createSession = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  const { 
    session_title, 
    session_description, 
    session_start_time, 
    session_end_time, 
    track_name, 
    speaker_id, 
    session_capacity_limit 
  } = req.body;

  // Validate eventId UUID structure
  if (!UUID_REGEX.test(eventId)) {
    const error = new Error('Invalid parent event reference: Parameter must represent a valid UUID.');
    error.statusCode = 400;
    return next(error);
  }

  // Sanitize and validate required input strings
  const cleanTitle = session_title?.trim();
  const cleanTrack = track_name?.trim();
  const cleanDescription = session_description?.trim();

  if (!cleanTitle || cleanTitle.length > 255) {
    const error = new Error('Session title is required and must not exceed 255 characters.');
    error.statusCode = 400;
    return next(error);
  }

  if (!cleanTrack || cleanTrack.length > 100) {
    const error = new Error('Track allocation is required and must not exceed 100 characters.');
    error.statusCode = 400;
    return next(error);
  }

  if (!session_start_time || !session_end_time) {
    const error = new Error('Both start and end timestamps are required to schedule a session.');
    error.statusCode = 400;
    return next(error);
  }

  const startDate = new Date(session_start_time);
  const endDate = new Date(session_end_time);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const error = new Error('Invalid temporal formats: Timestamps must represent valid dates.');
    error.statusCode = 400;
    return next(error);
  }

  if (endDate <= startDate) {
    const error = new Error('Invalid chronological sequence: Session end time must follow start time.');
    error.statusCode = 400;
    return next(error);
  }

  // Capacity validation
  let capacity = null;
  if (session_capacity_limit !== undefined && session_capacity_limit !== null) {
    capacity = parseInt(session_capacity_limit, 10);
    if (isNaN(capacity) || capacity <= 0) {
      const error = new Error('Capacity limit must be a positive integer.');
      error.statusCode = 400;
      return next(error);
    }
  }

  // Fetch parent event metadata (Task 3)
  const eventResult = await pool.query(
    'SELECT organizer_id, start_timestamp, end_timestamp FROM events WHERE id = $1',
    [eventId]
  );
  if (eventResult.rows.length === 0) {
    const error = new Error('Parent event resource not found.');
    error.statusCode = 404;
    return next(error);
  }

  const parentEvent = eventResult.rows[0];

  // Parental ownership lock check (Task 5)
  if (parentEvent.organizer_id !== req.user.id) {
    const error = new Error('Access Denied: You do not possess ownership privileges to alter this event.');
    error.statusCode = 403;
    return next(error);
  }

  // Hierarchical chronological bounding logic (Task 3)
  const eventStart = new Date(parentEvent.start_timestamp);
  const eventEnd = new Date(parentEvent.end_timestamp);

  if (startDate < eventStart || endDate > eventEnd) {
    const error = new Error('Temporal Boundary Violation: Session Schedule Exceeds Parent Event Lifespan.');
    error.statusCode = 400;
    return next(error);
  }

  // Speaker UUID validation if provided
  let cleanSpeakerId = null;
  if (speaker_id) {
    if (!UUID_REGEX.test(speaker_id)) {
      const error = new Error('Invalid speaker reference: Speaker ID must be a valid UUID.');
      error.statusCode = 400;
      return next(error);
    }
    const speakerCheck = await pool.query('SELECT id FROM profiles WHERE id = $1', [speaker_id]);
    if (speakerCheck.rows.length === 0) {
      const error = new Error('Target speaker profile does not exist.');
      error.statusCode = 400;
      return next(error);
    }
    cleanSpeakerId = speaker_id;
  }

  // Multi-track temporal collision check (Task 4)
  const collisionQuery = `
    SELECT id, session_title FROM sessions
    WHERE event_id = $1
      AND (track_name = $2 OR (speaker_id IS NOT NULL AND speaker_id = $3))
      AND (session_start_time < $4 AND session_end_time > $5)
  `;
  const collisionValues = [eventId, cleanTrack, cleanSpeakerId, endDate.toISOString(), startDate.toISOString()];
  const collisionResult = await pool.query(collisionQuery, collisionValues);

  if (collisionResult.rows.length > 0) {
    const conflictName = collisionResult.rows[0].session_title;
    const error = new Error(`Scheduling Conflict: The designated track or speaker is already allocated during this precise chronological window (conflicts with "${conflictName}").`);
    error.statusCode = 409;
    return next(error);
  }

  // Transactional insertion (Task 5)
  const insertQuery = `
    INSERT INTO sessions (event_id, speaker_id, session_title, session_description, session_start_time, session_end_time, track_name, session_capacity_limit)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const insertValues = [
    eventId,
    cleanSpeakerId,
    cleanTitle,
    cleanDescription || null,
    startDate.toISOString(),
    endDate.toISOString(),
    cleanTrack,
    capacity
  ];

  const insertResult = await pool.query(insertQuery, insertValues);
  const newSession = insertResult.rows[0];

  res.status(201).json({
    success: true,
    message: 'Session schedule node instantiated successfully.',
    data: newSession
  });
});

/**
 * 2. Read All Sessions (GET /api/v1/events/:eventId/sessions)
 * Fetches all sessions for an event sorted chronologically and by track (Task 6).
 */
export const getAllSessions = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  if (!UUID_REGEX.test(eventId)) {
    const error = new Error('Invalid event reference: Parameter must represent a valid UUID.');
    error.statusCode = 400;
    return next(error);
  }

  const queryText = `
    SELECT s.*, 
           p.first_name as speaker_first_name, 
           p.last_name as speaker_last_name, 
           p.avatar_url as speaker_avatar_url
    FROM sessions s
    LEFT JOIN profiles p ON s.speaker_id = p.id
    WHERE s.event_id = $1
    ORDER BY s.session_start_time ASC, s.track_name ASC
  `;

  const result = await pool.query(queryText, [eventId]);

  res.status(200).json({
    success: true,
    data: result.rows
  });
});

/**
 * 3. Read Single Session (GET /api/v1/events/:eventId/sessions/:id)
 * Fetches specific session with deep speaker profile joins and registration indicators (Task 7).
 */
export const getSessionById = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;

  if (!UUID_REGEX.test(eventId) || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid path parameters: Both Event and Session identifiers must represent valid UUID formats.');
    error.statusCode = 400;
    return next(error);
  }

  const queryText = `
    SELECT s.*,
           p.first_name as speaker_first_name,
           p.last_name as speaker_last_name,
           p.avatar_url as speaker_avatar_url,
           p.platform_role as speaker_platform_role,
           p.email_address as speaker_email_address,
           COALESCE((SELECT COUNT(*)::integer FROM registrations r WHERE r.event_id = s.event_id AND r.registration_status = 'confirmed'), 0) as event_attendees_count
    FROM sessions s
    LEFT JOIN profiles p ON s.speaker_id = p.id
    WHERE s.event_id = $1 AND s.id = $2
  `;

  const result = await pool.query(queryText, [eventId, id]);

  if (result.rows.length === 0) {
    const error = new Error('Resource not found: No session registered under the provided identifier.');
    error.statusCode = 404;
    return next(error);
  }

  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

/**
 * 4. Update Session (PATCH /api/v1/events/:eventId/sessions/:id)
 * Validates scheduling boundary limits and checks for sibling track/speaker overlaps (Task 8).
 */
export const updateSession = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;

  if (!UUID_REGEX.test(eventId) || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid path parameters: Both Event and Session identifiers must represent valid UUID formats.');
    error.statusCode = 400;
    return next(error);
  }

  // Retrieve current session and parent event
  const sessionResult = await pool.query('SELECT * FROM sessions WHERE id = $1 AND event_id = $2', [id, eventId]);
  if (sessionResult.rows.length === 0) {
    const error = new Error('Target session resource does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  const existingSession = sessionResult.rows[0];

  const eventResult = await pool.query(
    'SELECT organizer_id, start_timestamp, end_timestamp FROM events WHERE id = $1',
    [eventId]
  );
  const parentEvent = eventResult.rows[0];

  // Organizer ownership verification
  if (parentEvent.organizer_id !== req.user.id) {
    const error = new Error('Access Denied: You do not possess ownership privileges to alter this event.');
    error.statusCode = 403;
    return next(error);
  }

  const whitelistedKeys = [
    'session_title', 
    'session_description', 
    'session_start_time', 
    'session_end_time', 
    'track_name', 
    'speaker_id', 
    'session_capacity_limit'
  ];
  const updates = {};

  for (const key of whitelistedKeys) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    const error = new Error('No valid parameters provided for session update.');
    error.statusCode = 400;
    return next(error);
  }

  // Parse title
  if (updates.session_title !== undefined) {
    const cleanTitle = updates.session_title?.trim();
    if (!cleanTitle || cleanTitle.length > 255) {
      const error = new Error('Session title must not be empty and must not exceed 255 characters.');
      error.statusCode = 400;
      return next(error);
    }
    updates.session_title = cleanTitle;
  }

  // Parse track
  if (updates.track_name !== undefined) {
    const cleanTrack = updates.track_name?.trim();
    if (!cleanTrack || cleanTrack.length > 100) {
      const error = new Error('Track allocation must not be empty and must not exceed 100 characters.');
      error.statusCode = 400;
      return next(error);
    }
    updates.track_name = cleanTrack;
  }

  // Parse capacity limit
  if (updates.session_capacity_limit !== undefined) {
    if (updates.session_capacity_limit === null) {
      updates.session_capacity_limit = null;
    } else {
      const parsedCap = parseInt(updates.session_capacity_limit, 10);
      if (isNaN(parsedCap) || parsedCap <= 0) {
        const error = new Error('Capacity limit must be a positive integer.');
        error.statusCode = 400;
        return next(error);
      }
      updates.session_capacity_limit = parsedCap;
    }
  }

  // Check temporal scheduling bounds if dates are modified
  const proposedStart = updates.session_start_time ? new Date(updates.session_start_time) : new Date(existingSession.session_start_time);
  const proposedEnd = updates.session_end_time ? new Date(updates.session_end_time) : new Date(existingSession.session_end_time);

  if (isNaN(proposedStart.getTime()) || isNaN(proposedEnd.getTime())) {
    const error = new Error('Invalid temporal formats: Timestamps must represent valid dates.');
    error.statusCode = 400;
    return next(error);
  }

  if (proposedEnd <= proposedStart) {
    const error = new Error('Invalid chronological sequence: Session end time must follow start time.');
    error.statusCode = 400;
    return next(error);
  }

  const eventStart = new Date(parentEvent.start_timestamp);
  const eventEnd = new Date(parentEvent.end_timestamp);

  if (proposedStart < eventStart || proposedEnd > eventEnd) {
    const error = new Error('Temporal Boundary Violation: Session Schedule Exceeds Parent Event Lifespan.');
    error.statusCode = 400;
    return next(error);
  }

  // Validate speaker ID changes
  let proposedSpeaker = existingSession.speaker_id;
  if (updates.speaker_id !== undefined) {
    if (updates.speaker_id === null) {
      proposedSpeaker = null;
      updates.speaker_id = null;
    } else {
      if (!UUID_REGEX.test(updates.speaker_id)) {
        const error = new Error('Invalid speaker reference: Speaker ID must be a valid UUID.');
        error.statusCode = 400;
        return next(error);
      }
      const speakerCheck = await pool.query('SELECT id FROM profiles WHERE id = $1', [updates.speaker_id]);
      if (speakerCheck.rows.length === 0) {
        const error = new Error('Target speaker profile does not exist.');
        error.statusCode = 400;
        return next(error);
      }
      proposedSpeaker = updates.speaker_id;
    }
  }

  // Re-run overlap collision guards excluding target session ID (Task 8)
  const proposedTrack = updates.track_name !== undefined ? updates.track_name : existingSession.track_name;

  const collisionQuery = `
    SELECT id, session_title FROM sessions
    WHERE event_id = $1
      AND id != $2
      AND (track_name = $3 OR (speaker_id IS NOT NULL AND speaker_id = $4))
      AND (session_start_time < $5 AND session_end_time > $6)
  `;
  const collisionValues = [eventId, id, proposedTrack, proposedSpeaker, proposedEnd.toISOString(), proposedStart.toISOString()];
  const collisionResult = await pool.query(collisionQuery, collisionValues);

  if (collisionResult.rows.length > 0) {
    const conflictName = collisionResult.rows[0].session_title;
    const error = new Error(`Scheduling Conflict: The updated track or speaker booking overlaps with "${conflictName}".`);
    error.statusCode = 409;
    return next(error);
  }

  // Format ISO strings
  if (updates.session_start_time) updates.session_start_time = proposedStart.toISOString();
  if (updates.session_end_time) updates.session_end_time = proposedEnd.toISOString();

  // Perform dynamic update write
  const keys = Object.keys(updates);
  const setClauses = keys.map((key, index) => `${key} = $${index + 1}`);
  const queryText = `
    UPDATE sessions
    SET ${setClauses.join(', ')}
    WHERE id = $${keys.length + 1} AND event_id = $${keys.length + 2}
    RETURNING *
  `;
  const queryValues = [...keys.map(key => updates[key]), id, eventId];

  const updateResult = await pool.query(queryText, queryValues);
  const updatedSession = updateResult.rows[0];

  res.status(200).json({
    success: true,
    message: 'Session configuration updated successfully.',
    data: updatedSession
  });
});

/**
 * 5. Delete Session (DELETE /api/v1/events/:eventId/sessions/:id)
 * Purges the session record safely under ownership lock (Task 9).
 */
export const deleteSession = asyncHandler(async (req, res, next) => {
  const { eventId, id } = req.params;

  if (!UUID_REGEX.test(eventId) || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid path parameters: Both Event and Session identifiers must represent valid UUID formats.');
    error.statusCode = 400;
    return next(error);
  }

  // Check event exists and fetch ownership details
  const eventResult = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
  if (eventResult.rows.length === 0) {
    const error = new Error('Parent event resource not found.');
    error.statusCode = 404;
    return next(error);
  }

  const parentEvent = eventResult.rows[0];

  // Organizer ownership validation lock
  if (parentEvent.organizer_id !== req.user.id) {
    const error = new Error('Access Denied: You do not possess ownership privileges to alter this event.');
    error.statusCode = 403;
    return next(error);
  }

  // Retrieve existing record state
  const sessionResult = await pool.query('SELECT id FROM sessions WHERE id = $1 AND event_id = $2', [id, eventId]);
  if (sessionResult.rows.length === 0) {
    const error = new Error('Resource not found: Target session does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  // Execute hard deletion from sessions table
  await pool.query('DELETE FROM sessions WHERE id = $1 AND event_id = $2', [id, eventId]);

  res.status(200).json({
    success: true,
    message: 'Session node expunged successfully.'
  });
});
