import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { cacheRoute } from '../../src/middleware/cacheMiddleware.js';
import { setRedisPassThroughForTesting, setMockClientForTesting } from '../../src/config/redis.js';
import { triggerCachePurge } from '../../src/services/cacheInvalidationService.js';

describe('Cache Caching and Invalidation Suite', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    // Construct the mock client
    mockClient = {
      isOpen: true,
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      scanIterator: jest.fn(),
    };

    setRedisPassThroughForTesting(false);
    setMockClientForTesting(mockClient);

    app = express();
    app.use(express.json());

    // Setup a simple route cached for 10 seconds under events domain
    app.get('/test-cached', cacheRoute(10, 'events'), (req, res) => {
      res.status(200).json({ data: 'fresh-data' });
    });
  });

  afterEach(() => {
    setRedisPassThroughForTesting(true);
    setMockClientForTesting(null);
    jest.restoreAllMocks();
  });

  describe('cacheRoute Middleware', () => {
    it('should result in a MISS on the first call and invoke cacheSet', async () => {
      mockClient.get.mockResolvedValue(null);
      mockClient.set.mockResolvedValue('OK');

      const res = await request(app).get('/test-cached');

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-cache']).toBe('MISS');
      expect(res.body.data).toBe('fresh-data');
      expect(mockClient.get).toHaveBeenCalled();
      expect(mockClient.set).toHaveBeenCalledWith(
        expect.stringContaining('domain:events'),
        JSON.stringify({ data: 'fresh-data' }),
        { EX: 10 }
      );
    });

    it('should result in a HIT on subsequent calls if cached data exists', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ data: 'cached-data' }));

      const res = await request(app).get('/test-cached');

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-cache']).toBe('HIT');
      expect(res.body.data).toBe('cached-data');
      expect(mockClient.get).toHaveBeenCalled();
      expect(mockClient.set).not.toHaveBeenCalled();
    });

    it('should bypass caching for non-GET requests', async () => {
      app.post('/test-cached', cacheRoute(10, 'events'), (req, res) => {
        res.status(201).json({ data: 'post-data' });
      });

      const res = await request(app).post('/test-cached').send({});

      expect(res.statusCode).toBe(201);
      expect(res.headers['x-cache']).toBeUndefined();
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.set).not.toHaveBeenCalled();
    });
  });

  describe('cacheInvalidationService', () => {
    it('should scan and delete matching keys on purge trigger', async () => {
      // Setup mock scan iterator for keys
      mockClient.scanIterator.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield 'vora:cache:abc:domain:events';
          yield 'vora:cache:xyz:domain:events';
        },
      });
      mockClient.del.mockResolvedValue(1);

      await triggerCachePurge('events');

      expect(mockClient.scanIterator).toHaveBeenCalledWith({
        MATCH: '*:domain:events',
        COUNT: 100,
      });
      expect(mockClient.del).toHaveBeenCalledTimes(2);
      expect(mockClient.del).toHaveBeenNthCalledWith(1, 'vora:cache:abc:domain:events');
      expect(mockClient.del).toHaveBeenNthCalledWith(2, 'vora:cache:xyz:domain:events');
    });

    it('should handle no keys to evict gracefully', async () => {
      mockClient.scanIterator.mockReturnValue({
        async *[Symbol.asyncIterator]() {},
      });

      await triggerCachePurge('events');

      expect(mockClient.scanIterator).toHaveBeenCalledWith({
        MATCH: '*:domain:events',
        COUNT: 100,
      });
      expect(mockClient.del).not.toHaveBeenCalled();
    });
  });
});
