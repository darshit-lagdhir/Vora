import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logSecurityEvent } from '../services/securityService.js';

// Helper to hash refresh tokens
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Standardized cookie configuration settings
const getCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: true, // Always secure as requested
  sameSite: 'Strict', // Strictly SameSite to prevent CSRF
  maxAge: maxAgeMs,
});

/**
 * 1. Log In (POST /api/v1/auth/login)
 * Authenticates user credentials against the database and signs a cryptographically secure JWT token.
 */
export const login = asyncHandler(async (req, res, next) => {
  // Zod schema has already validated and trimmed email/password via route middleware
  const { email, password } = req.body;

  // Fetch the auth credentials directly from the auth.users schema
  const userResult = await pool.query(
    'SELECT id, encrypted_password FROM auth.users WHERE email = $1',
    [email.trim().toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    const error = new Error('Invalid email or password credentials.');
    error.statusCode = 401;
    return next(error);
  }

  const user = userResult.rows[0];

  // Compare incoming password with hash
  const isMatch = await bcrypt.compare(password, user.encrypted_password);
  if (!isMatch) {
    const error = new Error('Invalid email or password credentials.');
    error.statusCode = 401;
    return next(error);
  }

  // Hydrate user profile details
  const profileResult = await pool.query(
    'SELECT id, email_address, first_name, last_name, platform_role, avatar_url, notify_event_start, notify_weekly_digest, notify_marketing, refresh_tokens FROM profiles WHERE id = $1',
    [user.id]
  );

  if (profileResult.rows.length === 0) {
    const error = new Error('Profile registry not found for user session.');
    error.statusCode = 401;
    return next(error);
  }

  const profile = profileResult.rows[0];

  // Generate short-lived 15m Access Token & long-lived 7d Refresh Token
  const accessToken = jwt.sign(
    { sub: profile.id, role: profile.platform_role },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { sub: profile.id },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Hash the refresh token and save it to the profiles table ledger
  const rTokenHash = hashToken(refreshToken);
  const updatedLedger = [...(profile.refresh_tokens || []), rTokenHash];
  
  await pool.query(
    'UPDATE profiles SET refresh_tokens = $1 WHERE id = $2',
    [updatedLedger, profile.id]
  );

  // Set cookies on response headers
  res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

  res.status(200).json({
    success: true,
    message: 'User session authenticated successfully.',
    data: {
      user: {
        id: profile.id,
        email: profile.email_address,
        first_name: profile.first_name,
        last_name: profile.last_name,
        platform_role: profile.platform_role,
        avatar_url: profile.avatar_url,
        notify_event_start: profile.notify_event_start,
        notify_weekly_digest: profile.notify_weekly_digest,
        notify_marketing: profile.notify_marketing
      }
    }
  });
});

/**
 * 2. Register (POST /api/v1/auth/register)
 * Creates new user profiles and signs session token.
 */
export const register = asyncHandler(async (req, res, next) => {
  // Zod schema has already validated all fields, trimmed strings, and enforced min lengths
  const { email, password, first_name, last_name, platform_role } = req.body;

  const cleanEmail = email.trim().toLowerCase();
  const cleanFirstName = first_name.trim();
  const cleanLastName = last_name.trim();
  const role = platform_role === 'organizer' ? 'organizer' : 'attendee';

  // Check email conflict
  const conflictCheck = await pool.query('SELECT id FROM auth.users WHERE email = $1', [cleanEmail]);
  if (conflictCheck.rows.length > 0) {
    const error = new Error('A user account is already registered under this email.');
    error.statusCode = 409;
    return next(error);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const userId = crypto.randomUUID();

  // Execute registration transaction block
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into auth.users schema
    await client.query(
      `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), 'authenticated', 'authenticated', NOW(), NOW())`,
      [userId, cleanEmail, passwordHash]
    );

    // 2. Insert into public.profiles schema
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanFirstName}`;
    const profileResult = await client.query(
      `INSERT INTO public.profiles (id, email_address, first_name, last_name, platform_role, avatar_url, refresh_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, '{}'::TEXT[])
       RETURNING *`,
      [userId, cleanEmail, cleanFirstName, cleanLastName, role, avatarUrl]
    );

    const profile = profileResult.rows[0];

    // Generate short-lived 15m Access Token & long-lived 7d Refresh Token
    const accessToken = jwt.sign(
      { sub: profile.id, role: profile.platform_role },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { sub: profile.id },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token hash
    const rTokenHash = hashToken(refreshToken);
    const updatedLedger = [rTokenHash];

    await client.query(
      'UPDATE profiles SET refresh_tokens = $1 WHERE id = $2',
      [updatedLedger, profile.id]
    );

    await client.query('COMMIT');

    // Set cookies on response headers
    res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(201).json({
      success: true,
      message: 'Account registration and profile creation completed.',
      data: {
        user: {
          id: profile.id,
          email: profile.email_address,
          first_name: profile.first_name,
          last_name: profile.last_name,
          platform_role: profile.platform_role,
          avatar_url: profile.avatar_url,
          notify_event_start: profile.notify_event_start,
          notify_weekly_digest: profile.notify_weekly_digest,
          notify_marketing: profile.notify_marketing
        }
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

/**
 * 3. Me (GET /api/v1/auth/me)
 * Retrieves active profile context.
 */
export const getMe = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    return next(error);
  }

  res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      first_name: req.user.firstName,
      last_name: req.user.lastName,
      platform_role: req.user.role,
      avatar_url: req.user.avatarUrl,
      notify_event_start: req.user.notifyEventStart,
      notify_weekly_digest: req.user.notifyWeeklyDigest,
      notify_marketing: req.user.notifyMarketing,
      // camelCase copies
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      avatarUrl: req.user.avatarUrl,
      notifyEventStart: req.user.notifyEventStart,
      notifyWeeklyDigest: req.user.notifyWeeklyDigest,
      notifyMarketing: req.user.notifyMarketing
    }
  });
});

/**
 * 4. Logout (POST /api/v1/auth/logout)
 * Destroys token session context (handled client-side by eviction).
 */
export const logout = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const userId = decoded.sub;
      const rTokenHash = hashToken(token);

      // Stateful revocation: delete token hash from profiles table refresh_tokens array
      await pool.query(
        'UPDATE profiles SET refresh_tokens = array_remove(refresh_tokens, $1) WHERE id = $2',
        [rTokenHash, userId]
      );
    } catch (err) {
      // Fail silently if token validation fails during logout
    }
  }

  // Clear cookie files physically from browser disk
  res.clearCookie('accessToken', getCookieOptions(0));
  res.clearCookie('refreshToken', getCookieOptions(0));

  res.status(200).json({
    success: true,
    message: 'User session logged out successfully.'
  });
});

/**
 * 11. Refresh Token (POST /api/v1/auth/refresh)
 * Seamless rolling token rotation and reuse detection.
 */
export const refresh = asyncHandler(async (req, res, next) => {
  const incomingToken = req.cookies?.refreshToken;

  if (!incomingToken) {
    const error = new Error('Refresh token is required.');
    error.statusCode = 401;
    return next(error);
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingToken, env.JWT_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token.');
    error.statusCode = 401;
    return next(error);
  }

  const userId = decoded.sub;
  const incomingHash = hashToken(incomingToken);

  // Fetch the user's active token ledger
  const result = await pool.query(
    'SELECT id, platform_role, refresh_tokens FROM profiles WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Session user registry not found.');
    error.statusCode = 401;
    return next(error);
  }

  const profile = result.rows[0];
  const ledger = profile.refresh_tokens || [];

  // Check if token exists inside the active ledger
  const tokenIndex = ledger.indexOf(incomingHash);

  if (tokenIndex === -1) {
    // REUSE / REPLAY BREACH DETECTED!
    // Instantly wipe all refresh tokens, clear cookies, log telemetry
    await pool.query(
      'UPDATE profiles SET refresh_tokens = $1 WHERE id = $2',
      ['{}', userId]
    );

    res.clearCookie('accessToken', getCookieOptions(0));
    res.clearCookie('refreshToken', getCookieOptions(0));

    logSecurityEvent(
      'REFRESH_TOKEN_REUSE_DETECTED',
      `Potential session hijacking attempt: Rotated or invalid refresh token was reused. Active sessions revoked.`,
      { userId, attemptedTokenHash: incomingHash },
      req
    );

    const error = new Error('Session compromise detected. All active sessions revoked.');
    error.statusCode = 401;
    return next(error);
  }

  // Token is valid. Rotate:
  const rotatedLedger = ledger.filter(h => h !== incomingHash);

  // Generate new tokens
  const newAccessToken = jwt.sign(
    { sub: userId, role: profile.platform_role },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const newRefreshToken = jwt.sign(
    { sub: userId },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Append new token hash
  const newHash = hashToken(newRefreshToken);
  rotatedLedger.push(newHash);

  await pool.query(
    'UPDATE profiles SET refresh_tokens = $1 WHERE id = $2',
    [rotatedLedger, userId]
  );

  // Set cookies
  res.cookie('accessToken', newAccessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', newRefreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

  res.status(200).json({
    success: true,
    message: 'Tokens rotated successfully.'
  });
});

/**
 * 5. Fetch All Profiles (GET /api/v1/auth/profiles)
 * Retrieves user profiles for populating dropdown selectors (e.g. speakers).
 */
export const getProfiles = asyncHandler(async (req, res, next) => {
  const result = await pool.query(
    'SELECT id, first_name, last_name, email_address, platform_role FROM profiles ORDER BY first_name ASC'
  );
  res.status(200).json({
    success: true,
    data: result.rows
  });
});

/**
 * 6. Update Profile (PUT /api/v1/auth/profile)
 * Mutates user name and avatar URL.
 */
export const updateProfile = asyncHandler(async (req, res, next) => {
  // Zod schema has already validated and trimmed first_name, last_name, avatar_url
  const { first_name, last_name, avatar_url } = req.body;

  const result = await pool.query(
    `UPDATE profiles 
     SET first_name = $1, last_name = $2, avatar_url = $3, updated_at = NOW() 
     WHERE id = $4 
     RETURNING *`,
    [first_name.trim(), last_name.trim(), avatar_url?.trim() || null, req.user.id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Profile not found.');
    error.statusCode = 404;
    return next(error);
  }

  const profile = result.rows[0];
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: {
      id: profile.id,
      email: profile.email_address,
      first_name: profile.first_name,
      last_name: profile.last_name,
      platform_role: profile.platform_role,
      avatar_url: profile.avatar_url,
      notify_event_start: profile.notify_event_start,
      notify_weekly_digest: profile.notify_weekly_digest,
      notify_marketing: profile.notify_marketing
    }
  });
});

/**
 * 7. Update Password (PUT /api/v1/auth/password)
 * Changes security password for user session.
 */
export const updatePassword = asyncHandler(async (req, res, next) => {
  // Zod schema has already validated presence and min-length of both passwords
  const { current_password, new_password } = req.body;

  const userResult = await pool.query(
    'SELECT encrypted_password FROM auth.users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    return next(error);
  }

  const match = await bcrypt.compare(current_password, userResult.rows[0].encrypted_password);
  if (!match) {
    const error = new Error('The current password provided does not match our records. Please verify your credentials and try again.');
    error.statusCode = 401;
    return next(error);
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(new_password, salt);

  await pool.query(
    'UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2',
    [hash, req.user.id]
  );

  res.status(200).json({
    success: true,
    message: 'Password updated successfully.'
  });
});

/**
 * 8. Update Platform Role (PUT /api/v1/auth/role)
 * Swaps platform role context (Attendee vs Organizer).
 */
export const updateRole = asyncHandler(async (req, res, next) => {
  // Zod schema has already validated role is either 'attendee' or 'organizer'
  const { role } = req.body;

  const result = await pool.query(
    'UPDATE profiles SET platform_role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [role, req.user.id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Profile not found.');
    error.statusCode = 404;
    return next(error);
  }

  const profile = result.rows[0];

  const token = jwt.sign(
    { sub: profile.id, role: profile.platform_role },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.cookie('accessToken', token, getCookieOptions(15 * 60 * 1000));

  res.status(200).json({
    success: true,
    message: 'Ecosystem role swapped successfully.',
    data: {
      user: {
        id: profile.id,
        email: profile.email_address,
        first_name: profile.first_name,
        last_name: profile.last_name,
        platform_role: profile.platform_role,
        avatar_url: profile.avatar_url,
        notify_event_start: profile.notify_event_start,
        notify_weekly_digest: profile.notify_weekly_digest,
        notify_marketing: profile.notify_marketing
      }
    }
  });
});

/**
 * 9. Update Notifications Preferences (PUT /api/v1/auth/notifications)
 * Synchronizes notification configuration.
 */
export const updateNotifications = asyncHandler(async (req, res, next) => {
  const { notify_event_start, notify_weekly_digest, notify_marketing } = req.body;

  const result = await pool.query(
    `UPDATE profiles 
     SET notify_event_start = $1, notify_weekly_digest = $2, notify_marketing = $3, updated_at = NOW() 
     WHERE id = $4 
     RETURNING *`,
    [
      notify_event_start === true,
      notify_weekly_digest === true,
      notify_marketing === true,
      req.user.id
    ]
  );

  if (result.rows.length === 0) {
    const error = new Error('Profile not found.');
    error.statusCode = 404;
    return next(error);
  }

  const profile = result.rows[0];
  res.status(200).json({
    success: true,
    message: 'Notification preferences synchronized.',
    data: {
      id: profile.id,
      email: profile.email_address,
      first_name: profile.first_name,
      last_name: profile.last_name,
      platform_role: profile.platform_role,
      avatar_url: profile.avatar_url,
      notify_event_start: profile.notify_event_start,
      notify_weekly_digest: profile.notify_weekly_digest,
      notify_marketing: profile.notify_marketing
    }
  });
});

/**
 * 10. Delete Account (DELETE /api/v1/auth/me)
 * Deletes user profile and credentials cascade.
 */
export const deleteAccount = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM events WHERE organizer_id = $1', [userId]);
    await client.query('DELETE FROM registrations WHERE attendee_id = $1', [userId]);
    await client.query('DELETE FROM profiles WHERE id = $1', [userId]);
    await client.query('DELETE FROM auth.users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Account and associated data successfully purged from the ecosystem.'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});
