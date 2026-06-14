import { logSecurityEvent } from '../services/securityService.js';

/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * Higher-order middleware function to restrict route execution to specific platform roles.
 * Emits a high-priority telemetry log event on permission violation.
 * 
 * @param {Array<string>} allowedRoles - List of roles permitted to access the resource (e.g. ['organizer'])
 * @returns {Function} - Express middleware function
 */
export const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    // Guard clause: ensure authentication middleware was executed first
    if (!req.user) {
      const error = new Error('Authentication required before role verification.');
      error.statusCode = 401;
      return next(error);
    }

    // Strict check to evaluate permissions
    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error('Insufficient permissions: Action restricted.');
      error.statusCode = 403;

      // Telemetry log for forensic security tracking
      logSecurityEvent(
        'UNAUTHORIZED_ROLE_ACCESS',
        `Access violation: User attempted to hit restricted path '${req.method} ${req.originalUrl || req.url}'`,
        {
          userId: req.user.id,
          userRole: req.user.role,
          targetEndpoint: req.originalUrl || req.url,
          violationTimestamp: new Date().toISOString()
        },
        req
      );

      return next(error);
    }

    next();
  };
};
