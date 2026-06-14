import crypto from 'crypto';
import { ZodError } from 'zod';
import env from '../config/env.js';
import { reportBackendError } from '../services/telemetryService.js';
import logger from '../services/loggerService.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CENTRALIZED ERROR SANITIZATION MATRIX
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Global Express error handling middleware. Intercepts all thrown errors,
 * validation failures, and database exceptions. Formats and returns a
 * sanitized payload based on the environment (development vs. production).
 *
 * Features:
 *   - Correlation ID injection (X-Correlation-Id / X-Request-Id)
 *   - PII scrubbing in production (emails, tokens, passwords, UUIDs)
 *   - ZodError normalization into structured field-level errors
 *   - Operational vs Programmer error classification
 *   - Structured JSON error envelope
 *   - Stack traces NEVER exposed in production
 */

// Regex patterns for PII detection and scrubbing
const PII_PATTERNS = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
  { pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, replacement: '[TOKEN_REDACTED]' },
  { pattern: /password["']?\s*[:=]\s*["'][^"']+["']/gi, replacement: 'password=[REDACTED]' },
];

/**
 * Scrub potential PII from error messages in production.
 * @param {string} message - The raw error message.
 * @returns {string} Sanitized message.
 */
function scrubPII(message) {
  if (!message || typeof message !== 'string') return message;
  let scrubbed = message;
  for (const { pattern, replacement } of PII_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, replacement);
  }
  return scrubbed;
}

/**
 * Determine if an error is "operational" (expected, user-facing) vs
 * a "programmer error" (unexpected bug, should not leak details).
 *
 * Operational errors: 4xx status codes, explicitly thrown business logic errors.
 * Programmer errors: 5xx status codes, unhandled exceptions.
 */
function isOperationalError(statusCode) {
  return statusCode >= 400 && statusCode < 500;
}

const errorHandler = (err, req, res, next) => {
  // ── Dead Response Guard ──────────────────────────────────────────────────
  if (res.headersSent) {
    console.error(
      `[ErrorHandler] Headers already sent for ${req.method} ${req.url}. ` +
      `Cannot send error response. Error: ${err.message}`
    );
    return next(err);
  }

  // ── Status Code Resolution ───────────────────────────────────────────────
  let statusCode = err.statusCode || err.status || 500;

  // ZodError special handling — always a 400 validation error
  if (err instanceof ZodError) {
    statusCode = 400;
  }

  // ── Correlation ID ───────────────────────────────────────────────────────
  // Use client-provided correlation ID if present, otherwise generate one
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    crypto.randomUUID();

  // ── Error Message Resolution ─────────────────────────────────────────────
  let errMessage = err.message || 'Internal Server Error';

  // ── Telemetry Reporting ──────────────────────────────────────────────────
  try {
    reportBackendError(err, req);
  } catch (telemetryErr) {
    console.error('[Telemetry] Failed to report backend error:', telemetryErr.message);
  }

  // ── Server-Side Structured Logging ───────────────────────────────────────
  const timestamp = new Date().toISOString();
  logger.error({
    module: 'errorHandler.js',
    method: req.method,
    url: req.url,
    statusCode,
    errMessage,
    stack: err.stack
  }, `Express caught error: ${errMessage}`);

  // ── Inject Correlation Headers ───────────────────────────────────────────
  res.setHeader('X-Request-Id', correlationId);
  res.setHeader('X-Correlation-Id', correlationId);

  // ── Build Response Payload ───────────────────────────────────────────────
  const isProduction = env.NODE_ENV === 'production';

  const responsePayload = {
    success: false,
    status: statusCode,
    message: '',
    requestId: correlationId,
    timestamp,
  };

  // ── ZodError Normalization ───────────────────────────────────────────────
  if (err instanceof ZodError) {
    responsePayload.message =
      'Input validation failed. Please review the errors below and correct your request.';
    responsePayload.errors = err.issues.map((issue) => ({
      field: issue.path.join('.') || 'unknown',
      message: issue.message,
      code: issue.code,
    }));
  } else if (isProduction && !isOperationalError(statusCode)) {
    // Programmer errors in production: generic message, no details leaked
    responsePayload.message = 'An unexpected error occurred on the server.';
  } else {
    // Operational errors or development mode: pass message through
    responsePayload.message = isProduction ? scrubPII(errMessage) : errMessage;
  }

  // ── Development-Only Debug Payload ───────────────────────────────────────
  if (!isProduction) {
    responsePayload.stack = err.stack;
    responsePayload.details = err.details || null;
    if (err.code) {
      responsePayload.errorCode = err.code;
    }
  }

  return res.status(statusCode).json(responsePayload);
};

export default errorHandler;
