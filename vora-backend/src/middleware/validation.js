/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VALIDATION MIDDLEWARE FACTORY — Zod Schema-First Input Contamination Barrier
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Universal middleware factory that sits between the router layer and the
 * controller layer for every route. Implements strict schema-first validation
 * using Zod with deep stripping of unrecognized fields.
 *
 * Features:
 *   - Schema-first validation with Zod safeParse
 *   - Deep stripping of unknown fields (mass-assignment prevention)
 *   - Type coercion for query parameters (strings → numbers/booleans)
 *   - Structured error responses with field-level violation details
 *   - Replaces req.body/req.query/req.params with parsed, clean data
 *
 * Usage:
 *   import { validate } from '../middleware/validation.js';
 *   import { loginSchema } from '../utils/schemas.js';
 *
 *   router.post('/login', validate(loginSchema), loginController);
 *   router.get('/items', validate(paginationSchema, 'query'), listController);
 *   router.get('/items/:id', validate(uuidParamsSchema, 'params'), getController);
 */

/**
 * Creates a validation middleware for the specified Zod schema and request source.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @param {'body' | 'query' | 'params'} [source='body'] - The request property to validate.
 * @returns {Function} Express middleware function.
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];

    // Execute Zod safeParse — non-throwing validation
    const result = schema.safeParse(data);

    if (!result.success) {
      // Extract structured field-level errors from ZodError
      const fieldErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
        code: issue.code,
        ...(issue.expected !== undefined && { expected: issue.expected }),
        ...(issue.received !== undefined && { received: issue.received }),
      }));

      return res.status(422).json({
        success: false,
        status: 422,
        message: 'Input validation failed. Please review the errors below and correct your request.',
        errors: fieldErrors,
      });
    }

    // Replace the raw request data with the parsed, stripped, type-coerced output
    req[source] = result.data;

    next();
  };
};

/**
 * Composable validation helper for routes that need to validate
 * multiple sources (e.g., both params and body).
 *
 * Usage:
 *   router.patch('/:id',
 *     validateMultiple([
 *       { schema: uuidParamsSchema, source: 'params' },
 *       { schema: updateEventSchema, source: 'body' },
 *     ]),
 *     updateController
 *   );
 *
 * @param {Array<{schema: import('zod').ZodSchema, source: string}>} validations
 * @returns {Function} Express middleware function.
 */
export const validateMultiple = (validations) => {
  return (req, res, next) => {
    for (const { schema, source = 'body' } of validations) {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        const fieldErrors = result.error.issues.map((issue) => ({
          field: issue.path.join('.') || source,
          message: issue.message,
          code: issue.code,
        }));

        return res.status(422).json({
          success: false,
          status: 422,
          message: 'Input validation failed. Please review the errors below and correct your request.',
          errors: fieldErrors,
        });
      }

      req[source] = result.data;
    }

    next();
  };
};

export default validate;
