import { Router } from 'express';
import {
  getAuthConfig,
  googleLogin,
  getCurrentUser,
  demoLogin,
} from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Public auth configuration for frontend button initialization
router.get('/config', getAuthConfig);

// Google Sign-In verification endpoint
router.post('/google', googleLogin);

// Current user profile (Protected)
router.get('/me', requireAuth, getCurrentUser);

// Developer demo login
router.post('/demo', demoLogin);

export default router;
