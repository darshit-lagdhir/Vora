import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the root .env file of the workspace
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

const requiredKeys = ['DATABASE_URL', 'JWT_SECRET'];
const missingKeys = [];

// Validate presence and content of required keys
requiredKeys.forEach((key) => {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    missingKeys.push(key);
  }
});

// Fail-fast logic if requirements are not met
if (missingKeys.length > 0) {
  console.error('================================================================================');
  console.error('FATAL SYSTEM CONFIGURATION ERROR');
  console.error('The following environment variables are missing, undefined, or malformed:');
  missingKeys.forEach((key) => console.error(`  - ${key}`));
  console.error('Please configure your .env file correctly before restarting the server.');
  console.error('================================================================================');
  process.exit(1);
}

// Assemble the config object
const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
};

// Freeze the object to prevent runtime modification
Object.freeze(config);

export default config;
