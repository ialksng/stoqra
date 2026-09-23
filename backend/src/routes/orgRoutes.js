import { Router } from 'express';
import { setupOrganization, getMyOrganization, getStoreTypes } from '../controllers/orgController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// Public: Get available store types for onboarding dropdown
router.get('/types', getStoreTypes);

// Protected: Setup / update organization
router.post('/setup', requireAuth, setupOrganization);

// Protected: Get current user's org info
router.get('/me', requireAuth, getMyOrganization);

export default router;
