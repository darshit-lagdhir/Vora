import { 
  registerClient, 
  launchPoll, 
  votePoll, 
  terminatePoll, 
  setOverride, 
  clearOverride 
} from '../services/sseService.js';

/**
 * Handshake for Server-Sent Events connection stream.
 * GET /api/v1/events/:id/stream
 */
export const streamEventUpdates = (req, res, next) => {
  try {
    const eventId = req.params.id;
    const user = req.user || null;

    // Parse the Last-Event-ID header or query parameter for drop gap replaying
    const lastEventId = req.headers['last-event-id'] || req.query.lastEventId || null;

    // Register EventSource socket and fetch unsubscribe cleanup hook
    const unsubscribe = registerClient(eventId, user, res, lastEventId);

    // Fail-safe cleanup mechanism on connection teardown
    req.on('close', () => {
      unsubscribe();
      res.end(); // Forcefully close socket write stream
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Launch a live audience poll.
 * POST /api/v1/events/:id/polls
 */
export const launchLivePoll = (req, res, next) => {
  try {
    const eventId = req.params.id;
    // Zod schema has already validated question and options (min 2 entries)
    const { question, options } = req.body;

    const poll = launchPoll(eventId, question, options);

    res.status(200).json({
      success: true,
      message: 'Live poll successfully launched to all clients.',
      data: poll
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit a vote to the active poll.
 * POST /api/v1/events/:id/polls/vote
 */
export const submitPollVote = (req, res, next) => {
  try {
    const eventId = req.params.id;
    // Zod schema has already validated optionIndex as a non-negative integer
    const { optionIndex } = req.body;

    const poll = votePoll(eventId, optionIndex);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'No active poll is running for this event.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vote successfully registered.',
      data: poll
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Terminate the active poll.
 * POST /api/v1/events/:id/polls/terminate
 */
export const terminateLivePoll = (req, res, next) => {
  try {
    const eventId = req.params.id;
    terminatePoll(eventId);

    res.status(200).json({
      success: true,
      message: 'Active poll terminated.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Dispatch global warning override notification.
 * POST /api/v1/events/:id/override
 */
export const dispatchOverride = (req, res, next) => {
  try {
    const eventId = req.params.id;
    // Zod schema has already validated message (non-empty, trimmed)
    const { message } = req.body;

    setOverride(eventId, message);

    res.status(200).json({
      success: true,
      message: 'Global override warning banner successfully dispatched.',
      data: { message }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Revoke global warning override notification.
 * POST /api/v1/events/:id/override/revoke
 */
export const revokeOverride = (req, res, next) => {
  try {
    const eventId = req.params.id;
    clearOverride(eventId);

    res.status(200).json({
      success: true,
      message: 'Global override warning banner revoked.'
    });
  } catch (err) {
    next(err);
  }
};
