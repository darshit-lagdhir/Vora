import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import logger from './loggerService.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.join(__dirname, 'nativeWorker.js');

class NativeWorkerService {
  constructor() {
    this.worker = null;
    this.pendingRequests = new Map();
    this.initWorker();
  }

  /**
   * Initializes or restarts the sandboxed child process worker.
   */
  initWorker() {
    if (this.worker) {
      try {
        this.worker.kill();
      } catch (err) {
        // ignore
      }
    }

    logger.info({ module: 'nativeWorkerService.js' }, 'Spawning sandboxed native worker process...');
    
    // Spawn the worker process with low privilege (silent logs/IPC only)
    this.worker = fork(workerPath, [], {
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc']
    });

    // Handle responses from the worker
    this.worker.on('message', (response) => {
      const { id, success, data, error } = response;
      const callback = this.pendingRequests.get(id);

      if (callback) {
        this.pendingRequests.delete(id);
        clearTimeout(callback.timeoutId);
        
        if (success) {
          callback.resolve(data);
        } else {
          const err = new Error(error.message);
          err.name = error.name;
          err.stack = error.stack;
          callback.reject(err);
        }
      }
    });

    // Detect unexpected worker process death (unmanaged crashes, segfaults, sigkills)
    this.worker.on('exit', (code, signal) => {
      logger.error(
        { module: 'nativeWorkerService.js', exitCode: code, signal },
        `CRITICAL COMPARTMENTALIZATION SHIELD: Sandboxed native child process crashed or exited abnormally. Code: ${code}, Signal: ${signal}. Containing fault.`
      );

      // Clean up and reject all outstanding requests in the pipeline
      const activeRequests = Array.from(this.pendingRequests.entries());
      this.pendingRequests.clear();

      for (const [id, callback] of activeRequests) {
        clearTimeout(callback.timeoutId);
        callback.reject(new Error('Sandboxed native worker terminated abnormally due to internal crash (e.g. segmentation fault)'));
      }

      // Automatically self-heal: spin up a fresh worker instance
      this.initWorker();
    });

    this.worker.on('error', (err) => {
      logger.error(
        { module: 'nativeWorkerService.js', err: err.message },
        'Error occurred in sandboxed native child process worker'
      );
    });
  }

  /**
   * Dispatches a command to the worker and returns a Promise.
   * 
   * @param {string} action Action to execute ('verifySignature' or 'generateKeyPair')
   * @param {Object} payload Arguments to send
   * @returns {Promise<any>} Response data
   */
  execute(action, payload) {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.worker.connected) {
        return reject(new Error('Native worker service is not connected.'));
      }

      const id = crypto.randomUUID();

      // Configure an execution timeout to handle infinite loops or deadlocks
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        logger.error(
          { module: 'nativeWorkerService.js', action, id },
          `Native execution timed out after 5000ms. Terminating worker to prevent lockups.`
        );
        // Force terminate the hanging worker. The exit listener will trigger self-healing.
        if (this.worker) {
          this.worker.kill('SIGKILL');
        }
        reject(new Error('Native operation timed out.'));
      }, 5000);

      // Save execution handlers
      this.pendingRequests.set(id, { resolve, reject, timeoutId });

      // Send instruction across the IPC pipe
      this.worker.send({ id, action, payload });
    });
  }

  /**
   * Abstracted signature verification.
   */
  async verifySignature(signature, publicKey, msg) {
    return this.execute('verifySignature', { signature, publicKey, msg });
  }

  /**
   * Abstracted keypair generation.
   */
  async generateKeyPair(algorithm, keySize) {
    return this.execute('generateKeyPair', { algorithm, keySize });
  }

  /**
   * Gracefully shuts down the worker.
   */
  stop() {
    if (this.worker) {
      // Unmount exit listener to prevent auto-restart on teardown
      this.worker.removeAllListeners('exit');
      this.worker.kill();
      this.worker = null;
    }
  }
}

// Export singleton instance
const workerService = new NativeWorkerService();
export default workerService;
export { workerService as nativeWorkerService };
