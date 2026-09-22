import Item from '../models/Item.js';
import InventoryTransaction from '../models/InventoryTransaction.js';

/**
 * Compute inventory stock health, valuation, and reorder metrics
 * @returns {Promise<Object>}
 */
export const getStockHealth = async () => {
  const [result] = await Item.aggregate([
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalSkus: { $sum: 1 },
              totalStockUnits: { $sum: '$currentStock' },
              totalValuation: {
                $sum: { $multiply: ['$currentStock', '$unitCost'] },
              },
              outOfStockCount: {
                $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] },
              },
              lowStockCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ['$currentStock', 0] },
                        { $lte: ['$currentStock', '$reorderLevel'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              healthyStockCount: {
                $sum: {
                  $cond: [{ $gt: ['$currentStock', '$reorderLevel'] }, 1, 0],
                },
              },
            },
          },
        ],
        reorderFlags: [
          {
            $match: {
              $expr: { $lte: ['$currentStock', '$reorderLevel'] },
            },
          },
          {
            $project: {
              _id: 1,
              sku: 1,
              name: 1,
              currentStock: 1,
              reorderLevel: 1,
              unitCost: 1,
              sellingPrice: 1,
              deficitUnits: { $subtract: ['$reorderLevel', '$currentStock'] },
              status: {
                $cond: [{ $eq: ['$currentStock', 0] }, 'OUT_OF_STOCK', 'LOW_STOCK'],
              },
            },
          },
          { $sort: { currentStock: 1, deficitUnits: -1 } },
        ],
      },
    },
  ]);

  const summary = (result.summary && result.summary[0]) || {
    totalSkus: 0,
    totalStockUnits: 0,
    totalValuation: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    healthyStockCount: 0,
  };

  return {
    timestamp: new Date().toISOString(),
    metrics: {
      totalSkus: summary.totalSkus,
      totalStockUnits: summary.totalStockUnits,
      totalValuation: Math.round(summary.totalValuation * 100) / 100,
      outOfStockCount: summary.outOfStockCount,
      lowStockCount: summary.lowStockCount,
      healthyStockCount: summary.healthyStockCount,
    },
    criticalItems: result.reorderFlags || [],
  };
};

/**
 * Calculate 30-day burn rate, revenue, and inventory run-out projections
 * @param {number} [windowDays=30] - Lookback window in days
 * @returns {Promise<Object>}
 */
export const getSalesVelocity = async (windowDays = 30) => {
  const days = Math.max(1, Number(windowDays) || 30);
  const lookbackDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rawVelocity = await InventoryTransaction.aggregate([
    {
      $match: {
        type: 'SALE',
        createdAt: { $gte: lookbackDate },
      },
    },
    {
      $group: {
        _id: '$itemId',
        totalUnitsSold: { $sum: { $abs: '$quantityDelta' } },
        totalRevenue: {
          $sum: { $multiply: [{ $abs: '$quantityDelta' }, { $ifNull: ['$unitPrice', 0] }] },
        },
        orderCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'items',
        localField: '_id',
        foreignField: '_id',
        as: 'itemDetails',
      },
    },
    { $unwind: '$itemDetails' },
    {
      $project: {
        _id: 1,
        sku: '$itemDetails.sku',
        name: '$itemDetails.name',
        currentStock: '$itemDetails.currentStock',
        reorderLevel: '$itemDetails.reorderLevel',
        unitCost: '$itemDetails.unitCost',
        sellingPrice: '$itemDetails.sellingPrice',
        totalUnitsSold: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        orderCount: 1,
        dailyBurnRate: {
          $round: [{ $divide: ['$totalUnitsSold', days] }, 2],
        },
      },
    },
    { $sort: { totalUnitsSold: -1 } },
  ]);

  let totalRevenue = 0;
  let totalUnitsSold = 0;

  const items = rawVelocity.map((v) => {
    totalRevenue += v.totalRevenue;
    totalUnitsSold += v.totalUnitsSold;

    const burnRate = v.dailyBurnRate || 0;
    let daysOfInventoryRemaining = null;
    let estimatedRunOutDate = null;

    if (burnRate > 0) {
      daysOfInventoryRemaining = Math.floor(v.currentStock / burnRate);
      const runOutTimestamp = Date.now() + daysOfInventoryRemaining * 24 * 60 * 60 * 1000;
      estimatedRunOutDate = new Date(runOutTimestamp).toISOString().split('T')[0];
    }

    return {
      sku: v.sku,
      name: v.name,
      currentStock: v.currentStock,
      reorderLevel: v.reorderLevel,
      totalUnitsSold: v.totalUnitsSold,
      totalRevenue: v.totalRevenue,
      dailyBurnRate: burnRate,
      daysOfInventoryRemaining: daysOfInventoryRemaining !== null ? daysOfInventoryRemaining : 'Infinity',
      estimatedRunOutDate: estimatedRunOutDate || 'No burn / Infinite',
      orderCount: v.orderCount,
    };
  });

  return {
    timeframe: `${days}-Day Lookback`,
    summary: {
      totalUnitsSold,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageDailyBurnRate: Math.round((totalUnitsSold / days) * 100) / 100,
      activeSkusWithSales: items.length,
    },
    items,
  };
};

export default { getStockHealth, getSalesVelocity };
