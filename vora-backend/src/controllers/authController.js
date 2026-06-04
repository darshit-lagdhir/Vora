import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import env from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * 1. Log In (POST /api/v1/auth/login)
 * Authenticates user credentials against the database and signs a cryptographically secure JWT token.
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = new Error('Both email and password are required.');
    error.statusCode = 400;
    return next(error);
  }

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
    'SELECT id, email_address, first_name, last_name, platform_role, avatar_url FROM profiles WHERE id = $1',
    [user.id]
  );

  if (profileResult.rows.length === 0) {
    const error = new Error('Profile registry not found for user session.');
    error.statusCode = 401;
    return next(error);
  }

  const profile = profileResult.rows[0];

  // Generate JWT token (matching the subject claim validation in authMiddleware.js)
  const token = jwt.sign(
    { sub: profile.id, role: profile.platform_role },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(200).json({
    success: true,
    message: 'User session authenticated successfully.',
    data: {
      token,
      user: {
        id: profile.id,
        email: profile.email_address,
        first_name: profile.first_name,
        last_name: profile.last_name,
        platform_role: profile.platform_role,
        avatar_url: profile.avatar_url
      }
    }
  });
});

/**
 * 2. Register (POST /api/v1/auth/register)
 * Creates new user profiles and signs session token.
 */
export const register = asyncHandler(async (req, res, next) => {
  const { email, password, first_name, last_name, platform_role } = req.body;

  if (!email || !password || !first_name || !last_name) {
    const error = new Error('All registration fields are required.');
    error.statusCode = 400;
    return next(error);
  }

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
      `INSERT INTO public.profiles (id, email_address, first_name, last_name, platform_role, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, cleanEmail, cleanFirstName, cleanLastName, role, avatarUrl]
    );

    await client.query('COMMIT');

    const profile = profileResult.rows[0];

    // Sign JWT token
    const token = jwt.sign(
      { sub: profile.id, role: profile.platform_role },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Account registration and profile creation completed.',
      data: {
        token,
        user: {
          id: profile.id,
          email: profile.email_address,
          first_name: profile.first_name,
          last_name: profile.last_name,
          platform_role: profile.platform_role,
          avatar_url: profile.avatar_url
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
    data: req.user
  });
});

/**
 * 4. Logout (POST /api/v1/auth/logout)
 * Destroys token session context (handled client-side by eviction).
 */
export const logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'User session logged out successfully.'
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
