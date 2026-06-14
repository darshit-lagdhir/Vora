import express from 'express';
import {
  login,
  register,
  getMe,
  logout,
  getProfiles,
  updateProfile,
  updatePassword,
  updateRole,
  updateNotifications,
  deleteAccount,
  refresh
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validation.js';
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  updatePasswordSchema,
  updateRoleSchema,
  updateNotificationsSchema,
} from '../utils/schemas.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const criticalLimiter = rateLimiter({
  limit: 5,
  windowMs: 5 * 60 * 1000,
  profileName: 'critical_security'
});

// 1. Log In: Validates credentials and returns JWT
router.post('/login', criticalLimiter, validate(loginSchema), login);

// 2. Register: Creates organizer/attendee profile and returns JWT
router.post('/register', criticalLimiter, validate(registerSchema), register);

// 3. Me: Retrieves authenticated user details
router.get('/me', authenticate, getMe);

// 4. Logout: Destroys browser token (evicted client-side)
router.post('/logout', logout);

// 4b. Refresh: Seamless rolling token rotation
router.post('/refresh', refresh);

// 5. Profiles: Fetch all profiles for select inputs
router.get('/profiles', authenticate, getProfiles);

// 6. Settings and Preferences
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/password', authenticate, validate(updatePasswordSchema), updatePassword);
router.put('/role', authenticate, validate(updateRoleSchema), updateRole);
router.put('/notifications', authenticate, validate(updateNotificationsSchema), updateNotifications);
router.delete('/me', authenticate, deleteAccount);

export default router;
