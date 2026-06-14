/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOD SCHEMA REGISTRY — Centralized Input Validation Schema Definitions
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * All API route schemas defined in one canonical location.
 * Schemas enforce type safety, string trimming, length constraints,
 * and custom refinements before data reaches the controller layer.
 */

import { z } from 'zod';

// ─── Shared Primitives ───────────────────────────────────────────────────────

/** Standard UUID v4 pattern */
export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Must be a valid UUID format.'
  );

/** Trimmed, lowercased email */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Must be a valid email address.');

/** ISO timestamp string that parses to a valid Date */
export const timestampSchema = z
  .string()
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Must be a valid ISO 8601 timestamp.',
  });

// ─── Param Schemas ───────────────────────────────────────────────────────────

/** UUID :id param */
export const idParamsSchema = z.object({
  id: uuidSchema,
});

/** UUID :eventId param */
export const eventIdParamsSchema = z.object({
  eventId: uuidSchema,
});

/** UUID :eventId + :id params */
export const eventIdAndIdParamsSchema = z.object({
  eventId: uuidSchema,
  id: uuidSchema,
});

/** UUID :eventId + :questionId params */
export const eventIdAndQuestionIdParamsSchema = z.object({
  eventId: uuidSchema,
  questionId: uuidSchema,
});

// ─── Query Schemas ───────────────────────────────────────────────────────────

/** Common pagination query params */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().trim().optional(),
}).passthrough(); // Allow additional query params to pass through

/** Analytics query params */
export const analyticsQuerySchema = z.object({
  timeframe: z.enum(['7D', '30D', '90D', 'ALL']).optional(),
  eventId: uuidSchema.optional(),
}).passthrough();

/** Explore query params */
export const exploreQuerySchema = z.object({
  search: z.string().trim().optional(),
  tags: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  sort: z.enum(['relevancy', 'date_asc', 'date_desc']).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
}).passthrough();

/** Registration query params */
export const registrationQuerySchema = z.object({
  event_id: uuidSchema.optional(),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
}).passthrough();

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  first_name: z.string().trim().min(1, 'First name is required.'),
  last_name: z.string().trim().min(1, 'Last name is required.'),
  platform_role: z.enum(['attendee', 'organizer']).default('attendee').optional(),
});

export const updateProfileSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.'),
  last_name: z.string().trim().min(1, 'Last name is required.'),
  avatar_url: z.string().trim().url().nullish(),
});

export const updatePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required.'),
  new_password: z.string().min(6, 'New password must be at least 6 characters.'),
});

export const updateRoleSchema = z.object({
  role: z.enum(['attendee', 'organizer'], {
    errorMap: () => ({ message: 'Role must be either "attendee" or "organizer".' }),
  }),
});

export const updateNotificationsSchema = z.object({
  notify_event_start: z.boolean().default(false),
  notify_weekly_digest: z.boolean().default(false),
  notify_marketing: z.boolean().default(false),
});

// ─── Event Schemas ───────────────────────────────────────────────────────────

export const createEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Event title is required.')
    .max(255, 'Event title must not exceed 255 characters.'),
  description: z.string().trim().nullish(),
  start_timestamp: timestampSchema,
  end_timestamp: timestampSchema,
  maximum_capacity: z.coerce
    .number()
    .int('Maximum capacity must be an integer.')
    .positive('Maximum capacity must be a positive integer greater than zero.'),
  banner_image_url: z.string().trim().nullish(),
}).refine(data => {
  const start = new Date(data.start_timestamp).getTime();
  return start > Date.now();
}, {
  message: 'Event start date must be in the future.',
  path: ['start_timestamp']
}).refine(data => {
  const start = new Date(data.start_timestamp).getTime();
  const end = new Date(data.end_timestamp).getTime();
  return end > start;
}, {
  message: 'Event end date must be after the start date.',
  path: ['end_timestamp']
});

export const updateEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Event title must not be empty.')
    .max(255, 'Event title must not exceed 255 characters.')
    .optional(),
  description: z.string().trim().nullish(),
  start_timestamp: timestampSchema.optional(),
  end_timestamp: timestampSchema.optional(),
  maximum_capacity: z.coerce
    .number()
    .int('Maximum capacity must be an integer.')
    .positive('Maximum capacity must be greater than zero.')
    .optional(),
  banner_image_url: z.string().trim().nullish(),
  status: z
    .enum(['draft', 'published', 'active', 'cancelled', 'completed'], {
      errorMap: () => ({ message: 'Invalid event status value.' }),
    })
    .optional(),
}).refine(data => {
  if (data.start_timestamp) {
    const start = new Date(data.start_timestamp).getTime();
    return start > Date.now();
  }
  return true;
}, {
  message: 'Updated event start date must be in the future.',
  path: ['start_timestamp']
}).refine(data => {
  if (data.start_timestamp && data.end_timestamp) {
    const start = new Date(data.start_timestamp).getTime();
    const end = new Date(data.end_timestamp).getTime();
    return end > start;
  }
  return true;
}, {
  message: 'Event end date must be after the start date.',
  path: ['end_timestamp']
});

// ─── Session Schemas ─────────────────────────────────────────────────────────

export const createSessionSchema = z.object({
  session_title: z
    .string()
    .trim()
    .min(1, 'Session title is required.')
    .max(255, 'Session title must not exceed 255 characters.'),
  session_description: z.string().trim().nullish(),
  session_start_time: timestampSchema,
  session_end_time: timestampSchema,
  track_name: z
    .string()
    .trim()
    .min(1, 'Track allocation is required.')
    .max(100, 'Track name must not exceed 100 characters.'),
  speaker_id: uuidSchema.nullish(),
  session_capacity_limit: z.coerce.number().int().positive().nullish(),
});

export const updateSessionSchema = z.object({
  session_title: z
    .string()
    .trim()
    .min(1, 'Session title must not be empty.')
    .max(255, 'Session title must not exceed 255 characters.')
    .optional(),
  session_description: z.string().trim().nullish(),
  session_start_time: timestampSchema.optional(),
  session_end_time: timestampSchema.optional(),
  track_name: z
    .string()
    .trim()
    .min(1, 'Track allocation must not be empty.')
    .max(100, 'Track name must not exceed 100 characters.')
    .optional(),
  speaker_id: uuidSchema.nullish(),
  session_capacity_limit: z.coerce.number().int().positive().nullish(),
});

// ─── Registration Schemas ────────────────────────────────────────────────────

export const createRegistrationSchema = z.object({
  event_id: uuidSchema,
});

export const updateRegistrationSchema = z.object({
  registration_status: z
    .enum(['confirmed', 'waitlisted', 'cancelled'], {
      errorMap: () => ({
        message: 'registration_status must be confirmed, waitlisted, or cancelled.',
      }),
    })
    .optional(),
  has_checked_in: z.boolean().optional(),
});

export const bulkUpdateRegistrationSchema = z.object({
  ids: z
    .array(uuidSchema)
    .min(1, 'ids parameter must be a non-empty array.'),
  registration_status: z
    .enum(['confirmed', 'waitlisted', 'cancelled'], {
      errorMap: () => ({
        message: 'registration_status must be confirmed, waitlisted, or cancelled.',
      }),
    })
    .optional(),
  has_checked_in: z.boolean().optional(),
});

// ─── Resource Schemas ────────────────────────────────────────────────────────

export const uploadResourceBodySchema = z.object({
  event_id: uuidSchema.optional(),
  visibility_clearance: z
    .enum(['public_accessible', 'attendees_only'], {
      errorMap: () => ({
        message: 'visibility_clearance must be "public_accessible" or "attendees_only".',
      }),
    })
    .default('public_accessible')
    .optional(),
  title: z.string().trim().optional(),
  url: z.string().trim().optional(),
  type: z.string().trim().optional(),
});

// ─── Broadcast Schemas ───────────────────────────────────────────────────────

export const createBroadcastSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required.'),
  content: z.string().trim().min(1, 'Content is required.'),
  audience_cohort: z.string().trim().min(1, 'Audience cohort is required.'),
});

export const updateTriggersSchema = z.object({
  trigger_registration_confirmation: z.boolean().default(false),
  trigger_t_minus_24h: z.boolean().default(false),
  trigger_t_minus_1h: z.boolean().default(false),
  trigger_t_plus_24h: z.boolean().default(false),
});

// ─── Question Schemas ────────────────────────────────────────────────────────

export const createQuestionSchema = z.object({
  question_text: z
    .string()
    .trim()
    .min(10, 'Question must be at least 10 characters long.'),
});

export const upvoteQuestionParamsSchema = z.object({
  eventId: uuidSchema,
  questionId: uuidSchema,
});

// ─── SSE / Poll Schemas ─────────────────────────────────────────────────────

export const launchPollSchema = z.object({
  question: z.string().trim().min(1, 'Poll question is required.'),
  options: z
    .array(z.string().trim().min(1))
    .min(2, 'At least two options are required.'),
});

export const submitVoteSchema = z.object({
  optionIndex: z.coerce.number().int().min(0, 'Valid optionIndex is required.'),
});

export const dispatchOverrideSchema = z.object({
  message: z.string().trim().min(1, 'Override message is required.'),
});

// ─── Security Schemas ────────────────────────────────────────────────────────

export const logViolationSchema = z.object({
  path: z.string().optional(),
  userRole: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
});

// ─── Task Schemas ────────────────────────────────────────────────────────────

export const triggerExportSchema = z.object({
  eventId: uuidSchema.optional(),
});
