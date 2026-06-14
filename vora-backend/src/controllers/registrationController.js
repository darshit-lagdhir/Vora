import crypto from 'crypto';
import pool from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';
import { eventHub } from '../utils/eventHub.js';
import { triggerCachePurge } from '../services/cacheInvalidationService.js';

// In-memory cache for idempotency keys
const idempotencyCache = new Map();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean up expired idempotency keys regularly
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
}, 60000);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Secure checkout registration (POST /api/v1/registrations)
 * Requires JWT Authentication. Implements transaction safety and concurrency row-locks.
 */
export const createRegistration = asyncHandler(async (req, res, next) => {
  const { event_id } = req.body;
  const attendeeId = req.user?.id;

  if (!attendeeId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  // 1. Parameter Validation
  if (!event_id || !UUID_REGEX.test(event_id)) {
    const error = new Error('Invalid resource requested: Event ID must conform to UUID specifications.');
    error.statusCode = 400;
    return next(error);
  }

  // 2. Idempotency Key Check
  const idempotencyKey = req.headers['idempotency-key'];
  if (idempotencyKey) {
    const cleanKey = String(idempotencyKey).trim();
    if (idempotencyCache.has(cleanKey)) {
      const cached = idempotencyCache.get(cleanKey);
      if (Date.now() - cached.timestamp < IDEMPOTENCY_TTL_MS) {
        return res.status(200).json(cached.payload);
      }
    }
  }

  // 3. Begin Transaction with Pessimistic Locking
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the event row for update to serialize capacity evaluations
    const eventLockRes = await client.query(
      `SELECT id, title, maximum_capacity, status, start_timestamp, end_timestamp, banner_image_url
       FROM events 
       WHERE id = $1 
       FOR UPDATE`,
      [event_id]
    );

    if (eventLockRes.rows.length === 0) {
      const error = new Error('Resource not found: Target event record does not exist.');
      error.statusCode = 404;
      await client.query('ROLLBACK');
      return next(error);
    }

    const event = eventLockRes.rows[0];

    // Enforce state boundaries
    if (event.status !== 'published' && event.status !== 'active') {
      const error = new Error('Invalid event status: Registrations are only allowed on published or active events.');
      error.statusCode = 400;
      await client.query('ROLLBACK');
      return next(error);
    }

    // Verify chronological window (cannot register for historically expired events)
    if (new Date(event.start_timestamp) < new Date()) {
      const error = new Error('Timeline violation: Cannot register for an event that has already started or concluded.');
      error.statusCode = 400;
      await client.query('ROLLBACK');
      return next(error);
    }

    // Check double registration
    const duplicateRes = await client.query(
      `SELECT id 
       FROM registrations 
       WHERE event_id = $1 AND attendee_id = $2 AND registration_status = 'confirmed'`,
      [event_id, attendeeId]
    );

    if (duplicateRes.rows.length > 0) {
      const error = new Error('Registration conflict: You are already registered for this event.');
      error.statusCode = 409;
      await client.query('ROLLBACK');
      return next(error);
    }

    // Evaluate capacity limits
    const registrantsRes = await client.query(
      `SELECT COUNT(*)::integer as confirmed_count
       FROM registrations
       WHERE event_id = $1 AND registration_status = 'confirmed'`,
      [event_id]
    );

    const activeRegistrations = registrantsRes.rows[0]?.confirmed_count || 0;
    if (activeRegistrations >= event.maximum_capacity) {
      const error = new Error('Event sold out: Designated seating capacity limits have been fully exhausted.');
      error.statusCode = 409;
      await client.query('ROLLBACK');
      return next(error);
    }

    // 4. Generate Cryptographic Ticket Hash
    const timestampHash = crypto
      .createHash('sha256')
      .update(String(Date.now() * 1000) + crypto.randomUUID())
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();
    
    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const ticketHash = `VORA-${timestampHash}-${randomSuffix}`;

    // 5. Insert Registration Record
    const regInsertRes = await client.query(
      `INSERT INTO registrations (event_id, attendee_id, ticket_hash, registration_status)
       VALUES ($1, $2, $3, 'confirmed')
       RETURNING id, event_id, attendee_id, ticket_hash, registration_status, created_at`,
      [event_id, attendeeId, ticketHash]
    );

    await client.query('COMMIT');

    // Emit attendee count mutated event to the event hub
    eventHub.emit('event_mutate', {
      eventId: event_id,
      eventType: 'ATTENDEE_COUNT_MUTATED',
      payload: {
        eventId: event_id,
        confirmedCount: activeRegistrations + 1
      }
    });

    const createdRegistration = regInsertRes.rows[0];

    const responsePayload = {
      success: true,
      message: 'Ticket reservation secured successfully.',
      data: {
        registration: createdRegistration,
        transaction_id: `TXN-${createdRegistration.id.substring(0, 8).toUpperCase()}-${(createdRegistration.ticket_hash || '').split('-')[2] || 'MOCK'}`,
        event: {
          id: event.id,
          title: event.title,
          start_timestamp: event.start_timestamp,
          end_timestamp: event.end_timestamp,
          banner_image_url: event.banner_image_url
        }
      }
    };

    // Store payload in cache if idempotency key was attached
    if (idempotencyKey) {
      idempotencyCache.set(String(idempotencyKey).trim(), {
        timestamp: Date.now(),
        payload: responsePayload
      });
    }

    triggerCachePurge('events');
    triggerCachePurge('analytics');

    res.status(201).json(responsePayload);

  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

/**
 * Retrieve roster of registrations for events owned by the authenticated organizer.
 * GET /api/v1/registrations
 */
export const getRegistrations = asyncHandler(async (req, res, next) => {
  const userId = req.user?.id;
  const userRole = req.user?.role; // 'attendee' or 'organizer'
  const { event_id, search, status, page = 1, limit = 10 } = req.query;

  if (!userId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
  const offset = (pageNum - 1) * limitNum;

  let queryText = '';
  if (userRole === 'attendee') {
    queryText = `
      FROM registrations r
      JOIN profiles p ON r.attendee_id = p.id
      JOIN events e ON r.event_id = e.id
      WHERE r.attendee_id = $1
    `;
  } else {
    queryText = `
      FROM registrations r
      JOIN profiles p ON r.attendee_id = p.id
      JOIN events e ON r.event_id = e.id
      WHERE e.organizer_id = $1
    `;
  }
  
  const values = [userId];
  let paramIdx = 2;

  if (event_id) {
    queryText += ` AND r.event_id = $${paramIdx++}`;
    values.push(event_id);
  }

  if (search) {
    const searchPattern = `%${search.trim()}%`;
    queryText += ` AND (p.first_name ILIKE $${paramIdx} OR p.last_name ILIKE $${paramIdx} OR p.email_address ILIKE $${paramIdx} OR r.ticket_hash ILIKE $${paramIdx})`;
    values.push(searchPattern);
    paramIdx++;
  }

  if (status) {
    const cleanStatus = status.toLowerCase();
    if (cleanStatus === 'pending') {
      queryText += ` AND r.registration_status = 'waitlisted'`;
    } else if (cleanStatus === 'verified') {
      queryText += ` AND r.registration_status = 'confirmed' AND r.has_checked_in = true`;
    } else if (cleanStatus === 'not_arrived') {
      queryText += ` AND r.registration_status = 'confirmed' AND r.has_checked_in = false`;
    } else if (cleanStatus === 'revoked') {
      queryText += ` AND r.registration_status = 'cancelled'`;
    }
  }

  // Retrieve total count of matches
  const countRes = await pool.query(`SELECT COUNT(*)::integer ${queryText}`, values);
  const totalItems = countRes.rows[0]?.count || 0;
  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  // Retrieve current page rows
  const dataQueryText = `
    SELECT r.id, r.event_id, r.attendee_id, r.registration_status, r.has_checked_in, r.ticket_hash, r.created_at, r.updated_at,
           p.first_name, p.last_name, p.email_address, p.avatar_url,
           e.title as event_title, e.start_timestamp, e.end_timestamp, e.banner_image_url, e.description as event_description
    ${queryText}
    ORDER BY r.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx}
  `;

  const queryValues = [...values, limitNum, offset];
  const dataRes = await pool.query(dataQueryText, queryValues);

  res.status(200).json({
    success: true,
    data: dataRes.rows,
    meta: {
      total_items: totalItems,
      total_pages: totalPages,
      current_page: pageNum,
      limit: limitNum
    }
  });
});

/**
 * Update registration status or check-in boolean for a specific ticket.
 * PATCH /api/v1/registrations/:id
 */
export const updateRegistrationStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { registration_status, has_checked_in } = req.body;
  const organizerId = req.user?.id;

  if (!organizerId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify registration exists and is tied to an event owned by the authenticated organizer with pessimistic locking
    const checkRes = await client.query(
      `SELECT r.id, r.event_id 
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = $1 AND e.organizer_id = $2
       FOR UPDATE`,
      [id, organizerId]
    );

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      const error = new Error('Resource not found: The registration record does not exist or you lack authorization.');
      error.statusCode = 404;
      return next(error);
    }

    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (registration_status !== undefined) {
      if (!['confirmed', 'waitlisted', 'cancelled'].includes(registration_status)) {
        await client.query('ROLLBACK');
        client.release();
        const error = new Error('Invalid value: registration_status must be confirmed, waitlisted, or cancelled.');
        error.statusCode = 400;
        return next(error);
      }
      updates.push(`registration_status = $${paramIdx++}`);
      values.push(registration_status);
    }

    if (has_checked_in !== undefined) {
      updates.push(`has_checked_in = $${paramIdx++}`);
      values.push(has_checked_in === true || has_checked_in === 'true');
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      const error = new Error('Bad request: No valid fields provided for modification.');
      error.statusCode = 400;
      return next(error);
    }

    values.push(id);
    const updateRes = await client.query(
      `UPDATE registrations
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIdx}
       RETURNING id, event_id, attendee_id, registration_status, has_checked_in, ticket_hash, updated_at`,
      values
    );

    const updatedReg = updateRes.rows[0];
    let confirmedCount = 0;
    if (updatedReg) {
      const countRes = await client.query(
        "SELECT COUNT(*)::integer as confirmed_count FROM registrations WHERE event_id = $1 AND registration_status = 'confirmed'",
        [updatedReg.event_id]
      );
      confirmedCount = countRes.rows[0]?.confirmed_count || 0;
    }

    await client.query('COMMIT');
    client.release();

    if (updatedReg) {
      eventHub.emit('event_mutate', {
        eventId: updatedReg.event_id,
        eventType: 'ATTENDEE_COUNT_MUTATED',
        payload: {
          eventId: updatedReg.event_id,
          confirmedCount
        }
      });
    }

    triggerCachePurge('events');
    triggerCachePurge('analytics');

    res.status(200).json({
      success: true,
      message: 'Registration record updated successfully.',
      data: updatedReg
    });

  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return next(err);
  }
});

/**
 * Bulk update registration status or check-in boolean for multiple tickets.
 * POST /api/v1/registrations/bulk-update
 */
export const bulkUpdateRegistrations = asyncHandler(async (req, res, next) => {
  const { ids, registration_status, has_checked_in } = req.body;
  const organizerId = req.user?.id;

  if (!organizerId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    const error = new Error('Bad request: ids parameter must be a non-empty array.');
    error.statusCode = 400;
    return next(error);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Filter ids to only include those belonging to events hosted by the organizer
    const verifyRes = await client.query(
      `SELECT r.id, r.event_id 
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = ANY($1) AND e.organizer_id = $2
       FOR UPDATE`,
      [ids, organizerId]
    );

    const authorizedIds = verifyRes.rows.map(row => row.id);
    if (authorizedIds.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      const error = new Error('Unauthorized or no valid registration records found to modify.');
      error.statusCode = 403;
      return next(error);
    }

    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (registration_status !== undefined) {
      if (!['confirmed', 'waitlisted', 'cancelled'].includes(registration_status)) {
        await client.query('ROLLBACK');
        client.release();
        const error = new Error('Invalid value: registration_status must be confirmed, waitlisted, or cancelled.');
        error.statusCode = 400;
        return next(error);
      }
      updates.push(`registration_status = $${paramIdx++}`);
      values.push(registration_status);
    }

    if (has_checked_in !== undefined) {
      updates.push(`has_checked_in = $${paramIdx++}`);
      values.push(has_checked_in === true || has_checked_in === 'true');
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      const error = new Error('Bad request: No valid fields provided for modification.');
      error.statusCode = 400;
      return next(error);
    }

    values.push(authorizedIds);
    const updateQueryText = `
      UPDATE registrations
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ANY($${paramIdx})
      RETURNING id, event_id, attendee_id, registration_status, has_checked_in, ticket_hash, updated_at
    `;

    const bulkUpdateRes = await client.query(updateQueryText, values);

    // Emit event mutate updates for each affected event
    const uniqueEventIds = [...new Set(verifyRes.rows.map(r => r.event_id))];
    const eventCounts = {};
    for (const evId of uniqueEventIds) {
      const countRes = await client.query(
        "SELECT COUNT(*)::integer as confirmed_count FROM registrations WHERE event_id = $1 AND registration_status = 'confirmed'",
        [evId]
      );
      eventCounts[evId] = countRes.rows[0]?.confirmed_count || 0;
    }

    await client.query('COMMIT');
    client.release();

    for (const evId of uniqueEventIds) {
      eventHub.emit('event_mutate', {
        eventId: evId,
        eventType: 'ATTENDEE_COUNT_MUTATED',
        payload: {
          eventId: evId,
          confirmedCount: eventCounts[evId]
        }
      });
    }

    triggerCachePurge('events');
    triggerCachePurge('analytics');

    res.status(200).json({
      success: true,
      message: `Successfully mutated ${bulkUpdateRes.rows.length} registration records.`,
      data: bulkUpdateRes.rows
    });

  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return next(err);
  }
});

/**
 * Cancel registration for the authenticated attendee.
 * DELETE /api/v1/events/:id/register
 */
export const cancelRegistration = asyncHandler(async (req, res, next) => {
  const eventId = req.params.id;
  const attendeeId = req.user?.id;

  if (!attendeeId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if registration exists with pessimistic locking
    const checkRes = await client.query(
      'SELECT id FROM registrations WHERE event_id = $1 AND attendee_id = $2 FOR UPDATE',
      [eventId, attendeeId]
    );

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      const error = new Error('Registration record not found.');
      error.statusCode = 404;
      return next(error);
    }

    // Delete the registration
    await client.query(
      'DELETE FROM registrations WHERE event_id = $1 AND attendee_id = $2',
      [eventId, attendeeId]
    );

    const countRes = await client.query(
      "SELECT COUNT(*)::integer as confirmed_count FROM registrations WHERE event_id = $1 AND registration_status = 'confirmed'",
      [eventId]
    );
    const confirmedCount = countRes.rows[0]?.confirmed_count || 0;

    await client.query('COMMIT');
    client.release();

    eventHub.emit('event_mutate', {
      eventId,
      eventType: 'ATTENDEE_COUNT_MUTATED',
      payload: {
        eventId,
        confirmedCount
      }
    });

    triggerCachePurge('events');
    triggerCachePurge('analytics');

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully.'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    return next(err);
  }
});

