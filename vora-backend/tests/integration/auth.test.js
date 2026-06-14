import request from 'supertest';
import app from '../../src/app.js';
import { validate, validateMultiple } from '../../src/middleware/validation.js';
import { z } from 'zod';
import { jest } from '@jest/globals';


describe('Auth Integration Tests', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return 201 with secure cookies', async () => {
      const payload = {
        email: 'organizer@vora.com',
        password: 'password123',
        first_name: 'Vora',
        last_name: 'Admin',
        platform_role: 'organizer',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);

      // Validate cookie headers and security flags
      const cookies = res.headers['set-cookie'] || [];
      expect(cookies.length).toBeGreaterThanOrEqual(2);

      const accessCookie = cookies.find((c) => c.includes('accessToken'));
      const refreshCookie = cookies.find((c) => c.includes('refreshToken'));

      expect(accessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();

      // Check for mandatory security flags
      [accessCookie, refreshCookie].forEach((cookie) => {
        const lower = cookie.toLowerCase();
        expect(lower).toContain('httponly');
        expect(lower).toContain('secure');
        expect(lower).toContain('samesite=strict');
      });
    });

    it('should block invalid registration and return 422 with validation errors', async () => {
      const payload = {
        email: 'invalid-email-format',
        password: '123', // Too short
        first_name: '', // Empty
        last_name: 'Doe',
        illegal_field: 'contamination_attempt', // Stripped/blocked
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.statusCode).toBe(422);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('status', 422);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);

      // Verify validation intercepts and lists the specific field-level validation errors
      const fieldsWithError = res.body.errors.map((e) => e.field);
      expect(fieldsWithError).toContain('email');
      expect(fieldsWithError).toContain('password');
      expect(fieldsWithError).toContain('first_name');
    });
  });

  describe('Validation Middleware Unit Tests', () => {
    it('should cover validate success path', () => {
      const mockSchema = {
        safeParse: (data) => ({ success: true, data })
      };
      const middleware = validate(mockSchema);
      const req = { body: { value: 'test' } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.value).toBe('test');
    });

    it('should cover validate failure with different issue field combinations', () => {
      const mockSchema = {
        safeParse: () => ({
          success: false,
          error: {
            issues: [
              {
                path: [],
                message: 'Empty path error',
                code: 'custom'
              },
              {
                path: ['field'],
                message: 'Expected only error',
                code: 'invalid_type',
                expected: 'string'
              },
              {
                path: ['another'],
                message: 'Received only error',
                code: 'invalid_type',
                received: 'number'
              },
              {
                path: ['both'],
                message: 'Both expected and received error',
                code: 'invalid_type',
                expected: 'string',
                received: 'number'
              }
            ]
          }
        })
      };
      
      const middleware = validate(mockSchema, 'body');
      const req = { body: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalled();
      
      const errors = res.json.mock.calls[0][0].errors;
      expect(errors[0].field).toBe('body'); // empty path fallback
      expect(errors[1].expected).toBe('string');
      expect(errors[1].received).toBeUndefined();
      expect(errors[2].expected).toBeUndefined();
      expect(errors[2].received).toBe('number');
      expect(errors[3].expected).toBe('string');
      expect(errors[3].received).toBe('number');
    });

    it('should cover validateMultiple success path', () => {
      const mockSchema1 = { safeParse: (data) => ({ success: true, data }) };
      const mockSchema2 = { safeParse: (data) => ({ success: true, data }) };
      const middleware = validateMultiple([
        { schema: mockSchema1, source: 'body' },
        { schema: mockSchema2, source: 'query' }
      ]);
      const req = { body: { a: 1 }, query: { b: 2 } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should cover validateMultiple failure paths', () => {
      const mockSchema1 = { safeParse: (data) => ({ success: true, data }) };
      const mockSchema2 = {
        safeParse: () => ({
          success: false,
          error: {
            issues: [
              {
                path: [],
                message: 'Multiple failure empty path',
                code: 'custom'
              },
              {
                path: ['nested', 'field'],
                message: 'Multiple failure nested path',
                code: 'custom'
              }
            ]
          }
        })
      };
      
      const middleware = validateMultiple([
        { schema: mockSchema1, source: 'body' },
        { schema: mockSchema2, source: 'query' }
      ]);
      
      const req = { body: { a: 1 }, query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalled();
      
      const errors = res.json.mock.calls[0][0].errors;
      expect(errors[0].field).toBe('query'); // fallback to source
      expect(errors[1].field).toBe('nested.field'); // join nested paths
    });
  });
});
