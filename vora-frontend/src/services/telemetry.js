/**
 * Dynamic Frontend Telemetry Service for capturing React errors & user interactions.
 */

const frontendErrors = [];

/**
 * Scrubs highly radioactive PII details from string/object data.
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
 * Captures an unhandled React runtime error.
 */
export const captureFrontendError = (error, errorInfo = null) => {
  const errorLog = {
    message: scrubPII(error?.message || String(error)),
    stack: scrubPII(error?.stack || ''),
    componentStack: errorInfo?.componentStack ? scrubPII(errorInfo.componentStack) : null,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };

  frontendErrors.push(errorLog);

  // In production, forward to Sentry/Datadog endpoint
  console.log('[Telemetry Service] Unhandled exception aggregated:', errorLog);
};

export const getFrontendErrors = () => {
  return frontendErrors;
};
