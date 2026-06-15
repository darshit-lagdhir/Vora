import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { rateLimiter } from '../../src/middleware/rateLimiter.js';
import {
  blacklistInterceptor,
  getClientIp,
  isPrivateIp,
  registerRateLimitBreach,
} from '../../src/services/securityService.js';
import { setRedisPassThroughForTesting, setMockClientForTesting } from '../../src/config/redis.js';

describe('Ingress Security & Rate Limiting Integration Suite', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      isOpen: true,
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      scanIterator: jest.fn(),
      multi: jest.fn(),
      sIsMember: jest.fn(),
      exists: jest.fn(),
      sAdd: jest.fn(),
      sRem: jest.fn(),
      zRangeWithScores: jest.fn(),
      zRange: jest.fn(),
    };

    setRedisPassThroughForTesting(false);
    setMockClientForTesting(mockClient);

    app = express();
    app.use(express.json());
    app.set('trust proxy', true);

    // Apply blacklist interceptor at top
    app.use(blacklistInterceptor);

    // Setup dummy route under Critical Security (5 requests limit)
    app.get(
      '/login-test',
      rateLimiter({ limit: 5, windowMs: 60000, profileName: 'critical_security' }),
      (req, res) => {
        res.status(200).json({ data: 'success' });
      }
    );
  });

  afterEach(() => {
    setRedisPassThroughForTesting(true);
    setMockClientForTesting(null);
    jest.restoreAllMocks();
  });

  describe('getClientIp & Proxy Resolution', () => {
    it('should correctly identify loopback/private IPs', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('172.16.5.4')).toBe(true);
      expect(isPrivateIp('8.8.8.8')).toBe(false); // Public Google DNS
    });

    it('should extract the leftmost non-private IP signature from the chain', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '10.0.0.2, 192.168.1.50, 8.8.8.8, 127.0.0.1',
        },
      };
      // 8.8.8.8 is the first non-private IP in the chain from left
      expect(getClientIp(mockReq)).toBe('8.8.8.8');
    });
  });

  describe('blacklistInterceptor & Quarantine checks', () => {
    it('should allow clean requests from non-blacklisted IPs', async () => {
      mockClient.sIsMember.mockResolvedValue(false);
      mockClient.multi.mockReturnValue({
        zRemRangeByScore: jest.fn().mockReturnThis(),
        zCard: jest.fn().mockReturnThis(),
        zAdd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([0, 0, 1, 1]), // activeCount is 1
      });

      const res = await request(app).get('/login-test').set('X-Forwarded-For', '8.8.8.8');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBe('success');
    });

    it('should drop connections and return 403 on blacklisted IPs', async () => {
      mockClient.sIsMember.mockResolvedValue(true);
      mockClient.exists.mockResolvedValue(1); // Expiration key exists

      const res = await request(app).get('/login-test').set('X-Forwarded-For', '8.8.8.8');

      expect(res.statusCode).toBe(403);
      expect(res.headers['connection']).toBe('close');
      expect(res.text).toBe(''); // Empty response payload
    });
  });

  describe('Rate Limiter Header & Sliding-Window Behavior', () => {
    it('should decrement remaining count and reject when limits are breached', async () => {
      mockClient.sIsMember.mockResolvedValue(false);

      // Request count at 5 (which is the limit), next request count will be 6 (breach)
      mockClient.multi.mockReturnValue({
        zRemRangeByScore: jest.fn().mockReturnThis(),
        zCard: jest.fn().mockReturnThis(),
        zAdd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([0, 5, 1, 1]), // count = 5 before add, active = 6
      });
      // Mock oldest score timestamp inside sorted set (e.g. 50 seconds ago)
      mockClient.zRangeWithScores.mockResolvedValue([{ score: Date.now() - 50000, value: 'xyz' }]);
      mockClient.zRange.mockResolvedValue([]);

      const res = await request(app).get('/login-test').set('X-Forwarded-For', '8.8.8.8');

      expect(res.statusCode).toBe(429);
      expect(res.headers['x-ratelimit-limit']).toBe('5');
      expect(res.headers['x-ratelimit-remaining']).toBe('0');
      // Retry-After = (oldestScore + windowMs - now) / 1000 = (-50000 + 60000) / 1000 = 10s
      expect(res.headers['retry-after']).toBe('10');
    });
  });

  describe('IP-Intelligence Correlation', () => {
    it('should blacklist an IP if it triggers breaches across multiple different profiles', async () => {
      mockClient.multi.mockReturnValue({
        zRemRangeByScore: jest.fn().mockReturnThis(),
        zAdd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        sAdd: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([1, 1, 1]),
      });

      // Mock breaches in last 10 minutes containing different profiles: 'critical_security' and 'public_read'
      mockClient.zRange.mockResolvedValue(['critical_security:uuid-1', 'public_read:uuid-2']);

      await registerRateLimitBreach('9.9.9.9', 'public_read');

      // Verify ban is called (sAdd to blacklist:ips)
      expect(mockClient.multi).toHaveBeenCalled();
    });
  });
});
