import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Authentication Middleware
 * Intercepts incoming requests, parses the Bearer JWT token from the Authorization header,
 * cryptographically verifies the token using JWT_SECRET, and hydrations user details
 * directly from the database profiles table.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Verify the presence and structure of the Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authorization credentials are required.');
    error.statusCode = 401;
    return next(error);
  }

  // Deconstruct Bearer prefix to isolate token payload
  const token = authHeader.split(' ')[1];

  try {
    // Verify cryptographic signature and expiration
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.sub; // Extract subject UUID claim

    // Hydrate user profile from PostgreSQL profiles table
    const result = await pool.query(
      'SELECT id, email_address, first_name, last_name, platform_role FROM profiles WHERE id = $1',
      [userId]
    );

    // Reject if token is valid but user metadata does not exist in our profiles registry
    if (result.rows.length === 0) {
      const error = new Error('Session identity not found in database registry.');
      error.statusCode = 401;
      return next(error);
    }

    const profile = result.rows[0];

    // Propagate hydrated context directly onto the Express request object
    req.user = {
      id: profile.id,
      email: profile.email_address,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.platform_role, // 'attendee' or 'organizer'
    };

    next();
  } catch (err) {
    // Formulate a generic, secure response payload on signature verification failure or token expiry
    const message = err.name === 'TokenExpiredError' 
      ? 'Your session token has expired. Please sign in again.' 
      : 'Invalid or tampered session token.';
    
    const error = new Error(message);
    error.statusCode = 401;
    return next(error);
  }
});

/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * Higher-order middleware function to restrict route execution to specific platform roles.
 * 
 * @param {Array<string>} allowedRoles - List of roles permitted to access the resource (e.g. ['organizer'])
 * @returns {Function} - Express middleware function
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // Guard clause: ensure authentication middleware was executed first
    if (!req.user) {
      const error = new Error('Authentication required before role verification.');
      error.statusCode = 401;
      return next(error);
    }

    // Strict type check to evaluate permissions
    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error('Insufficient permissions: Action restricted.');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 * Attempts to parse and verify the Bearer token if present, populating req.user.
 * If no token is provided, lets the request pass through with req.user set to null.
 */
export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.sub;

    const result = await pool.query(
      'SELECT id, email_address, first_name, last_name, platform_role FROM profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      req.user = null;
      return next();
    }

    const profile = result.rows[0];

    req.user = {
      id: profile.id,
      email: profile.email_address,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.platform_role,
    };

    next();
  } catch (err) {
    // If a token was provided but failed verification (e.g. expired), return 401
    const message = err.name === 'TokenExpiredError' 
      ? 'Your session token has expired. Please sign in again.' 
      : 'Invalid or tampered session token.';
    
    const error = new Error(message);
    error.statusCode = 401;
    return next(error);
  }
});
