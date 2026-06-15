import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { als } from '../../src/utils/als.js';
import { redactObject } from '../../src/utils/redactor.js';
import { correlationMiddleware } from '../../src/middleware/correlationMiddleware.js';
import { metricsMiddleware } from '../../src/middleware/metricsMiddleware.js';
import logger from '../../src/services/loggerService.js';

describe('Observability & Forensic Traceability Integration Suite', () => {
  describe('Forensic Data Redactor', () => {
    it('should recursively redact password, email, and token keys to [REDACTED]', () => {
      const sensitivePayload = {
        username: 'alice',
        email: 'alice@example.com',
        nested: {
          password: 'supersecretpassword123',
          cookie: 'session_token_xyz',
          unrelated: 42,
        },
        tokensArray: [{ token: 'jwt-header-part' }, { clean: 'value' }],
      };

      const redacted = redactObject(sensitivePayload);

      expect(redacted.username).toBe('alice');
      expect(redacted.email).toBe('[REDACTED]');
      expect(redacted.nested.password).toBe('[REDACTED]');
      expect(redacted.nested.cookie).toBe('[REDACTED]');
      expect(redacted.nested.unrelated).toBe(42);
      expect(redacted.tokensArray[0].token).toBe('[REDACTED]');
      expect(redacted.tokensArray[1].clean).toBe('value');
    });
  });

  describe('Correlation & Metrics Middleware', () => {
    let app;
    let logSpy;

    beforeEach(() => {
      logSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

      app = express();
      app.use(correlationMiddleware);
      app.use(metricsMiddleware);

      app.get('/test-trace', (req, res) => {
        const store = als.getStore();
        res.status(200).json({
          correlationId: store?.correlationId,
          userId: store?.userId,
        });
      });
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('should generate a new correlation ID if not provided, set headers, and log latency', async () => {
      const res = await request(app).get('/test-trace');

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.body.correlationId).toBe(res.headers['x-correlation-id']);

      expect(logSpy).toHaveBeenCalled();
      const loggedObj = logSpy.mock.calls[0][0];
      expect(loggedObj).toHaveProperty('durationMs');
      expect(loggedObj.url).toBe('/test-trace');
    });

    it('should preserve and propagate the client provided correlation ID', async () => {
      const clientCorrelationId = 'custom-correlation-uuid-value';

      const res = await request(app)
        .get('/test-trace')
        .set('X-Correlation-Id', clientCorrelationId);

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(clientCorrelationId);
      expect(res.body.correlationId).toBe(clientCorrelationId);
    });
  });
});
