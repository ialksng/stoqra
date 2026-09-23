import { Router } from 'express';
import {
  setupOrganization,
  listMyOrganizations,
  createOrganization,
  switchOrganization,
  deleteOrganization,
  getMyOrganization,
  getStoreTypes,
} from '../controllers/orgController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Public: Get available store types for onboarding dropdown
router.get('/types', getStoreTypes);

// Protected: Setup / update primary organization
router.post('/setup', requireAuth, setupOrganization);

// Protected: Get current active organization info
router.get('/me', requireAuth, getMyOrganization);

// Protected: List all stores owned by current user
router.get('/list', requireAuth, listMyOrganizations);

// Protected: Create a new additional store
router.post('/create', requireAuth, createOrganization);

// Protected: Switch active store
router.post('/switch/:id', requireAuth, switchOrganization);

// Protected: Delete a store and cascade delete its data
router.delete('/:id', requireAuth, deleteOrganization);

export default router;
