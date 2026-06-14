import crypto from 'crypto';
import { eventHub } from '../utils/eventHub.js';

// In-memory global task registry
export const tasksStore = {};

/**
 * Helper to generate an ETag hash for a JSON payload and handle client validation.
 */
export const handleETag = (req, res, data) => {
  const jsonString = JSON.stringify(data);
  const hash = crypto.createHash('sha1').update(jsonString).digest('base64');
  const etag = `W/"${hash}"`;

  res.setHeader('ETag', etag);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  return res.status(200).json(data);
};

/**
 * Creates a background task that increments progress asynchronously.
 */
export const createBackgroundTask = (type, payload = {}) => {
  const taskId = `task-${crypto.randomUUID().split('-')[0]}`;
  
  const task = {
    id: taskId,
    type,
    status: 'active',
    progress: 0,
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  tasksStore[taskId] = task;

  // Emit initial background task creation
  eventHub.emit('event_mutate', {
    eventId: payload.eventId || 'global',
    eventType: 'BACKGROUND_TASK_MUTATED',
    payload: task
  });

  // Simulate progress in the background (increments progress every 1.5s to 100%)
  const intervalId = setInterval(() => {
    const activeTask = tasksStore[taskId];
    if (!activeTask) {
      clearInterval(intervalId);
      return;
    }

    if (activeTask.progress < 100) {
      activeTask.progress += Math.floor(Math.random() * 15) + 10;
      if (activeTask.progress >= 100) {
        activeTask.progress = 100;
        activeTask.status = 'completed';
        activeTask.updatedAt = new Date().toISOString();
        clearInterval(intervalId);
      } else {
        activeTask.updatedAt = new Date().toISOString();
      }

      // Emit progression update
      eventHub.emit('event_mutate', {
        eventId: activeTask.payload?.eventId || 'global',
        eventType: 'BACKGROUND_TASK_MUTATED',
        payload: activeTask
      });
    } else {
      clearInterval(intervalId);
    }
  }, 1500);

  return task;
};

/**
 * Fetch all background tasks
 * GET /api/v1/tasks
 */
export const getTasks = (req, res, next) => {
  try {
    const tasksArray = Object.values(tasksStore).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    return handleETag(req, res, {
      success: true,
      data: tasksArray
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Check progression of a specific task
 * GET /api/v1/tasks/:id/status
 */
export const getTaskStatus = (req, res, next) => {
  try {
    const { id } = req.params;
    const task = tasksStore[id];

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Background task not found.'
      });
    }

    return handleETag(req, res, {
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Dispatch an asynchronous CSV ledger export
 * POST /api/v1/tasks/export-ledger
 */
export const triggerLedgerExport = (req, res, next) => {
  try {
    // Zod schema has already validated the body payload
    const { eventId } = req.body;
    const task = createBackgroundTask('CSV LEDGER EXPORT', { eventId });

    res.status(202).json({
      success: true,
      message: 'CSV ledger export job dispatched successfully.',
      data: task
    });
  } catch (err) {
    next(err);
  }
};
