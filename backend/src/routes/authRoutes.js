import { Router } from 'express';
import {
  getAuthConfig,
  googleLogin,
  getCurrentUser,
  demoLogin,
  listUsers,
  updateUserRole,
  deleteUser,
} from '../controllers/authController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// Public auth configuration for frontend button initialization
router.get('/config', getAuthConfig);

// Google Sign-In verification endpoint
router.post('/google', googleLogin);

// Current user profile (Protected)
router.get('/me', requireAuth, getCurrentUser);

// Developer demo login
router.post('/demo', demoLogin);

// Team & User Management (Protected: Admins only)
router.get('/users', requireAuth, requireAdmin, listUsers);
router.patch('/users/:id/role', requireAuth, requireAdmin, updateUserRole);
router.delete('/users/:id', requireAuth, requireAdmin, deleteUser);

export default router;
