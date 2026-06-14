import env from '../config/env.js';

// Simple in-memory error aggregator for Synthesis (Task 6)
const errorCache = new Map();

/**
 * Scrubs highly radioactive PII details from any object or string context.
 */
export const scrubPII = (data) => {
  if (!data) return data;

  const piiRegexes = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
    jwt: /eyJhbGciOi[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g,
    password: /("password"\s*:\s*")[^"]+(")/gi,
    authHeader: /(Bearer\s+)[a-zA-Z0-9-_.]+/gi
  };

  if (typeof data === 'string') {
    let scrubbed = data;
    scrubbed = scrubbed.replace(piiRegexes.email, '[REDACTED_EMAIL]');
    scrubbed = scrubbed.replace(piiRegexes.creditCard, '[REDACTED_CARD]');
    scrubbed = scrubbed.replace(piiRegexes.jwt, '[REDACTED_JWT]');
    scrubbed = scrubbed.replace(piiRegexes.password, '$1[REDACTED_PASSWORD]$2');
    scrubbed = scrubbed.replace(piiRegexes.authHeader, '$1[REDACTED_AUTH]');
    return scrubbed;
  }

  if (typeof data === 'object') {
    try {
      const serialized = JSON.stringify(data);
      const scrubbedString = scrubPII(serialized);
      return JSON.parse(scrubbedString);
    } catch (e) {
      return { error: '[UNPARSABLE_CONTEXT]' };
    }
  }

  return data;
};

/**
 * Aggregates and synthesizes logs to prevent dashboard spamming.
 */
export const reportBackendError = (err, req) => {
  const errorKey = `${err.message || 'Error'}-${err.stack ? err.stack.split('\n')[1] : 'unknown-line'}`;
  
  const current = errorCache.get(errorKey) || {
    message: scrubPII(err.message),
    stack: scrubPII(err.stack || ''),
    controller: req?.route?.path || req?.url || 'unknown-route',
    method: req?.method || 'unknown-method',
    count: 0,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  };

  current.count += 1;
  current.lastSeen = new Date().toISOString();
  errorCache.set(errorKey, current);

  // Log to production telemetry streams
  console.log(`[Telemetry Synthesis] Error aggregated. Key: ${errorKey}. Frequency: ${current.count}. Uptime: ${Math.floor(process.uptime())}s`);
  
  if (env.NODE_ENV === 'production') {
    // We log the scrubbed telemetry to stdout to satisfy the PaaS log drainer requirements
    console.log(JSON.stringify({
      telemetryType: 'error_synthesis',
      data: current
    }));
  }
};

export const getAggregatedErrors = () => {
  return Array.from(errorCache.values());
};

export const clearAggregatedErrors = () => {
  errorCache.clear();
};
