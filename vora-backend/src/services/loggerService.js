import pino from 'pino';
import { als } from '../utils/als.js';
import { redactObject } from '../utils/redactor.js';

const isDev = process.env.NODE_ENV === 'development';

// Custom pretty printer for development console
const prettyStream = {
  write(string) {
    try {
      const logObj = JSON.parse(string.trim());
      const { level, msg, timestamp, module, errMessage, stack, method, url, statusCode, durationMs } = logObj;
      
      const levels = {
        10: 'TRACE',
        20: 'DEBUG',
        30: 'INFO',
        40: 'WARN',
        50: 'ERROR',
        60: 'FATAL'
      };
      
      const levelName = levels[level] || 'LOG';
      const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
      
      // Color escape sequences for clean terminal presentation
      const colorReset = '\x1b[0m';
      const colorDim = '\x1b[2m';
      const colorRed = '\x1b[31m';
      const colorYellow = '\x1b[33m';
      const colorCyan = '\x1b[36m';
      
      let levelColor = colorReset;
      if (level >= 50) levelColor = colorRed;
      else if (level >= 40) levelColor = colorYellow;
      else if (level >= 30) levelColor = colorCyan;
      
      let prefix = `${colorDim}[${timeStr}]${colorReset} ${levelColor}[${levelName}]${colorReset}`;
      if (module) {
        prefix += ` ${colorDim}(${module})${colorReset}`;
      }
      
      let line = `${prefix} ${msg || ''}`;
      
      if (method && url) {
        line += ` | ${method} ${url}`;
      }
      if (statusCode) {
        line += ` → ${statusCode}`;
      }
      if (durationMs !== undefined) {
        line += ` (${durationMs}ms)`;
      }
      if (errMessage) {
        line += ` - ${errMessage}`;
      }
      
      process.stdout.write(line + '\n');
      
      if (stack && level >= 50) {
        const cleanStack = stack.split('\n').slice(0, 4).join('\n');
        process.stdout.write(colorDim + cleanStack + '\n' + colorReset);
      }
    } catch (e) {
      process.stdout.write(string);
    }
  }
};

// Decouple logging writes by leveraging Pino asynchronous destination in production
const asyncDest = pino.destination({ sync: false });
const destinationStream = isDev ? prettyStream : asyncDest;
const defaultLevel = process.env.LOG_LEVEL || (isDev ? 'warn' : 'info');

export const logger = pino(
  {
    level: defaultLevel,
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
  destinationStream
);

// Flush buffers on shutdown
let isExiting = false;
process.on('beforeExit', () => {
  if (!isExiting) {
    isExiting = true;
    if (!isDev) {
      try {
        process.stdout.write('Flushing logger buffers before exit.\n');
      } catch (e) {}
      asyncDest.flushSync();
    }
  }
});

export default logger;
