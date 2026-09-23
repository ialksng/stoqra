import {
  getStockHealth,
  getSalesVelocity,
  getComprehensiveDashboard,
} from '../services/analyticsService.js';
import { requireAuth } from '../middlewares/auth.js';

/**
 * Get inventory stock health summary, valuation, and reorder alerts
 * GET /api/analytics/stock-health
 */
export const getStockHealthController = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId;
    const data = await getStockHealth(organizationId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get 30-day sales velocity, burn rate, and inventory run-out projections
 * GET /api/analytics/sales-velocity
 */
export const getSalesVelocityController = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const organizationId = req.user?.organizationId;
    const data = await getSalesVelocity(days, organizationId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Get multi-dimensional business analytics dashboard
 * GET /api/analytics/dashboard?days=30
 */
export const getComprehensiveDashboardController = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const organizationId = req.user?.organizationId;
    const data = await getComprehensiveDashboard(days, organizationId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export default {
  getStockHealthController,
  getSalesVelocityController,
  getComprehensiveDashboardController,
};
