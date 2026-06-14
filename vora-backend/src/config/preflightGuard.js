import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

// Enforce environment fallbacks in test mode to protect test execution
if (process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'be7333f3ddd09c754a5c0b1d793def4a32fd92194b65454328e80b84dcd06d3b24a8d1074b8a4db60338bf0af64ea3564b36dfe1107a6af11035de11ac2127be';
  process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
  process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
  process.env.NATIVE_COMPILATION_SHIELD = process.env.NATIVE_COMPILATION_SHIELD || 'true';
}

const validationRules = {
  DATABASE_URL: {
    required: true,
    validate: (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
    message: 'Must be a valid PostgreSQL connection string starting with postgres:// or postgresql://'
  },
  REDIS_URL: {
    required: true,
    validate: (val) => val.startsWith('redis://') || val.startsWith('rediss://'),
    message: 'Must be a valid Redis connection string starting with redis:// or rediss://'
  },
  JWT_SECRET: {
    required: true,
    validate: (val) => val.trim().length >= 32,
    message: 'Cryptographic secret must possess sufficient entropy (at least 32 characters).'
  },
  ACCESS_TOKEN_SECRET: {
    required: true,
    validate: (val) => val.trim().length >= 32,
    message: 'Access token secret must possess sufficient entropy (at least 32 characters).'
  },
  REFRESH_TOKEN_SECRET: {
    required: true,
    validate: (val) => val.trim().length >= 32,
    message: 'Refresh token secret must possess sufficient entropy (at least 32 characters).'
  },
  PORT: {
    required: false,
    validate: (val) => {
      if (!val) return true;
      const port = parseInt(val, 10);
      return !isNaN(port) && port >= 1 && port <= 65535;
    },
    message: 'Port must be a valid system network port number between 1 and 65535.'
  },
  NATIVE_COMPILATION_SHIELD: {
    required: true,
    validate: (val) => val !== undefined && val.trim() !== '',
    message: 'Native compilation shield runtime flags must be set.'
  }
};

const failures = {};

for (const [key, rule] of Object.entries(validationRules)) {
  const value = process.env[key];

  if (rule.required && (value === undefined || value.trim() === '')) {
    failures[key] = {
      error: 'MISSING_CONFIGURATION_KEY',
      details: 'This environment variable is required but is missing or empty.'
    };
    continue;
  }

  if (value !== undefined && value.trim() !== '') {
    try {
      const isValid = rule.validate(value);
      if (!isValid) {
        failures[key] = {
          error: 'MALFORMED_CONFIGURATION_VALUE',
          details: rule.message,
          received: key.toLowerCase().includes('secret') ? '[REDACTED_SENSITIVE_KEY]' : value
        };
      }
    } catch (err) {
      failures[key] = {
        error: 'VALIDATION_EXCEPTION',
        details: err.message
      };
    }
  }
}

if (Object.keys(failures).length > 0) {
  const errorPayload = {
    success: false,
    status: 'FATAL_PREFLIGHT_ERROR',
    message: 'Vora Core Engine failed to boot due to missing, malformed, or insecure environment configurations.',
    timestamp: new Date().toISOString(),
    failures
  };

  // Print clear, structured JSON error payload directly to stdout
  process.stdout.write(JSON.stringify(errorPayload, null, 2) + '\n');
  process.exit(1);
}
