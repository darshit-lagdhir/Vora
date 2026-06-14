const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'cookie',
  'authorization',
  'credit_card',
  'email',
  'email_address',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'secret'
]);

/**
 * Deep recursive scan over log objects to mask sensitive PII and cryptographic details.
 */
export function redactObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item));
  }

  const redacted = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const isSensitive = SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase());

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof val === 'object') {
      redacted[key] = redactObject(val);
    } else {
      redacted[key] = val;
    }
  }
  return redacted;
}
