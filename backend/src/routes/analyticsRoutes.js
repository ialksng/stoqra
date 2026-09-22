import { Router } from 'express';
import {
  getStockHealthController,
  getSalesVelocityController,
} from '../controllers/analyticsController.js';

const router = Router();

// GET /api/analytics/stock-health - Valuation, out-of-stock count, and low-stock reorder alerts
router.get('/stock-health', getStockHealthController);

// GET /api/analytics/sales-velocity - 30-day burn rate, revenue, and daysOfInventoryRemaining run-out date
router.get('/sales-velocity', getSalesVelocityController);

export default router;
