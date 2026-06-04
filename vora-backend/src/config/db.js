import pg from 'pg';
import env from './env.js';

const { Pool } = pg;

console.log('[Database] Initializing PostgreSQL connection pool...');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    // Required for secure Supabase cloud database connections
    rejectUnauthorized: false,
  },
  max: 20,                  // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection fails
});

// Test the database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[Database] FATAL: PostgreSQL connection failed!');
    console.error(err.message);
    process.exit(1);
  } else {
    console.log('[Database] PostgreSQL connection pool verified successfully.');
    console.log(`[Database] Server time is: ${res.rows[0].now}`);
  }
});

// Capture pool error events to prevent application crashes
pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err.message);
});

export default pool;
