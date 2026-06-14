/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ASYNC HANDLER — Timeout Sentinel & Promise Chain Exhaustion Defense
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A higher-order function that wraps asynchronous Express controllers.
 * It resolves the handler as a Promise, applies a configurable timeout sentinel
 * to prevent indefinite hanging, and automatically catches any errors,
 * forwarding them to the centralized Express error middleware via next().
 *
 * Features:
 *   - Configurable timeout (default: 15 seconds)
 *   - Dead response guard (prevents double-send crashes)
 *   - Structured timeout error with 408 status code
 *   - Promise race between handler execution and timeout
 *
 * @param {Function} fn - The asynchronous route handler function.
 * @param {Object} [options] - Configuration options.
 * @param {number} [options.timeout=15000] - Timeout in milliseconds.
 * @returns {Function} - Express middleware function.
 */

const DEFAULT_TIMEOUT_MS = 15000; // 15-second default sentinel

const asyncHandler = (fn, options = {}) => {
  const timeoutMs = options.timeout || DEFAULT_TIMEOUT_MS;

  return (req, res, next) => {
    // Create the timeout sentinel promise
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const timeoutError = new Error(
          `Request processing exceeded the ${timeoutMs / 1000}-second timeout threshold. ` +
          `The operation was automatically terminated to prevent resource exhaustion.`
        );
        timeoutError.statusCode = 408;
        timeoutError.isOperational = true;
        reject(timeoutError);
      }, timeoutMs);
    });

    // Race the actual handler against the timeout sentinel
    Promise.race([
      Promise.resolve(fn(req, res, next)),
      timeoutPromise,
    ])
      .then(() => {
        clearTimeout(timeoutId);
      })
      .catch((err) => {
        clearTimeout(timeoutId);

        // Dead response guard: if headers are already sent, do not attempt
        // to send another response — just log and let Express clean up.
        if (res.headersSent) {
          console.error(
            `[AsyncHandler] Error occurred after response was already sent for ${req.method} ${req.url}:`,
            err.message
          );
          return;
        }

        next(err);
      });
  };
};

export default asyncHandler;
