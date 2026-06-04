/**
 * A higher-order function that wraps asynchronous Express controllers.
 * It resolves the handler as a Promise and automatically catches any errors,
 * forwarding them to the centralized Express error middleware via the next() function.
 *
 * @param {Function} fn - The asynchronous route handler function.
 * @returns {Function} - Express middleware function.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
