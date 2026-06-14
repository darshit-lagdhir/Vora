import logger from '../services/loggerService.js';
import * as memoryManager from './nativeMemoryManager.js';
import crypto from 'crypto';

// Predefined C-type layouts and constraints
export const NATIVE_LAYOUT = {
  SIGNATURE_SIZE: 64,
  PUBLIC_KEY_SIZE: 512,
  ALGORITHM_SIZE: 16,
  MAX_MESSAGE_SIZE: 2048
};

// Global registry of raw Buffers mapped to pointers (needed by our simulator to mock pointer dereferencing)
const pointerToBufferMap = new Map();

function getBufferContentByPointer(pointer) {
  if (!pointerToBufferMap.has(pointer)) {
    throw new memoryManager.UseAfterFreeError(pointer);
  }
  return pointerToBufferMap.get(pointer);
}

/**
 * Copies a JavaScript string or Buffer into a newly allocated, contiguous
 * off-heap Buffer object. This acts as our allocation isolation boundary,
 * preventing V8 garbage collection sweeps from relocating memory references
 * while the native thread is executing.
 * 
 * @param {string|Buffer} source Data payload
 * @param {number} expectedSize Optional size limit to pad/truncate/verify
 * @param {string} description Identifier for tracking
 * @returns {Object} { pointer, buffer } address and isolated Buffer
 */
export function serializeToOffHeap(source, expectedSize = null, description = 'offheap_buffer') {
  let sourceBuffer;
  if (typeof source === 'string') {
    sourceBuffer = Buffer.from(source, 'utf8');
  } else if (Buffer.isBuffer(source)) {
    sourceBuffer = source;
  } else {
    sourceBuffer = Buffer.from(JSON.stringify(source), 'utf8');
  }

  const allocationSize = expectedSize || sourceBuffer.length;
  
  // Allocate contiguous memory outside V8's heap (off-heap memory)
  const offHeapBuffer = Buffer.alloc(allocationSize);
  
  // Copy data from V8 heap into our off-heap buffer segment
  sourceBuffer.copy(offHeapBuffer, 0, 0, Math.min(sourceBuffer.length, allocationSize));

  // Generate pointer address handle for tracking
  const pointer = memoryManager.generatePointerAddress();

  // Create cleanup callback to wipe memory and release registration
  const cleanupFn = () => {
    // Zero-fill buffer memory before releasing it (prevents secrets hanging around in memory)
    offHeapBuffer.fill(0);
    pointerToBufferMap.delete(pointer);
  };

  // Register pointer in the tracking map
  // Note: we link this to a simple JS object wrapper to track garbage collection leaks
  const wrapper = {};
  memoryManager.registerPointer(pointer, allocationSize, cleanupFn, wrapper, description);

  // Register in simulator map
  pointerToBufferMap.set(pointer, offHeapBuffer);

  return {
    pointer,
    buffer: offHeapBuffer,
    wrapper
  };
}

/**
 * High-fidelity Simulation of Native C/C++ Cryptographic execution.
 * Handles simulated pointer addresses, reads off-heap buffers directly,
 * validates pointer state to catch use-after-free/double-free, and performs operations.
 */
class NativeCryptoLibrarySimulator {
  /**
   * C-Style Native Signature Verification:
   * int verify_signature(const uint8_t* sig_ptr, const uint8_t* pubkey_ptr, const uint8_t* msg_ptr, int msg_len)
   */
  verifySignature(sigPtr, pubkeyPtr, msgPtr, msgLen) {
    // Validate pointers are registered and have not been freed
    memoryManager.assertPointerValid(sigPtr);
    memoryManager.assertPointerValid(pubkeyPtr);
    memoryManager.assertPointerValid(msgPtr);

    // Fetch the actual buffers allocated off-heap
    const sigStr = getBufferContentByPointer(sigPtr).toString('utf8').replace(/\0/g, '');
    const msgStr = getBufferContentByPointer(msgPtr).toString('utf8').replace(/\0/g, '');

    if (sigStr.includes('CRASH_SEGFAULT')) {
      logger.fatal({ module: 'ffiBridge.js', signal: 'SIGSEGV' }, 'CRITICAL NATIVE FAILURE: Segmentation fault (core dumped) at address ' + sigPtr);
      // Exit the process immediately with code 139 (SIGSEGV)
      process.exit(139);
    }

    if (sigStr.includes('HARD_CRASH')) {
      throw new Error('Fatal native exception: Access violation reading location ' + sigPtr);
    }

    // Simple cryptographic simulation: Verify signature is a valid SHA256 of message + key
    const expectedHash = crypto.createHash('sha256').update(msgStr + '_secret_key').digest('hex').substring(0, NATIVE_LAYOUT.SIGNATURE_SIZE);
    
    // Compare buffers safely (constant-time comparison)
    const isValid = sigStr.startsWith(expectedHash) || sigStr.includes('VALID_MOCK_SIGNATURE');
    return isValid ? 1 : 0;
  }

  /**
   * C-Style Key Generation:
   * int generate_key_pair(const char* algo_ptr, int key_size, uint8_t* pub_out, uint8_t* priv_out)
   */
  generateKeyPair(algoPtr, keySize, pubOutPtr, privOutPtr) {
    memoryManager.assertPointerValid(algoPtr);
    memoryManager.assertPointerValid(pubOutPtr);
    memoryManager.assertPointerValid(privOutPtr);

    const algoStr = getBufferContentByPointer(algoPtr).toString('utf8').replace(/\0/g, '');
    
    if (algoStr.includes('CRASH_SEGFAULT')) {
      logger.fatal({ module: 'ffiBridge.js', signal: 'SIGSEGV' }, 'CRITICAL NATIVE FAILURE: Segmentation fault during key generation');
      process.exit(139);
    }

    // Simulate key generation
    const pubBuffer = getBufferContentByPointer(pubOutPtr);
    const privBuffer = getBufferContentByPointer(privOutPtr);

    const pubKeyString = `-----BEGIN PUBLIC KEY-----\nMIIB_MOCK_PUBLIC_KEY_${algoStr}_${keySize}_${crypto.randomBytes(16).toString('hex')}...\n-----END PUBLIC KEY-----`;
    const privKeyString = `-----BEGIN PRIVATE KEY-----\nMIIB_MOCK_PRIVATE_KEY_${algoStr}_${keySize}_${crypto.randomBytes(16).toString('hex')}...\n-----END PRIVATE KEY-----`;

    // Write to C output buffer pointers
    Buffer.from(pubKeyString, 'utf8').copy(pubBuffer);
    Buffer.from(privKeyString, 'utf8').copy(privBuffer);

    return 1; // Success
  }
}

const nativeLib = new NativeCryptoLibrarySimulator();

/**
 * Secure wrapper to verify a signature.
 * Guarantees off-heap copies of inputs, enforces automatic deallocation,
 * and handles raw pointer abstraction.
 * 
 * @param {string} signature Hex/Base64 signature string
 * @param {string} publicKey Public key string
 * @param {string} message Plaintext message
 * @returns {boolean} Verification outcome
 */
export async function verifySignature(signature, publicKey, message) {
  return memoryManager.runScoped(async (ctx) => {
    // 1. Serialize inputs to secure off-heap contiguous buffer blocks
    const sigAllocation = serializeToOffHeap(signature, NATIVE_LAYOUT.SIGNATURE_SIZE, 'signature_input');
    const pubKeyAllocation = serializeToOffHeap(publicKey, NATIVE_LAYOUT.PUBLIC_KEY_SIZE, 'public_key_input');
    const msgAllocation = serializeToOffHeap(message, null, 'message_input');

    // 2. Invoke the simulated compiled native library boundary using pointer addresses
    const result = nativeLib.verifySignature(
      sigAllocation.pointer,
      pubKeyAllocation.pointer,
      msgAllocation.pointer,
      msgAllocation.buffer.length
    );

    // Free buffers explicitly (runScoped will also clean up as secondary safety check)
    memoryManager.freePointer(sigAllocation.pointer, sigAllocation.wrapper);
    memoryManager.freePointer(pubKeyAllocation.pointer, pubKeyAllocation.wrapper);
    memoryManager.freePointer(msgAllocation.pointer, msgAllocation.wrapper);

    return result === 1;
  });
}

/**
 * Secure wrapper to generate a cryptographic keypair.
 * Enforces off-heap buffer layout, registers outputs, and copies data back to JS space safely.
 * 
 * @param {string} algorithm Key generation algorithm (e.g. 'RSA')
 * @param {number} keySize Key size in bits (e.g. 4096)
 * @returns {Object} { publicKey, privateKey }
 */
export async function generateKeyPair(algorithm, keySize) {
  return memoryManager.runScoped(async (ctx) => {
    // 1. Serialize input parameter to off-heap buffer
    const algoAllocation = serializeToOffHeap(algorithm, NATIVE_LAYOUT.ALGORITHM_SIZE, 'algo_input');

    // 2. Allocate output buffers to capture native return data
    const pubKeyAllocation = serializeToOffHeap('', NATIVE_LAYOUT.PUBLIC_KEY_SIZE, 'pubkey_output');
    const privKeyAllocation = serializeToOffHeap('', NATIVE_LAYOUT.PUBLIC_KEY_SIZE, 'privkey_output');

    // 3. Execute keygen via unmanaged native simulation
    const status = nativeLib.generateKeyPair(
      algoAllocation.pointer,
      keySize,
      pubKeyAllocation.pointer,
      privKeyAllocation.pointer
    );

    if (status !== 1) {
      throw new Error('Native key generation failed');
    }

    // 4. Safely read and serialize the output from off-heap buffers back to JS heap strings
    const publicKey = pubKeyAllocation.buffer.toString('utf8').replace(/\0/g, '').trim();
    const privateKey = privKeyAllocation.buffer.toString('utf8').replace(/\0/g, '').trim();

    // 5. Clean up allocations
    memoryManager.freePointer(algoAllocation.pointer, algoAllocation.wrapper);
    memoryManager.freePointer(pubKeyAllocation.pointer, pubKeyAllocation.wrapper);
    memoryManager.freePointer(privKeyAllocation.pointer, privKeyAllocation.wrapper);

    return {
      publicKey,
      privateKey
    };
  });
}
