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

import Invoice from '../models/Invoice.js';

/**
 * Compute multi-dimensional comprehensive business analytics dashboard
 * @param {number} [windowDays=30] - Lookback window in days (e.g. 7, 14, 30, 90, 365)
 * @returns {Promise<Object>}
 */
export const getComprehensiveDashboard = async (windowDays = 30) => {
  const days = Math.max(1, Number(windowDays) || 30);
  const isAllTime = days >= 365;
  const lookbackDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const timeMatch = isAllTime ? {} : { createdAt: { $gte: lookbackDate } };

  // 1. Stock Health & Catalog Metrics
  const stockHealthRes = await getStockHealth();
  const metrics = stockHealthRes.metrics;

  // 2. Fetch all Items for ABC analysis, Categories, and Margins
  const allItems = await Item.find({}).lean();

  // Compute ABC Pareto Analysis on active inventory valuation
  const sortedByValuation = allItems
    .map((item) => ({
      _id: item._id,
      sku: item.sku,
      name: item.name,
      category: item.category || 'General',
      supplier: item.supplier || 'Direct Supplier',
      currentStock: item.currentStock,
      unitCost: item.unitCost,
      sellingPrice: item.sellingPrice,
      valuation: Math.round(item.currentStock * item.unitCost * 100) / 100,
    }))
    .sort((a, b) => b.valuation - a.valuation);

  const totalCatalogValuation = sortedByValuation.reduce((acc, i) => acc + i.valuation, 0) || 1;
  let cumulativeVal = 0;

  const abcItems = sortedByValuation.map((item) => {
    cumulativeVal += item.valuation;
    const cumulativePercent = Math.min(100, Math.round((cumulativeVal / totalCatalogValuation) * 1000) / 10);
    let abcClass = 'C';
    if (cumulativePercent <= 80) {
      abcClass = 'A';
    } else if (cumulativePercent <= 95) {
      abcClass = 'B';
    }

    return {
      ...item,
      cumulativePercent,
      abcClass,
    };
  });

  const abcSummary = {
    classA: {
      count: abcItems.filter((i) => i.abcClass === 'A').length,
      valuation: Math.round(abcItems.filter((i) => i.abcClass === 'A').reduce((s, i) => s + i.valuation, 0) * 100) / 100,
    },
    classB: {
      count: abcItems.filter((i) => i.abcClass === 'B').length,
      valuation: Math.round(abcItems.filter((i) => i.abcClass === 'B').reduce((s, i) => s + i.valuation, 0) * 100) / 100,
    },
    classC: {
      count: abcItems.filter((i) => i.abcClass === 'C').length,
      valuation: Math.round(abcItems.filter((i) => i.abcClass === 'C').reduce((s, i) => s + i.valuation, 0) * 100) / 100,
    },
  };

  // 3. Sales Transactions within Period
  const salesTx = await InventoryTransaction.find({
    type: 'SALE',
    ...timeMatch,
  })
    .populate('itemId', 'name sku category supplier unitCost sellingPrice currentStock')
    .sort({ createdAt: -1 })
    .lean();

  let periodSalesRevenue = 0;
  let periodUnitsSold = 0;
  let periodCostOfGoodsSold = 0;

  // Track sales per SKU
  const salesBySku = {};
  // Track sales by Category
  const salesByCategory = {};
  // Track sales by Payment Mode
  const paymentModesMap = {
    UPI: { count: 0, total: 0 },
    CASH: { count: 0, total: 0 },
    CARD: { count: 0, total: 0 },
    BANK_TRANSFER: { count: 0, total: 0 },
    CREDIT: { count: 0, total: 0 },
    OTHER: { count: 0, total: 0 },
  };

  // Daily timeline tracking
  const timelineMap = {};

  salesTx.forEach((tx) => {
    const qty = Math.abs(tx.quantityDelta);
    const price = tx.unitPrice || 0;
    const revenue = tx.paymentAmount !== undefined && tx.paymentAmount !== null && tx.paymentAmount > 0
      ? tx.paymentAmount
      : qty * price;
    const itemCost = tx.itemId?.unitCost || 0;
    const cogs = qty * itemCost;

    periodSalesRevenue += revenue;
    periodUnitsSold += qty;
    periodCostOfGoodsSold += cogs;

    const sku = tx.itemId?.sku || 'UNKNOWN';
    if (!salesBySku[sku]) {
      salesBySku[sku] = { unitsSold: 0, revenue: 0, cogs: 0 };
    }
    salesBySku[sku].unitsSold += qty;
    salesBySku[sku].revenue += revenue;
    salesBySku[sku].cogs += cogs;

    const cat = tx.category || tx.itemId?.category || 'General';
    if (!salesByCategory[cat]) {
      salesByCategory[cat] = { unitsSold: 0, revenue: 0 };
    }
    salesByCategory[cat].unitsSold += qty;
    salesByCategory[cat].revenue += revenue;

    const mode = (tx.paymentMode || 'CASH').toUpperCase();
    if (!paymentModesMap[mode]) {
      paymentModesMap[mode] = { count: 0, total: 0 };
    }
    paymentModesMap[mode].count += 1;
    paymentModesMap[mode].total += revenue;

    const dayKey = new Date(tx.createdAt).toISOString().split('T')[0];
    if (!timelineMap[dayKey]) {
      timelineMap[dayKey] = { date: dayKey, inflow: 0, outflow: 0, netFlow: 0, salesCount: 0, invoiceCount: 0 };
    }
    timelineMap[dayKey].inflow += revenue;
    timelineMap[dayKey].salesCount += 1;
  });

  // 4. Invoices (Procurement Outflow) within Period
  const invoices = await Invoice.find({
    status: 'PROCESSED',
    ...timeMatch,
  })
    .sort({ createdAt: -1 })
    .lean();

  let periodProcurementSpend = 0;
  const supplierSpendMap = {};

  invoices.forEach((inv) => {
    const amount = Number(inv.totalAmount) || 0;
    periodProcurementSpend += amount;

    const vendor = (inv.vendor || 'Direct Supplier').trim();
    if (!supplierSpendMap[vendor]) {
      supplierSpendMap[vendor] = { supplier: vendor, totalSpend: 0, invoiceCount: 0, lastInvoiceDate: inv.createdAt };
    }
    supplierSpendMap[vendor].totalSpend += amount;
    supplierSpendMap[vendor].invoiceCount += 1;
    if (new Date(inv.createdAt) > new Date(supplierSpendMap[vendor].lastInvoiceDate)) {
      supplierSpendMap[vendor].lastInvoiceDate = inv.createdAt;
    }

    const dayKey = new Date(inv.createdAt).toISOString().split('T')[0];
    if (!timelineMap[dayKey]) {
      timelineMap[dayKey] = { date: dayKey, inflow: 0, outflow: 0, netFlow: 0, salesCount: 0, invoiceCount: 0 };
    }
    timelineMap[dayKey].outflow += amount;
    timelineMap[dayKey].invoiceCount += 1;
  });

  // Format Timeline sorted by date
  const cashFlowTimeline = Object.values(timelineMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      inflow: Math.round(d.inflow * 100) / 100,
      outflow: Math.round(d.outflow * 100) / 100,
      netFlow: Math.round((d.inflow - d.outflow) * 100) / 100,
    }));

  // 5. Category Breakdown (Valuation + Sales Revenue)
  const categoryAgg = {};
  allItems.forEach((item) => {
    const cat = (item.category || 'General').trim();
    if (!categoryAgg[cat]) {
      categoryAgg[cat] = {
        category: cat,
        skuCount: 0,
        totalUnits: 0,
        totalValuation: 0,
        periodRevenue: 0,
        periodUnitsSold: 0,
      };
    }
    categoryAgg[cat].skuCount += 1;
    categoryAgg[cat].totalUnits += item.currentStock;
    categoryAgg[cat].totalValuation += item.currentStock * item.unitCost;
  });

  Object.keys(salesByCategory).forEach((cat) => {
    if (!categoryAgg[cat]) {
      categoryAgg[cat] = {
        category: cat,
        skuCount: 0,
        totalUnits: 0,
        totalValuation: 0,
        periodRevenue: 0,
        periodUnitsSold: 0,
      };
    }
    categoryAgg[cat].periodRevenue = Math.round(salesByCategory[cat].revenue * 100) / 100;
    categoryAgg[cat].periodUnitsSold = salesByCategory[cat].unitsSold;
  });

  const categories = Object.values(categoryAgg)
    .map((c) => ({
      ...c,
      totalValuation: Math.round(c.totalValuation * 100) / 100,
      percentValuation: totalCatalogValuation > 0
        ? Math.round((c.totalValuation / totalCatalogValuation) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.totalValuation - a.totalValuation);

  // 6. Supplier Intelligence Breakdown
  const supplierAgg = { ...supplierSpendMap };
  allItems.forEach((item) => {
    const supp = (item.supplier || 'Direct Supplier').trim();
    if (!supplierAgg[supp]) {
      supplierAgg[supp] = {
        supplier: supp,
        totalSpend: 0,
        invoiceCount: 0,
        skuCount: 0,
        lastInvoiceDate: null,
      };
    }
    supplierAgg[supp].skuCount = (supplierAgg[supp].skuCount || 0) + 1;
  });

  const suppliers = Object.values(supplierAgg)
    .map((s) => ({
      ...s,
      totalSpend: Math.round(s.totalSpend * 100) / 100,
      skuCount: s.skuCount || 0,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  // 7. Payment Modes Breakdown
  const totalPaymentMoney = Object.values(paymentModesMap).reduce((s, p) => s + p.total, 0) || 1;
  const paymentModes = Object.entries(paymentModesMap).map(([mode, data]) => ({
    mode,
    count: data.count,
    total: Math.round(data.total * 100) / 100,
    percentage: Math.round((data.total / totalPaymentMoney) * 1000) / 10,
  }));

  // 8. SKU Economics & Profit Margins
  const margins = allItems.map((item) => {
    const cost = item.unitCost || 0;
    const price = item.sellingPrice || 0;
    const unitMargin = Math.round((price - cost) * 100) / 100;
    const marginPercent = price > 0 ? Math.round(((price - cost) / price) * 1000) / 10 : 0;
    const salesInfo = salesBySku[item.sku] || { unitsSold: 0, revenue: 0, cogs: 0 };
    const realizedProfit = Math.round((salesInfo.revenue - salesInfo.cogs) * 100) / 100;

    return {
      _id: item._id,
      sku: item.sku,
      name: item.name,
      category: item.category || 'General',
      supplier: item.supplier || 'Direct Supplier',
      currentStock: item.currentStock,
      unitCost: cost,
      sellingPrice: price,
      unitMargin,
      marginPercent,
      unitsSoldInPeriod: salesInfo.unitsSold,
      periodRevenue: salesInfo.revenue,
      realizedProfit,
    };
  }).sort((a, b) => b.realizedProfit - a.realizedProfit);

  // 9. Sales Orders Table with items, payment mode, and screenshots
  const recentOrders = salesTx.slice(0, 50).map((tx) => ({
    _id: tx._id,
    orderId: tx.sourceReference || `ORD-${tx._id.toString().slice(-6)}`,
    date: tx.createdAt,
    sku: tx.itemId?.sku || 'UNKNOWN',
    productName: tx.itemId?.name || 'N/A',
    category: tx.category || tx.itemId?.category || 'General',
    quantity: Math.abs(tx.quantityDelta),
    unitPrice: tx.unitPrice,
    paymentAmount: tx.paymentAmount || Math.abs(tx.quantityDelta) * (tx.unitPrice || 0),
    paymentMode: tx.paymentMode || 'CASH',
    customerName: tx.customerName || null,
    notes: tx.notes || null,
    hasScreenshot: Boolean(tx.paymentScreenshot),
    paymentScreenshot: tx.paymentScreenshot || null,
  }));

  // 10. Velocity & Stockout Risk Forecasting
  const velocityRes = await getSalesVelocity(days);
  const criticalRunOuts = velocityRes.items.filter(
    (i) => typeof i.daysOfInventoryRemaining === 'number' && i.daysOfInventoryRemaining <= 15
  );

  const realizedGrossMarginTotal = periodSalesRevenue - periodCostOfGoodsSold;
  const grossMarginPercent = periodSalesRevenue > 0
    ? Math.round((realizedGrossMarginTotal / periodSalesRevenue) * 1000) / 10
    : 0;

  return {
    timeframe: `${days} Days`,
    isAllTime,
    kpi: {
      totalValuation: metrics.totalValuation,
      totalStockUnits: metrics.totalStockUnits,
      totalSkus: metrics.totalSkus,
      outOfStockCount: metrics.outOfStockCount,
      lowStockCount: metrics.lowStockCount,
      healthyStockCount: metrics.healthyStockCount,
      periodRevenue: Math.round(periodSalesRevenue * 100) / 100,
      periodUnitsSold,
      periodProcurementSpend: Math.round(periodProcurementSpend * 100) / 100,
      netCashFlow: Math.round((periodSalesRevenue - periodProcurementSpend) * 100) / 100,
      realizedGrossMargin: Math.round(realizedGrossMarginTotal * 100) / 100,
      grossMarginPercent,
      salesCount: salesTx.length,
      invoiceCount: invoices.length,
    },
    cashFlowTimeline,
    categories,
    suppliers,
    paymentModes,
    abc: {
      summary: abcSummary,
      items: abcItems,
    },
    margins,
    recentOrders,
    criticalRunOuts,
  };
};

export default { getStockHealth, getSalesVelocity, getComprehensiveDashboard };

