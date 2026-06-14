import pool from '../config/db.js';
import { client as redisClient, isRedisPassThrough } from '../config/redis.js';
import nativeWorkerService from '../services/nativeWorkerService.js';
import logger from '../services/loggerService.js';

/**
 * Liveness Probe: fast lightweight check to ensure V8 event loop is running.
 * GET /api/v1/health/live
 */
export const getLiveHealth = (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
};

/**
 * Readiness Probe: deep health inspection of all underlying dependencies.
 * GET /api/v1/health/deep
 */
export const getDeepHealth = async (req, res) => {
  const startTotal = process.hrtime();
  
  // Timeout wrapper of 2000ms
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('HEALTH_CHECK_TIMEOUT')), 2000)
  );

  try {
    const checks = Promise.all([
      checkDatabase(),
      checkRedis(),
      checkNativeWorker()
    ]);

    // Race the checks against the 2000ms timeout threshold
    const [dbStatus, redisStatus, workerStatus] = await Promise.race([checks, timeoutPromise]);

    // Determine system capacity statistics
    const memory = process.memoryUsage();
    const eventLoopLagMs = await measureEventLoopLag();
    const openHandles = process._getActiveHandles ? process._getActiveHandles().length : 0;
    const openRequests = process._getActiveRequests ? process._getActiveRequests().length : 0;

    const totalElapsed = process.hrtime(startTotal);
    const durationMs = (totalElapsed[0] * 1000) + (totalElapsed[1] / 1000000);

    const isSystemHealthy = dbStatus.healthy && redisStatus.healthy && workerStatus.healthy;

    const healthReport = {
      status: isSystemHealthy ? 'nominal' : 'degraded',
      timestamp: new Date().toISOString(),
      durationMs: parseFloat(durationMs.toFixed(2)),
      components: {
        database: sanitizeComponent(dbStatus),
        cache: sanitizeComponent(redisStatus),
        nativeWorker: sanitizeComponent(workerStatus)
      },
      system: {
        eventLoopLagMs: parseFloat(eventLoopLagMs.toFixed(2)),
        openHandles,
        openRequests,
        memory: {
          rss: `${Math.round((memory.rss / 1024 / 1024) * 100) / 100} MB`,
          heapTotal: `${Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100} MB`,
          heapUsed: `${Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100} MB`,
          external: `${Math.round((memory.external / 1024 / 1024) * 100) / 100} MB`
        }
      }
    };

    if (!isSystemHealthy) {
      // Internal detailed logging
      logger.error(
        { module: 'healthController.js', report: healthReport, dbStatus, redisStatus, workerStatus },
        'DEEP HEALTH MONITORING FAILURE: Infrastructure degradation detected.'
      );
      
      // Sanitized 503 error payload
      return res.status(503).json({
        success: false,
        status: 'degraded',
        error: determineFailureTier(dbStatus, redisStatus, workerStatus),
        report: healthReport
      });
    }

    return res.status(200).json({
      success: true,
      ...healthReport
    });

  } catch (err) {
    const errorMsg = err.message === 'HEALTH_CHECK_TIMEOUT' 
      ? 'Health check timed out after 2000ms' 
      : 'Internal health check exception: ' + err.message;

    logger.error(
      { module: 'healthController.js', err: err.message, stack: err.stack },
      `DEEP HEALTH CHECK CRITICAL FAILURE: ${errorMsg}`
    );

    return res.status(503).json({
      success: false,
      status: 'degraded',
      error: err.message === 'HEALTH_CHECK_TIMEOUT' ? 'TIMEOUT_LIMIT_BREACHED' : 'HEALTH_CHECK_EXCEPTION',
      message: 'One or more system components failed to respond within limits.'
    });
  }
};

/**
 * ─── Database Operational Status Check ───
 */
async function checkDatabase() {
  const start = process.hrtime();
  try {
    // Run simple ping
    await pool.query('SELECT 1');
    const elapsed = process.hrtime(start);
    return {
      healthy: true,
      latencyMs: (elapsed[0] * 1000) + (elapsed[1] / 1000000)
    };
  } catch (err) {
    return {
      healthy: false,
      error: 'DATABASE_UNREACHABLE',
      details: err.message // Will be scrubbed in public response
    };
  }
}

/**
 * ─── Redis Cache Operational Status Check ───
 */
async function checkRedis() {
  const start = process.hrtime();
  try {
    if (isRedisPassThrough()) {
      return {
        healthy: true, // Redis pass-through mode in testing is considered nominal
        latencyMs: 0,
        mode: 'pass-through'
      };
    }

    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis socket is closed.');
    }

    // Try set/get cycle to check end-to-end memory bus performance
    const key = `health_check_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    await redisClient.set(key, 'ok', { EX: 5 });
    await redisClient.get(key);

    const elapsed = process.hrtime(start);
    return {
      healthy: true,
      latencyMs: (elapsed[0] * 1000) + (elapsed[1] / 1000000)
    };
  } catch (err) {
    return {
      healthy: false,
      error: 'CACHE_POOL_EXHAUSTED',
      details: err.message // Will be scrubbed in public response
    };
  }
}

/**
 * ─── Cross-language Native Worker Status Check ───
 */
async function checkNativeWorker() {
  const start = process.hrtime();
  try {
    // Poll the worker service with a valid signature check to make sure worker is hot
    const response = await nativeWorkerService.verifySignature('VALID_MOCK_SIGNATURE', 'mock-key', 'health-check');
    if (!response) {
      throw new Error('Worker verify signature response returned invalid result');
    }

    const elapsed = process.hrtime(start);
    return {
      healthy: true,
      latencyMs: (elapsed[0] * 1000) + (elapsed[1] / 1000000)
    };
  } catch (err) {
    return {
      healthy: false,
      error: 'NATIVE_WORKER_UNRESPONSIVE',
      details: err.message
    };
  }
}

/**
 * Measures Event Loop execution latency.
 */
function measureEventLoopLag() {
  return new Promise((resolve) => {
    const start = process.hrtime();
    setTimeout(() => {
      const elapsed = process.hrtime(start);
      const lagMs = (elapsed[0] * 1000) + (elapsed[1] / 1000000);
      resolve(lagMs);
    }, 0);
  });
}

/**
 * Helper to determine error flag code.
 */
function determineFailureTier(db, redis, worker) {
  if (!db.healthy) return 'DATABASE_UNREACHABLE';
  if (!redis.healthy) return 'CACHE_POOL_EXHAUSTED';
  if (!worker.healthy) return 'NATIVE_WORKER_UNRESPONSIVE';
  return 'DEGRADED_STATE';
}

/**
 * Sanitizes component report to scrub connection details / folder paths.
 */
function sanitizeComponent(statusObj) {
  if (statusObj.healthy) {
    return {
      status: 'healthy',
      latencyMs: parseFloat(statusObj.latencyMs.toFixed(2))
    };
  }

  // Explicitly return ONLY flag, scrub details
  return {
    status: 'unhealthy',
    error: statusObj.error
  };
}
