import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the root .env file of the workspace
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

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
