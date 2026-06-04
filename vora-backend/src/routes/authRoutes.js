import express from 'express';
import { 
  login, 
  register, 
  getMe, 
  logout,
  getProfiles
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Log In: Validates credentials and returns JWT
router.post('/login', login);

// 2. Register: Creates organizer/attendee profile and returns JWT
router.post('/register', register);

// 3. Me: Retrieves authenticated user details
router.get('/me', authenticate, getMe);

// 4. Logout: Destroys browser token (evicted client-side)
router.post('/logout', logout);

// 5. Profiles: Fetch all profiles for select inputs
router.get('/profiles', authenticate, getProfiles);

export default router;
