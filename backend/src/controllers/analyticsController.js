import { getStockHealth, getSalesVelocity } from '../services/analyticsService.js';

/**
 * Get inventory stock health summary, valuation, and reorder alerts
 * GET /api/analytics/stock-health
 */
export const getStockHealthController = async (req, res, next) => {
  try {
    const data = await getStockHealth();
    return res.status(200).json({
      success: true,
      data,
    });
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
    const data = await getSalesVelocity(days);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getStockHealthController,
  getSalesVelocityController,
};
