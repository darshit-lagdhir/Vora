import pino from 'pino';
import { als } from '../utils/als.js';
import { redactObject } from '../utils/redactor.js';

// Decouple logging writes by leveraging Pino asynchronous destination
const asyncDest = pino.destination({ sync: false });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    // Mixin context automatically appends correlation details and user identity from ALS
    mixin() {
      const store = als.getStore() || {};
      return {
        correlationId: store.correlationId || 'N/A',
        userId: store.userId || null
      };
    },
    // Standard ISO 8601 formatting for machine readable indexing
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: {
      log(object) {
        return redactObject(object);
      }
    }
  },
  asyncDest
);

// Flush buffers on shutdown
let isExiting = false;
process.on('beforeExit', () => {
  if (!isExiting) {
    isExiting = true;
    try {
      process.stdout.write('Flushing logger buffers before exit.\n');
    } catch (e) {}
    asyncDest.flushSync();
  }
});

export default logger;
