import logger from '../services/loggerService.js';

// Immutable mathematically determined length limits
export const FFI_LIMITS = {
  signature: 64,      // 64 bytes for cryptographic signature
  publicKey: 512,     // 512 bytes for PEM/DER public key input
  algorithm: 16,      // 16 bytes for algorithm names (e.g. RSA-4096)
  message: 2048       // 2048 bytes max message payload to prevent large allocations
};

/**
 * Custom Error for FFI boundary size breaches.
 */
export class FfiBoundaryViolationError extends Error {
  constructor(paramName, length, limit) {
    super(`Memory safety violation: Parameter '${paramName}' of size ${length} bytes exceeds the maximum allocated boundary of ${limit} bytes.`);
    this.name = 'FfiBoundaryViolationError';
    this.status = 400; // Routes to 400 Unprocessable / Bad request
    this.statusCode = 400;
  }
}

/**
 * Middleware validating input parameters for signature verification.
 */
export function validateVerifySignaturePayload(req, res, next) {
  try {
    const { signature, publicKey, msg } = req.body || {};

    // 1. Validate 'signature' input
    if (signature !== undefined) {
      const sigLength = typeof signature === 'string' 
        ? Buffer.byteLength(signature, 'utf8') 
        : (Buffer.isBuffer(signature) ? signature.length : 0);
      
      if (sigLength > FFI_LIMITS.signature) {
        logger.error(
          { module: 'ffiValidationMiddleware.js', param: 'signature', length: sigLength, limit: FFI_LIMITS.signature },
          'FFI INPUT SHIELD: Signature exceeds memory boundary'
        );
        throw new FfiBoundaryViolationError('signature', sigLength, FFI_LIMITS.signature);
      }
    }

    // 2. Validate 'publicKey' input
    if (publicKey !== undefined) {
      const pubkeyLength = typeof publicKey === 'string'
        ? Buffer.byteLength(publicKey, 'utf8')
        : (Buffer.isBuffer(publicKey) ? publicKey.length : 0);

      if (pubkeyLength > FFI_LIMITS.publicKey) {
        logger.error(
          { module: 'ffiValidationMiddleware.js', param: 'publicKey', length: pubkeyLength, limit: FFI_LIMITS.publicKey },
          'FFI INPUT SHIELD: PublicKey exceeds memory boundary'
        );
        throw new FfiBoundaryViolationError('publicKey', pubkeyLength, FFI_LIMITS.publicKey);
      }
    }

    // 3. Validate 'msg' input
    if (msg !== undefined) {
      const msgLength = typeof msg === 'string'
        ? Buffer.byteLength(msg, 'utf8')
        : (Buffer.isBuffer(msg) ? msg.length : 0);

      if (msgLength > FFI_LIMITS.message) {
        logger.error(
          { module: 'ffiValidationMiddleware.js', param: 'msg', length: msgLength, limit: FFI_LIMITS.message },
          'FFI INPUT SHIELD: Message exceeds memory boundary'
        );
        throw new FfiBoundaryViolationError('msg', msgLength, FFI_LIMITS.message);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware validating input parameters for key pair generation.
 */
export function validateGenerateKeyPairPayload(req, res, next) {
  try {
    const { algorithm, keySize } = req.body || {};

    // 1. Validate 'algorithm' input
    if (algorithm !== undefined) {
      const algoLength = typeof algorithm === 'string'
        ? Buffer.byteLength(algorithm, 'utf8')
        : 0;

      if (algoLength > FFI_LIMITS.algorithm) {
        logger.error(
          { module: 'ffiValidationMiddleware.js', param: 'algorithm', length: algoLength, limit: FFI_LIMITS.algorithm },
          'FFI INPUT SHIELD: Algorithm name exceeds memory boundary'
        );
        throw new FfiBoundaryViolationError('algorithm', algoLength, FFI_LIMITS.algorithm);
      }
    }

    // 2. Validate 'keySize' numeric parameter limits (4-byte integer checks)
    if (keySize !== undefined) {
      if (typeof keySize !== 'number' || !Number.isInteger(keySize)) {
        const err = new Error('Invalid keySize type: must be an integer');
        err.status = 400;
        throw err;
      }

      // Check numeric bounds to ensure key size is realistic and fits safe buffers
      if (keySize < 512 || keySize > 8192) {
        logger.error(
          { module: 'ffiValidationMiddleware.js', param: 'keySize', value: keySize },
          'FFI INPUT SHIELD: keySize is outside allowable cryptographic boundaries'
        );
        const err = new Error('Key size is outside allowable cryptographic boundaries (512 - 8192 bits).');
        err.status = 400;
        throw err;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
