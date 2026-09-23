import { Router } from 'express';
import {
  getStockHealthController,
  getSalesVelocityController,
  getComprehensiveDashboardController,
} from '../controllers/analyticsController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// GET /api/analytics/dashboard - Comprehensive multi-dimensional business analytics
router.get('/dashboard', requireAuth, getComprehensiveDashboardController);

// GET /api/analytics/stock-health - Valuation, out-of-stock count, and low-stock reorder alerts
router.get('/stock-health', requireAuth, getStockHealthController);

// GET /api/analytics/sales-velocity - 30-day burn rate, revenue, and daysOfInventoryRemaining run-out date
router.get('/sales-velocity', requireAuth, getSalesVelocityController);

export default router;
