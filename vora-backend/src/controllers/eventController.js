import pool from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';

// Regular expression to validate standard UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 1. Create Event (POST /api/v1/events)
 * Restricts access to authenticated Organizers. Locks author identity and validates timing constraints.
 */
export const createEvent = asyncHandler(async (req, res, next) => {
  const { title, description, start_timestamp, end_timestamp, maximum_capacity, banner_image_url } = req.body;
  const organizerId = req.user.id;

  // Title validation
  const cleanTitle = title?.trim();
  if (!cleanTitle || cleanTitle.length > 255) {
    const error = new Error('Event title must be specified and must not exceed 255 characters.');
    error.statusCode = 400;
    return next(error);
  }

  // Capacity validation
  const parsedCapacity = parseInt(maximum_capacity, 10);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    const error = new Error('Maximum capacity must be a positive integer greater than zero.');
    error.statusCode = 400;
    return next(error);
  }

  // Parse and validate chronological constraints
  if (!start_timestamp || !end_timestamp) {
    const error = new Error('Both start and end timestamps are required.');
    error.statusCode = 400;
    return next(error);
  }

  const startDate = new Date(start_timestamp);
  const endDate = new Date(end_timestamp);
  const now = new Date();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const error = new Error('Timestamps must represent valid ISO date structures.');
    error.statusCode = 400;
    return next(error);
  }

  // Start date must be in the future
  if (startDate <= now) {
    const error = new Error('Event start time must represent a future chronological date.');
    error.statusCode = 400;
    return next(error);
  }

  // End date must follow start date by at least 30 minutes
  const minimumDurationMs = 30 * 60 * 1000;
  if (endDate.getTime() - startDate.getTime() < minimumDurationMs) {
    const error = new Error('Invalid temporal boundaries: Event duration must be at least 30 minutes.');
    error.statusCode = 400;
    return next(error);
  }

  // Perform database insertion using pool queries
  const insertQuery = `
    INSERT INTO events (title, description, start_timestamp, end_timestamp, maximum_capacity, banner_image_url, organizer_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const insertValues = [
    cleanTitle,
    description || null,
    startDate.toISOString(),
    endDate.toISOString(),
    parsedCapacity,
    banner_image_url || null,
    organizerId
  ];

  const result = await pool.query(insertQuery, insertValues);
  const createdEvent = result.rows[0];

  res.status(201).json({
    success: true,
    message: 'Event node instantiated successfully.',
    data: createdEvent
  });
});

/**
 * 2. Read All Events (GET /api/v1/events)
 * Fetches events with cursor/offset pagination. Discriminates display values based on active caller role.
 */
export const getAllEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  
  if (page <= 0 || limit <= 0) {
    const error = new Error('Page and limit query parameters must be positive integers.');
    error.statusCode = 400;
    return next(error);
  }

  const offset = (page - 1) * limit;
  const userContext = req.user; // Set by optional auth middleware if present

  let queryText = '';
  let countQueryText = '';
  let queryParams = [];

  // Toggle query discrimination based on actor credentials
  if (userContext && userContext.role === 'organizer') {
    // Organizers view their entire administrative history
    queryText = `
      SELECT * FROM events 
      WHERE organizer_id = $1 
      ORDER BY start_timestamp DESC 
      LIMIT $2 OFFSET $3
    `;
    countQueryText = `
      SELECT COUNT(*) FROM events 
      WHERE organizer_id = $1
    `;
    queryParams = [userContext.id];
  } else {
    // Guests and Attendees only view public, valid events
    queryText = `
      SELECT * FROM events 
      WHERE status IN ('published', 'active', 'completed') 
      ORDER BY start_timestamp ASC 
      LIMIT $1 OFFSET $2
    `;
    countQueryText = `
      SELECT COUNT(*) FROM events 
      WHERE status IN ('published', 'active', 'completed')
    `;
  }

  // Execute queries
  const itemsParams = [...queryParams, limit, offset];
  const itemsResult = await pool.query(queryText, itemsParams);
  const countResult = await pool.query(countQueryText, queryParams);

  const totalCount = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / limit);

  res.status(200).json({
    success: true,
    meta: {
      total_items: totalCount,
      total_pages: totalPages,
      current_page: page,
      limit: limit
    },
    data: itemsResult.rows
  });
});

/**
 * 3. Read Single Event (GET /api/v1/events/:id)
 * Fetches details of a specific event node. Restricts draft/cancelled access to the event creator.
 */
export const getEventById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Validate parameter meets UUID standard structure
  if (!UUID_REGEX.test(id)) {
    const error = new Error('Invalid resource request: Parameter must represent a valid UUID format.');
    error.statusCode = 400;
    return next(error);
  }

  // Fetch target event row
  const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    const error = new Error('Resource not found: No event registered under the provided identifier.');
    error.statusCode = 404;
    return next(error);
  }

  const event = result.rows[0];

  // Conduct trans-role privilege verification for private/draft layouts
  if (event.status === 'draft' || event.status === 'cancelled') {
    const userContext = req.user;
    if (!userContext || userContext.id !== event.organizer_id) {
      const error = new Error('Access denied: You do not possess the administrative clearance to view this private resource.');
      error.statusCode = 403;
      return next(error);
    }
  }

  res.status(200).json({
    success: true,
    data: event
  });
});

/**
 * 4. Update Event (PATCH /api/v1/events/:id)
 * Restricts modifications to the verified creator. Sanitizes inputs against mass-assignment.
 */
export const updateEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const organizerId = req.user.id;

  // Validate request parameter
  if (!UUID_REGEX.test(id)) {
    const error = new Error('Invalid resource request: Parameter must represent a valid UUID format.');
    error.statusCode = 400;
    return next(error);
  }

  // Retrieve current record state
  const selectResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  if (selectResult.rows.length === 0) {
    const error = new Error('Resource not found: Target event does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  const existingEvent = selectResult.rows[0];

  // Confirm caller matches the event's legal organizer
  if (existingEvent.organizer_id !== organizerId) {
    const error = new Error('Access Denied: You do not possess ownership privileges to mutate this resource.');
    error.statusCode = 403;
    return next(error);
  }

  // Whitelist incoming mutable columns
  const whitelistedKeys = ['title', 'description', 'start_timestamp', 'end_timestamp', 'maximum_capacity', 'banner_image_url', 'status'];
  const updates = {};

  for (const key of whitelistedKeys) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  // Return bad request if updates payload is empty
  if (Object.keys(updates).length === 0) {
    const error = new Error('No valid parameters provided for resource modification.');
    error.statusCode = 400;
    return next(error);
  }

  // Apply validations on provided values
  if (updates.title !== undefined) {
    const cleanTitle = updates.title?.trim();
    if (!cleanTitle || cleanTitle.length > 255) {
      const error = new Error('Event title must not be empty and must not exceed 255 characters.');
      error.statusCode = 400;
      return next(error);
    }
    updates.title = cleanTitle;
  }

  if (updates.maximum_capacity !== undefined) {
    const parsedCapacity = parseInt(updates.maximum_capacity, 10);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      const error = new Error('Maximum capacity must be a positive integer greater than zero.');
      error.statusCode = 400;
      return next(error);
    }
    updates.maximum_capacity = parsedCapacity;
  }

  if (updates.status !== undefined) {
    const validStatuses = ['draft', 'published', 'active', 'cancelled', 'completed'];
    if (!validStatuses.includes(updates.status)) {
      const error = new Error('Invalid event status value.');
      error.statusCode = 400;
      return next(error);
    }
  }

  // Evaluate chronology boundaries if timestamps are updated
  const proposedStart = updates.start_timestamp ? new Date(updates.start_timestamp) : new Date(existingEvent.start_timestamp);
  const proposedEnd = updates.end_timestamp ? new Date(updates.end_timestamp) : new Date(existingEvent.end_timestamp);
  const now = new Date();

  if (isNaN(proposedStart.getTime()) || isNaN(proposedEnd.getTime())) {
    const error = new Error('Provided timestamps must represent valid ISO structures.');
    error.statusCode = 400;
    return next(error);
  }

  // If start time is being updated, verify it is in the future
  if (updates.start_timestamp !== undefined && proposedStart <= now) {
    const error = new Error('Event start time must represent a future chronological date.');
    error.statusCode = 400;
    return next(error);
  }

  // Enforce duration rules
  const minimumDurationMs = 30 * 60 * 1000;
  if (proposedEnd.getTime() - proposedStart.getTime() < minimumDurationMs) {
    const error = new Error('Invalid temporal boundaries: Event duration must be at least 30 minutes.');
    error.statusCode = 400;
    return next(error);
  }

  // Format ISO strings for database insertion
  if (updates.start_timestamp) updates.start_timestamp = proposedStart.toISOString();
  if (updates.end_timestamp) updates.end_timestamp = proposedEnd.toISOString();

  // Construct dynamic PostgreSQL query string
  const keys = Object.keys(updates);
  const setClauses = keys.map((key, index) => `${key} = $${index + 1}`);
  const queryText = `
    UPDATE events 
    SET ${setClauses.join(', ')} 
    WHERE id = $${keys.length + 1} 
    RETURNING *
  `;
  const queryValues = [...keys.map(key => updates[key]), id];

  const updateResult = await pool.query(queryText, queryValues);
  const updatedEvent = updateResult.rows[0];

  res.status(200).json({
    success: true,
    message: 'Event node configuration mutated successfully.',
    data: updatedEvent
  });
});

/**
 * 5. Delete Event (DELETE /api/v1/events/:id)
 * Validates ownership and intercepts capacity parameters to prevent orphaning active ticket allocations.
 */
export const deleteEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const organizerId = req.user.id;

  // Validate parameter format
  if (!UUID_REGEX.test(id)) {
    const error = new Error('Invalid resource request: Parameter must represent a valid UUID format.');
    error.statusCode = 400;
    return next(error);
  }

  // Query existing database state
  const selectResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  if (selectResult.rows.length === 0) {
    const error = new Error('Resource not found: Target event does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  const event = selectResult.rows[0];

  // Restrict deletions to the owner creator
  if (event.organizer_id !== organizerId) {
    const error = new Error('Access Denied: You do not possess ownership privileges to purge this resource.');
    error.statusCode = 403;
    return next(error);
  }

  // Query registrations table to check for allocated seats (Task 10)
  const registrationsResult = await pool.query(
    `SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND registration_status = 'confirmed'`,
    [id]
  );
  const activeBookingsCount = parseInt(registrationsResult.rows[0].count, 10);

  if (activeBookingsCount > 0) {
    const error = new Error('Resource cannot be expunged: Confirmed attendee registrations exist. You must programmatically mutate the event status to "cancelled" to handle refunds.');
    error.statusCode = 400;
    return next(error);
  }

  // Purge the resource (cascading tables handled at database DDL foreign key constraints)
  await pool.query('DELETE FROM events WHERE id = $1', [id]);

  res.status(200).json({
    success: true,
    message: 'Event node and cascading child items expunged successfully.'
  });
});

/**
 * 6. Fetch Active Events (GET /api/v1/events/active)
 * Retrieves active or published event streams along with confirmed registrant counts for live metrics.
 */
export const getActiveEvents = asyncHandler(async (req, res, next) => {
  const query = `
    SELECT e.id, e.title, e.start_timestamp, e.end_timestamp, e.status,
           COALESCE((SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.registration_status = 'confirmed'), 0)::integer as registrants
    FROM events e
    WHERE e.status IN ('active', 'published')
    ORDER BY e.start_timestamp ASC
  `;
  const result = await pool.query(query);

  res.status(200).json({
    success: true,
    data: result.rows
  });
});
