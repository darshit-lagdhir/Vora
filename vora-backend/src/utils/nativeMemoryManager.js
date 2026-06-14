import logger from '../services/loggerService.js';

// Map containing active registrations: pointer -> { size, cleanupFn, description }
const activePointers = new Map();

// Counter to simulate unique pointer addresses
let nextPointerAddress = 0x55aa0000;

// Custom Error classes for memory violations
export class MemorySafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MemorySafetyError';
  }
}

export class DoubleFreeError extends MemorySafetyError {
  constructor(pointer) {
    super(`Double-free detected: Attempted to deallocate pointer ${pointer} which has already been freed or was never registered.`);
    this.name = 'DoubleFreeError';
    this.pointer = pointer;
  }
}

export class UseAfterFreeError extends MemorySafetyError {
  constructor(pointer) {
    super(`Use-after-free detected: Attempted to read or access memory at pointer ${pointer} after it was deallocated.`);
    this.name = 'UseAfterFreeError';
    this.pointer = pointer;
  }
}

// FinalizationRegistry to monitor and report leaks in JS code
const finalizationRegistry = new FinalizationRegistry((heldValue) => {
  const { pointer, description, cleanupFn } = heldValue;
  if (activePointers.has(pointer)) {
    logger.warn(
      { module: 'nativeMemoryManager.js', pointer, description },
      `MEMORY LEAK DETECTED: Pointer ${pointer} was garbage collected before being explicitly deallocated! Reclaiming allocation.`
    );
    try {
      cleanupFn();
    } catch (err) {
      logger.error(
        { module: 'nativeMemoryManager.js', pointer, err: err.message },
        `Failed to reclaim leaked memory pointer during finalization`
      );
    }
    activePointers.delete(pointer);
  }
});

/**
 * Registers an allocated pointer with its size, cleanup function, and optional wrapper object
 * for FinalizationRegistry tracking.
 * 
 * @param {string|number} pointer The pointer address/handle.
 * @param {number} size The size of the allocation.
 * @param {Function} cleanupFn Function to release the unmanaged memory.
 * @param {Object} [wrapperObject] JavaScript holder object for finalization tracking.
 * @param {string} [description] Log description for debugging.
 */
export function registerPointer(pointer, size, cleanupFn, wrapperObject = null, description = 'unmanaged_allocation') {
  if (activePointers.has(pointer)) {
    throw new MemorySafetyError(`Pointer collision: ${pointer} is already registered.`);
  }

  activePointers.set(pointer, {
    size,
    cleanupFn,
    description,
    registeredAt: Date.now()
  });

  if (wrapperObject) {
    finalizationRegistry.register(wrapperObject, { pointer, description, cleanupFn }, wrapperObject);
  }

  logger.info(
    { module: 'nativeMemoryManager.js', pointer, size, description },
    `Allocated off-heap memory block and registered pointer`
  );
}

/**
 * Explicitly deallocates a registered pointer.
 * 
 * @param {string|number} pointer The pointer address/handle to free.
 * @param {Object} [wrapperObject] The JS wrapper object registered with FinalizationRegistry.
 */
export function freePointer(pointer, wrapperObject = null) {
  if (!activePointers.has(pointer)) {
    throw new DoubleFreeError(pointer);
  }

  const { cleanupFn, description } = activePointers.get(pointer);
  
  // Execute the clean-up routine back on the native engine
  try {
    cleanupFn();
  } catch (err) {
    logger.error(
      { module: 'nativeMemoryManager.js', pointer, err: err.message },
      `Error executing native cleanup function for pointer ${pointer}`
    );
    throw err;
  }

  activePointers.delete(pointer);
  
  if (wrapperObject) {
    try {
      finalizationRegistry.unregister(wrapperObject);
    } catch (err) {
      // Ignore unregistration errors if finalizer was already run or not matched
    }
  }

  logger.info(
    { module: 'nativeMemoryManager.js', pointer, description },
    `Successfully deallocated off-heap memory pointer`
  );
}

/**
 * Helper to generate a new unique pointer address.
 * 
 * @returns {string} Hex address representation
 */
export function generatePointerAddress() {
  const addr = nextPointerAddress;
  nextPointerAddress += 0x40; // increment offset
  return `0x${addr.toString(16)}`;
}

/**
 * Checks if a pointer is active and valid.
 * Throws UseAfterFreeError if the pointer is accessed but invalid.
 * 
 * @param {string|number} pointer The pointer to validate.
 */
export function assertPointerValid(pointer) {
  if (!activePointers.has(pointer)) {
    throw new UseAfterFreeError(pointer);
  }
}

/**
 * Scoped execution helper using try-finally. Automatically registers allocations and ensures
 * they are freed at the end of the callback function execution block.
 * 
 * @param {Function} taskFn Callback containing logic to execute. Receives a tracking context helper.
 * @returns {Promise<any>|any} The result of the taskFn callback.
 */
export async function runScoped(taskFn) {
  const trackedPointers = [];
  const context = {
    allocate: (size, cleanupFn, description) => {
      const ptr = generatePointerAddress();
      const wrapper = {};
      registerPointer(ptr, size, cleanupFn, wrapper, description);
      trackedPointers.push({ ptr, wrapper });
      return { ptr, wrapper };
    }
  };

  try {
    return await taskFn(context);
  } finally {
    // Synchronously sweep and deallocate all tracked pointers to contain leaks
    for (const { ptr, wrapper } of trackedPointers) {
      if (activePointers.has(ptr)) {
        try {
          freePointer(ptr, wrapper);
        } catch (err) {
          logger.error(
            { module: 'nativeMemoryManager.js', pointer: ptr, err: err.message },
            `Failed automatic cleanup of pointer ${ptr} in scoped finalizer`
          );
        }
      }
    }
  }
}

/**
 * Returns diagnostic statistics of active pointer registry.
 */
export function getActiveRegistryStats() {
  return {
    activeCount: activePointers.size,
    details: Array.from(activePointers.entries()).map(([ptr, info]) => ({
      pointer: ptr,
      size: info.size,
      description: info.description,
      ageMs: Date.now() - info.registeredAt
    }))
  };
}
