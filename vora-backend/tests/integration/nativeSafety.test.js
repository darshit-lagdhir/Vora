import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../../src/app.js';
import env from '../../src/config/env.js';
import { mockDb } from '../../src/config/db.js';
import { nativeWorkerService } from '../../src/services/nativeWorkerService.js';
import * as memoryManager from '../../src/utils/nativeMemoryManager.js';
import { FFI_LIMITS } from '../../src/middleware/ffiValidationMiddleware.js';

describe('Memory Safety Cross-Language Reconciliation & FFI Validation Suite', () => {
  let organizerToken;
  let organizerId;

  beforeEach(() => {
    // Generate new UUID and populate mock profile for auth
    organizerId = crypto.randomUUID();
    mockDb.profiles.push({
      id: organizerId,
      email_address: 'admin_security@vora.com',
      first_name: 'Security',
      last_name: 'Officer',
      platform_role: 'organizer',
      avatar_url: null,
      notify_event_start: true,
      notify_weekly_digest: true,
      notify_marketing: false,
      refresh_tokens: [],
    });

    // Sign JWT access token
    organizerToken = jwt.sign(
      { sub: organizerId, role: 'organizer' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterAll(() => {
    // Terminate worker child processes to prevent hanging tests
    nativeWorkerService.stop();
  });

  describe('Unmanaged Memory Tracker & Finalization registry', () => {
    it('should track pointer registration and throw on double-free or use-after-free', () => {
      const ptr = memoryManager.generatePointerAddress();
      let cleaned = false;
      const cleanup = () => { cleaned = true; };

      // Register pointer
      memoryManager.registerPointer(ptr, 64, cleanup, null, 'test_ptr');
      memoryManager.assertPointerValid(ptr);

      // Free pointer
      memoryManager.freePointer(ptr);
      expect(cleaned).toBe(true);

      // Verify Use-After-Free check throws exception
      expect(() => {
        memoryManager.assertPointerValid(ptr);
      }).toThrow(memoryManager.UseAfterFreeError);

      // Verify Double-Free check throws exception
      expect(() => {
        memoryManager.freePointer(ptr);
      }).toThrow(memoryManager.DoubleFreeError);
    });

    it('should clean up tracked allocations automatically inside runScoped blocks', async () => {
      let cleaned = false;
      let ptrCaptured;

      await memoryManager.runScoped(async (ctx) => {
        const { ptr } = ctx.allocate(32, () => { cleaned = true; }, 'scoped_test_ptr');
        ptrCaptured = ptr;
        memoryManager.assertPointerValid(ptr);
        // Do not call freePointer explicitly; expect auto-cleanup
      });

      expect(cleaned).toBe(true);
      expect(() => {
        memoryManager.assertPointerValid(ptrCaptured);
      }).toThrow(memoryManager.UseAfterFreeError);
    });
  });

  describe('FFI Input Shield Middleware (Boundary Validation)', () => {
    it('should block signatures exceeding byte size limit and return 400', async () => {
      // Create signature payload exceeding 64 bytes
      const giantSignature = 'a'.repeat(FFI_LIMITS.signature + 1);

      const res = await request(app)
        .post('/api/v1/security/verify-signature')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          signature: giantSignature,
          publicKey: 'valid-key',
          msg: 'valid-message'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Memory safety violation');
      expect(res.body.message).toContain("Parameter 'signature'");
    });

    it('should block public keys exceeding byte size limit and return 400', async () => {
      // Create public key exceeding 512 bytes
      const giantPublicKey = 'k'.repeat(FFI_LIMITS.publicKey + 1);

      const res = await request(app)
        .post('/api/v1/security/verify-signature')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          signature: 'valid-signature',
          publicKey: giantPublicKey,
          msg: 'valid-message'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Memory safety violation');
      expect(res.body.message).toContain("Parameter 'publicKey'");
    });

    it('should block messages exceeding byte size limit and return 400', async () => {
      // Create message exceeding 2048 bytes
      const giantMessage = 'm'.repeat(FFI_LIMITS.message + 1);

      const res = await request(app)
        .post('/api/v1/security/verify-signature')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          signature: 'valid-signature',
          publicKey: 'valid-key',
          msg: giantMessage
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Memory safety violation');
      expect(res.body.message).toContain("Parameter 'msg'");
    });

    it('should block invalid key sizes for key generation and return 400', async () => {
      // keySize below 512 bits
      const resLow = await request(app)
        .post('/api/v1/security/generate-key')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          algorithm: 'RSA',
          keySize: 256
        });

      expect(resLow.statusCode).toBe(400);
      expect(resLow.body.message).toContain('cryptographic boundaries');

      // keySize above 8192 bits
      const resHigh = await request(app)
        .post('/api/v1/security/generate-key')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          algorithm: 'RSA',
          keySize: 16384
        });

      expect(resHigh.statusCode).toBe(400);
      expect(resHigh.body.message).toContain('cryptographic boundaries');
    });

    it('should block algorithms exceeding character limits and return 400', async () => {
      const longAlgo = 'a'.repeat(FFI_LIMITS.algorithm + 1);

      const res = await request(app)
        .post('/api/v1/security/generate-key')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          algorithm: longAlgo,
          keySize: 2048
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Memory safety violation');
    });
  });

  describe('Asynchronous Sandboxed Computation & Fault Isolation', () => {
    it('should perform signature verification and key pair generation in worker service', async () => {
      // 1. Check Key Generation Endpoint
      const keyGenRes = await request(app)
        .post('/api/v1/security/generate-key')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          algorithm: 'RSA',
          keySize: 2048
        });

      expect(keyGenRes.statusCode).toBe(200);
      expect(keyGenRes.body.success).toBe(true);
      expect(keyGenRes.body.data.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyGenRes.body.data.privateKey).toContain('-----BEGIN PRIVATE KEY-----');

      // 2. Check Signature Verification Endpoint
      const verifyRes = await request(app)
        .post('/api/v1/security/verify-signature')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          signature: 'VALID_MOCK_SIGNATURE',
          publicKey: 'mock-key',
          msg: 'hello world'
        });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.isValid).toBe(true);
    });

    it('should contain native crashes, prevent main server death, and recover via self-healing', async () => {
      // Trigger a simulated native segmentation fault
      const crashRes = await request(app)
        .post('/api/v1/security/verify-signature')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          signature: 'CRASH_SEGFAULT',
          publicKey: 'mock-key',
          msg: 'hello world'
        });

      // Assert that the request failed gracefully since the worker crashed
      expect(crashRes.statusCode).toBe(500);
      expect(crashRes.body.message).toContain('Sandboxed native worker terminated abnormally');

      // Assert that the primary Express application survives and subsequent calls succeed immediately (self-healing!)
      const recoveryRes = await request(app)
        .post('/api/v1/security/verify-signature')
        .set('Cookie', [`accessToken=${organizerToken}`])
        .send({
          signature: 'VALID_MOCK_SIGNATURE',
          publicKey: 'mock-key',
          msg: 'hello world'
        });

      expect(recoveryRes.statusCode).toBe(200);
      expect(recoveryRes.body.success).toBe(true);
      expect(recoveryRes.body.data.isValid).toBe(true);
    });
  });
});
