import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Download token lifetime in seconds
const DOWNLOAD_TOKEN_TTL_SECONDS = 60;

/**
 * Magic-number byte signature map.
 * Each entry maps a hex prefix (read from the first N bytes of the buffer)
 * to its canonical MIME type.
 */
const MAGIC_NUMBER_MAP = [
  { bytes: [0x25, 0x50, 0x44, 0x46],                         mime: 'application/pdf',     ext: '.pdf'  },
  { bytes: [0x50, 0x4B, 0x03, 0x04],                         mime: 'application/zip',     ext: '.zip'  }, // Also PPTX, XLSX, DOCX
  { bytes: [0x50, 0x4B, 0x05, 0x06],                         mime: 'application/zip',     ext: '.zip'  }, // Empty archive
  { bytes: [0x50, 0x4B, 0x07, 0x08],                         mime: 'application/zip',     ext: '.zip'  }, // Spanned archive
  { bytes: [0x1F, 0x8B],                                     mime: 'application/gzip',    ext: '.gz'   },
];

/**
 * Whitelisted MIME types that the platform accepts for resource uploads.
 * Includes the full OOXML family for presentations, plus plain text,
 * gzipped archives, and raw tar streams.
 */
const WHITELISTED_MIMES = new Set([
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-tar',
  'application/vnd.ms-powerpoint',                                 // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
]);

/**
 * Extensions that are structurally plain-text and cannot be detected via
 * magic bytes, so they pass through the signature check implicitly.
 */
const TEXT_EXTENSIONS = new Set(['.txt', '.csv', '.log', '.md']);

/**
 * Extensions for OpenXML container formats (ZIP-based) that should be
 * accepted even though their magic bytes match ZIP.
 */
const OOXML_EXTENSIONS = new Set(['.pptx', '.ppt']);

/**
 * TAR archive extensions (no universal magic bytes; detected by extension).
 */
const TAR_EXTENSIONS = new Set(['.tar']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detect MIME type from raw file buffer using magic-number byte inspection.
 * Falls back to extension-based classification for text files and TAR archives.
 *
 * @param {Buffer} buffer - The first N bytes of the uploaded file.
 * @param {string} originalName - The original filename for extension fallback.
 * @returns {{ mime: string, trusted: boolean }} The detected MIME and trust flag.
 */
function detectMimeFromBuffer(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  // 1. Attempt magic-byte matching against the signature map
  for (const entry of MAGIC_NUMBER_MAP) {
    if (buffer.length >= entry.bytes.length) {
      let match = true;
      for (let i = 0; i < entry.bytes.length; i++) {
        if (buffer[i] !== entry.bytes[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        // ZIP-based containers: resolve to OOXML MIME if the extension demands it
        if (entry.mime === 'application/zip' && OOXML_EXTENSIONS.has(ext)) {
          return {
            mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            trusted: true,
          };
        }
        return { mime: entry.mime, trusted: true };
      }
    }
  }

  // 2. Text file fallback (no reliable magic bytes for plain text)
  if (TEXT_EXTENSIONS.has(ext)) {
    return { mime: 'text/plain', trusted: true };
  }

  // 3. TAR archive fallback
  if (TAR_EXTENSIONS.has(ext)) {
    return { mime: 'application/x-tar', trusted: true };
  }

  // 4. Legacy .ppt (older binary format uses OLE2 compound document)
  if (ext === '.ppt') {
    // OLE2 magic bytes: D0 CF 11 E0
    if (buffer.length >= 4 && buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
      return { mime: 'application/vnd.ms-powerpoint', trusted: true };
    }
  }

  return { mime: 'application/octet-stream', trusted: false };
}

/**
 * Generate a cryptographically unique filename preserving the original extension.
 *
 * @param {string} originalName - The original uploaded filename.
 * @returns {string} A unique, collision-resistant filename.
 */
function generateSecureFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  const hash = crypto
    .createHash('sha256')
    .update(`${uuid}-${timestamp}-${originalName}`)
    .digest('hex')
    .substring(0, 12);
  return `${uuid}_${hash}${ext}`;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * Upload Resource Asset
 * POST /api/v1/resources
 *
 * Requires: JWT authentication + organizer role.
 * Accepts: multipart/form-data with a single "file" field plus "event_id" and
 *          optional "visibility_clearance" text fields.
 *
 * Pipeline:
 *   1. Validate event ownership.
 *   2. Inspect buffer magic bytes to confirm MIME type is whitelisted.
 *   3. Rename with cryptographic hash and persist to disk.
 *   4. Insert metadata row in PostgreSQL.
 *   5. On DB failure, rollback by deleting the physical file.
 */
export const uploadResource = asyncHandler(async (req, res, next) => {
  const uploaderId = req.user?.id;
  if (!uploaderId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  const eventId = req.body.event_id || req.params.eventId;
  const visibilityClearance = req.body.visibility_clearance || 'public_accessible';

  // 1. Parameter validation
  if (!eventId || !UUID_REGEX.test(eventId)) {
    const error = new Error('Invalid resource requested: Event ID must conform to UUID specifications.');
    error.statusCode = 400;
    return next(error);
  }

  if (!['public_accessible', 'attendees_only'].includes(visibilityClearance)) {
    const error = new Error('Invalid visibility_clearance: Must be "public_accessible" or "attendees_only".');
    error.statusCode = 400;
    return next(error);
  }

  // 2. Verify organizer ownership of the target event
  const eventCheckRes = await pool.query(
    `SELECT id, organizer_id FROM events WHERE id = $1`,
    [eventId]
  );

  if (eventCheckRes.rows.length === 0) {
    const error = new Error('Resource not found: Target event record does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  if (eventCheckRes.rows[0].organizer_id !== uploaderId) {
    const error = new Error('Authorization failure: You do not own this event.');
    error.statusCode = 403;
    return next(error);
  }

  // Check if it's a URL-only upload workflow
  const file = req.file;
  if (!file) {
    const { title, url, type } = req.body;
    if (!title || !url) {
      const error = new Error('No file attached and no title/url provided.');
      error.statusCode = 400;
      return next(error);
    }

    let mimeType = 'application/octet-stream';
    if (type === 'Presentation Deck') mimeType = 'application/pdf';
    else if (type === 'Video Recording') mimeType = 'video/mp4';
    else if (type === 'External Article') mimeType = 'text/html';

    const insertRes = await pool.query(
      `INSERT INTO resources (event_id, uploader_id, asset_name, file_url, mime_type, file_size_bytes, visibility_clearance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, event_id, uploader_id, asset_name, file_url, mime_type, file_size_bytes, visibility_clearance, download_count, created_at`,
      [
        eventId,
        uploaderId,
        title,
        url,
        mimeType,
        0,
        visibilityClearance,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Resource asset catalogued successfully.',
      data: insertRes.rows[0],
    });
  }

  // 3. Deep MIME inspection via magic-number byte signatures
  const { mime: detectedMime, trusted } = detectMimeFromBuffer(file.buffer, file.originalname);

  if (!trusted || !WHITELISTED_MIMES.has(detectedMime)) {
    const error = new Error(
      `Upload rejected: File type "${detectedMime}" is not in the platform whitelist. ` +
      `Accepted types: PDF, PPT, PPTX, TXT, ZIP, GZ, TAR.`
    );
    error.statusCode = 415; // Unsupported Media Type
    return next(error);
  }

  // 4. Generate cryptographic filename and persist to disk
  const secureFilename = generateSecureFilename(file.originalname);
  const targetPath = path.join(UPLOADS_DIR, secureFilename);

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Write the buffer to disk
  fs.writeFileSync(targetPath, file.buffer);

  // 5. Insert metadata row into PostgreSQL
  try {
    const insertRes = await pool.query(
      `INSERT INTO resources (event_id, uploader_id, asset_name, file_url, mime_type, file_size_bytes, visibility_clearance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, event_id, uploader_id, asset_name, file_url, mime_type, file_size_bytes, visibility_clearance, download_count, created_at`,
      [
        eventId,
        uploaderId,
        file.originalname,
        secureFilename, // Store only the filename; the server resolves the full path
        detectedMime,
        file.size,
        visibilityClearance,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Resource asset uploaded and catalogued successfully.',
      data: insertRes.rows[0],
    });
  } catch (dbError) {
    // Rollback: Delete the physical file if DB insert fails
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    } catch (cleanupErr) {
      console.error('[ResourceController] CRITICAL: Failed to rollback physical file after DB error:', cleanupErr.message);
    }
    return next(dbError);
  }
});

/**
 * List Event Resources
 * GET /api/v1/resources/event/:eventId
 *
 * Requires: JWT authentication.
 * Context-aware access control:
 *   - Organizers who own the event: See ALL resources.
 *   - Confirmed attendees: See resources with visibility_clearance matching their status.
 *   - Everyone else: 403 Forbidden.
 */
export const listEventResources = asyncHandler(async (req, res, next) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { eventId } = req.params;

  if (!userId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  if (!eventId || !UUID_REGEX.test(eventId)) {
    const error = new Error('Invalid resource requested: Event ID must conform to UUID specifications.');
    error.statusCode = 400;
    return next(error);
  }

  // Verify event exists
  const eventRes = await pool.query(
    `SELECT id, organizer_id FROM events WHERE id = $1`,
    [eventId]
  );

  if (eventRes.rows.length === 0) {
    const error = new Error('Resource not found: Target event record does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  const event = eventRes.rows[0];
  const isOrganizer = event.organizer_id === userId;

  // If not organizer, verify confirmed registration
  if (!isOrganizer) {
    const regCheckRes = await pool.query(
      `SELECT id FROM registrations
       WHERE event_id = $1 AND attendee_id = $2 AND registration_status = 'confirmed'`,
      [eventId, userId]
    );

    if (regCheckRes.rows.length === 0) {
      const error = new Error('Access denied: You must be a confirmed attendee or the event organizer to view resources.');
      error.statusCode = 403;
      return next(error);
    }
  }

  // Build query based on access level
  let queryText;
  let queryValues;

  if (isOrganizer) {
    // Organizers see everything
    queryText = `
      SELECT id, event_id, uploader_id, asset_name, file_url, mime_type, file_size_bytes,
             visibility_clearance, download_count, created_at, updated_at
      FROM resources
      WHERE event_id = $1
      ORDER BY created_at DESC
    `;
    queryValues = [eventId];
  } else {
    // Attendees only see public or attendees_only resources
    queryText = `
      SELECT id, event_id, asset_name, file_url, mime_type, file_size_bytes,
             visibility_clearance, download_count, created_at
      FROM resources
      WHERE event_id = $1 AND visibility_clearance IN ('public_accessible', 'attendees_only')
      ORDER BY created_at DESC
    `;
    queryValues = [eventId];
  }

  const resourcesRes = await pool.query(queryText, queryValues);

  res.status(200).json({
    success: true,
    data: resourcesRes.rows,
    meta: {
      total_count: resourcesRes.rows.length,
      access_level: isOrganizer ? 'organizer' : 'attendee',
    },
  });
});

/**
 * Generate Secure Download Token
 * GET /api/v1/resources/download-token/:id
 *
 * Requires: JWT authentication.
 * Pipeline:
 *   1. Verify resource exists.
 *   2. Verify caller is event organizer OR confirmed attendee.
 *   3. Log telemetry record in resource_downloads.
 *   4. Increment download_count asynchronously.
 *   5. Issue a short-lived JWT (60 seconds) encoding the file path.
 */
export const generateDownloadLink = asyncHandler(async (req, res, next) => {
  const userId = req.user?.id;
  const { id: resourceId } = req.params;

  if (!userId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  if (!resourceId || !UUID_REGEX.test(resourceId)) {
    const error = new Error('Invalid resource ID: Must conform to UUID specifications.');
    error.statusCode = 400;
    return next(error);
  }

  // 1. Fetch resource metadata
  const resourceRes = await pool.query(
    `SELECT r.id, r.event_id, r.file_url, r.asset_name, r.mime_type, r.visibility_clearance,
            e.organizer_id
     FROM resources r
     JOIN events e ON r.event_id = e.id
     WHERE r.id = $1`,
    [resourceId]
  );

  if (resourceRes.rows.length === 0) {
    const error = new Error('Resource not found: The requested asset does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  const resource = resourceRes.rows[0];
  const isOrganizer = resource.organizer_id === userId;

  // 2. Verify access rights
  if (!isOrganizer) {
    const regCheckRes = await pool.query(
      `SELECT id FROM registrations
       WHERE event_id = $1 AND attendee_id = $2 AND registration_status = 'confirmed'`,
      [resource.event_id, userId]
    );

    if (regCheckRes.rows.length === 0) {
      const error = new Error('Access denied: You must be a confirmed attendee or the event organizer to download resources.');
      error.statusCode = 403;
      return next(error);
    }
  }

  // 3. Log download telemetry (fire-and-forget, non-blocking)
  pool.query(
    `INSERT INTO resource_downloads (resource_id, attendee_id) VALUES ($1, $2)`,
    [resourceId, userId]
  ).catch((err) => {
    console.error('[ResourceController] Telemetry insert failed:', err.message);
  });

  // 4. Increment download counter asynchronously (fire-and-forget)
  pool.query(
    `UPDATE resources SET download_count = download_count + 1 WHERE id = $1`,
    [resourceId]
  ).catch((err) => {
    console.error('[ResourceController] Download count increment failed:', err.message);
  });

  // 5. Generate short-lived signed download token
  const downloadToken = jwt.sign(
    {
      sub: userId,
      resourceId: resource.id,
      filePath: resource.file_url,
      purpose: 'resource_download',
    },
    env.JWT_SECRET,
    { expiresIn: DOWNLOAD_TOKEN_TTL_SECONDS }
  );

  res.status(200).json({
    success: true,
    message: 'Secure download token generated. Valid for 60 seconds.',
    data: {
      download_token: downloadToken,
      expires_in_seconds: DOWNLOAD_TOKEN_TTL_SECONDS,
      asset_name: resource.asset_name,
      mime_type: resource.mime_type,
    },
  });
});

/**
 * Direct File Download (Stream)
 * GET /api/v1/resources/download-file?token=<JWT>
 *
 * Public endpoint (no JWT auth middleware) — the download token IS the auth.
 * Pipeline:
 *   1. Decode and verify the short-lived download JWT.
 *   2. Resolve the physical file path on disk.
 *   3. Stream the binary file to the client with appropriate headers.
 */
export const downloadResourceFile = asyncHandler(async (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    const error = new Error('Missing download token: A valid signed token is required.');
    error.statusCode = 400;
    return next(error);
  }

  // 1. Verify the download token
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Download link expired: The 60-second window has elapsed. Please request a new download token.'
      : 'Invalid download token: The token is malformed or has been tampered with.';
    const error = new Error(message);
    error.statusCode = 401;
    return next(error);
  }

  // Validate token purpose
  if (decoded.purpose !== 'resource_download' || !decoded.filePath) {
    const error = new Error('Invalid download token: Token does not authorize a file download.');
    error.statusCode = 403;
    return next(error);
  }

  // 2. Resolve physical file path
  const filePath = path.join(UPLOADS_DIR, decoded.filePath);

  // Prevent path traversal attacks
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
    const error = new Error('Security violation: Path traversal detected.');
    error.statusCode = 403;
    return next(error);
  }

  if (!fs.existsSync(resolvedPath)) {
    const error = new Error('File not found: The physical asset has been removed from storage.');
    error.statusCode = 404;
    return next(error);
  }

  // 3. Fetch the original asset name for the Content-Disposition header
  let originalName = decoded.filePath;
  try {
    const assetRes = await pool.query(
      `SELECT asset_name, mime_type FROM resources WHERE id = $1`,
      [decoded.resourceId]
    );
    if (assetRes.rows.length > 0) {
      originalName = assetRes.rows[0].asset_name;
      res.setHeader('Content-Type', assetRes.rows[0].mime_type);
    }
  } catch (lookupErr) {
    console.error('[ResourceController] Asset name lookup failed, using fallback:', lookupErr.message);
  }

  // 4. Set download headers and stream the file
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  const fileStream = fs.createReadStream(resolvedPath);
  fileStream.pipe(res);

  fileStream.on('error', (streamErr) => {
    console.error('[ResourceController] File stream error:', streamErr.message);
    if (!res.headersSent) {
      const error = new Error('Internal error: Failed to stream the file.');
      error.statusCode = 500;
      return next(error);
    }
  });
});

/**
 * Delete Resource Asset
 * DELETE /api/v1/resources/:id
 *
 * Requires: JWT authentication + organizer role.
 * Pipeline:
 *   1. Verify resource exists and caller owns the parent event.
 *   2. Delete the physical file from disk FIRST.
 *   3. If disk deletion succeeds, purge the database metadata row.
 *   4. If disk deletion fails, abort entirely (no orphaned DB rows).
 */
export const deleteResource = asyncHandler(async (req, res, next) => {
  const uploaderId = req.user?.id;
  const { id: resourceId } = req.params;

  if (!uploaderId) {
    const error = new Error('Authentication credentials missing from request session.');
    error.statusCode = 401;
    return next(error);
  }

  if (!resourceId || !UUID_REGEX.test(resourceId)) {
    const error = new Error('Invalid resource ID: Must conform to UUID specifications.');
    error.statusCode = 400;
    return next(error);
  }

  // 1. Fetch resource and verify ownership chain
  const resourceRes = await pool.query(
    `SELECT r.id, r.file_url, r.asset_name, e.organizer_id
     FROM resources r
     JOIN events e ON r.event_id = e.id
     WHERE r.id = $1`,
    [resourceId]
  );

  if (resourceRes.rows.length === 0) {
    const error = new Error('Resource not found: The requested asset does not exist.');
    error.statusCode = 404;
    return next(error);
  }

  const resource = resourceRes.rows[0];

  if (resource.organizer_id !== uploaderId) {
    const error = new Error('Authorization failure: You do not own the event this resource belongs to.');
    error.statusCode = 403;
    return next(error);
  }

  // 2. Cascading PURGE: Physical file first, then database
  const filePath = path.join(UPLOADS_DIR, resource.file_url);
  const resolvedPath = path.resolve(filePath);

  // Prevent path traversal
  if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
    const error = new Error('Security violation: Path traversal detected.');
    error.statusCode = 403;
    return next(error);
  }

  // Attempt physical deletion
  if (fs.existsSync(resolvedPath)) {
    try {
      fs.unlinkSync(resolvedPath);
    } catch (diskErr) {
      console.error('[ResourceController] CRITICAL: Physical file deletion failed:', diskErr.message);
      const error = new Error('System error: Unable to purge the physical asset from storage. Operation aborted.');
      error.statusCode = 500;
      return next(error);
    }
  }

  // 3. Purge database metadata (telemetry records cascade via FK ON DELETE CASCADE)
  await pool.query(`DELETE FROM resources WHERE id = $1`, [resourceId]);

  res.status(200).json({
    success: true,
    message: 'Resource asset purged from storage and database successfully.',
    data: {
      id: resource.id,
      asset_name: resource.asset_name,
    },
  });
});
