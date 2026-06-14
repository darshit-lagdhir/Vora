import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../../src/app.js';
import pool, { setQueryMockOverride } from '../../src/config/db.js';
import nativeWorkerService from '../../src/services/nativeWorkerService.js';
import {
  setRedisPassThroughForTesting,
  setMockClientForTesting
} from '../../src/config/redis.js';

describe('Deep Health & Integration Telemetry Suite', () => {
  let mockRedis;

  beforeEach(() => {
    mockRedis = {
      isOpen: true,
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('ok')
    };

    setRedisPassThroughForTesting(false);
    setMockClientForTesting(mockRedis);
  });

  afterEach(() => {
    setRedisPassThroughForTesting(true);
    setMockClientForTesting(null);
    setQueryMockOverride(null);
    jest.restoreAllMocks();
  });

  afterAll(() => {
    nativeWorkerService.stop();
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 and report process liveness without authentication', async () => {
      const res = await request(app).get('/api/v1/health/live');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/v1/health/deep', () => {
    it('should return 200 with full nominal diagnostics when all services are healthy', async () => {
      const res = await request(app).get('/api/v1/health/deep');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('nominal');
      expect(res.body.durationMs).toBeDefined();
      
      // Verify database diagnostics
      expect(res.body.components.database.status).toBe('healthy');
      expect(res.body.components.database.latencyMs).toBeDefined();

      // Verify cache diagnostics
      expect(res.body.components.cache.status).toBe('healthy');
      expect(res.body.components.cache.latencyMs).toBeDefined();

      // Verify worker diagnostics
      expect(res.body.components.nativeWorker.status).toBe('healthy');
      expect(res.body.components.nativeWorker.latencyMs).toBeDefined();

      // Verify system telemetry
      expect(res.body.system.eventLoopLagMs).toBeDefined();
      expect(res.body.system.openHandles).toBeDefined();
      expect(res.body.system.memory.rss).toBeDefined();
    });

    it('should return 503 and flag DATABASE_UNREACHABLE if postgres is down', async () => {
      // Mock db query to fail using helper
      setQueryMockOverride(async () => {
        throw new Error('Connection terminated');
      });

      const res = await request(app).get('/api/v1/health/deep');

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('degraded');
      expect(res.body.error).toBe('DATABASE_UNREACHABLE');
      expect(res.body.report.components.database.status).toBe('unhealthy');
      expect(res.body.report.components.database.error).toBe('DATABASE_UNREACHABLE');
      expect(res.body.report.components.database.details).toBeUndefined(); // Verify sanitized (no internal driver/details leaked)
    });

    it('should return 503 and flag CACHE_POOL_EXHAUSTED if Redis is down', async () => {
      // Mock redis write/get to fail
      mockRedis.get.mockRejectedValueOnce(new Error('Redis cluster unreachable'));

      const res = await request(app).get('/api/v1/health/deep');

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('degraded');
      expect(res.body.error).toBe('CACHE_POOL_EXHAUSTED');
      expect(res.body.report.components.cache.status).toBe('unhealthy');
      expect(res.body.report.components.cache.error).toBe('CACHE_POOL_EXHAUSTED');
    });

    it('should return 503 and flag NATIVE_WORKER_UNRESPONSIVE if native workers fail', async () => {
      // Mock worker service to fail
      const workerSpy = jest.spyOn(nativeWorkerService, 'verifySignature').mockRejectedValueOnce(new Error('IPC channel broken'));

      const res = await request(app).get('/api/v1/health/deep');

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('degraded');
      expect(res.body.error).toBe('NATIVE_WORKER_UNRESPONSIVE');
      expect(res.body.report.components.nativeWorker.status).toBe('unhealthy');
      expect(res.body.report.components.nativeWorker.error).toBe('NATIVE_WORKER_UNRESPONSIVE');

      workerSpy.mockRestore();
    });
  });
});
