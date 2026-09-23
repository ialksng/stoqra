import express from 'express';
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.js';
import {
  getPlatformOverview,
  getAllUsers,
  getAllStores,
  getStoreCatalog,
} from '../controllers/superAdminController.js';

const router = express.Router();

// Enforce both authentication AND strict Super Admin (ialksng@gmail.com) authorization
router.use(requireAuth);
router.use(requireSuperAdmin);

// Platform Overview KPIs
router.get('/overview', getPlatformOverview);

// All Registered Users Directory & Store breakdown
router.get('/users', getAllUsers);

// All Stores & Organizations with Owner and Inventory Valuations
router.get('/stores', getAllStores);

// Inspect a specific Store's Catalog & Sales
router.get('/stores/:orgId/catalog', getStoreCatalog);

export default router;
