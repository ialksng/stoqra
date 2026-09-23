import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Item from '../models/Item.js';
import Sale from '../models/Sale.js';
import Invoice from '../models/Invoice.js';
import { isSuperAdminEmail } from '../middlewares/auth.js';

/**
 * Super Admin: Get High-level Platform KPIs & Highlights
 * GET /api/superadmin/overview
 */
export const getPlatformOverview = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalStores,
      totalItems,
      totalInvoices,
      totalSalesCount,
      itemStats,
      salesStats,
      recentUsers,
      recentStores,
    ] = await Promise.all([
      User.countDocuments(),
      Organization.countDocuments(),
      Item.countDocuments(),
      Invoice.countDocuments(),
      Sale.countDocuments(),
      Item.aggregate([
        {
          $group: {
            _id: null,
            totalStockUnits: { $sum: '$currentStock' },
            totalStockValue: { $sum: { $multiply: ['$currentStock', '$unitCost'] } },
            totalRetailValue: { $sum: { $multiply: ['$currentStock', '$sellingPrice'] } },
          },
        },
      ]),
      Sale.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalProfit: { $sum: '$totalProfit' },
          },
        },
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('name email avatar role createdAt lastLogin isOnboarded organizationId')
        .populate('organizationId', 'name type')
        .lean(),
      Organization.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('ownerId', 'name email avatar')
        .lean(),
    ]);

    const stats = {
      totalUsers,
      totalStores,
      totalItems,
      totalInvoices,
      totalSalesCount,
      totalStockUnits: itemStats[0]?.totalStockUnits || 0,
      totalStockValue: itemStats[0]?.totalStockValue || 0,
      totalRetailValue: itemStats[0]?.totalRetailValue || 0,
      totalRevenue: salesStats[0]?.totalRevenue || 0,
      totalProfit: salesStats[0]?.totalProfit || 0,
      recentUsers,
      recentStores,
    };

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin: Get All Users with their associated stores
 * GET /api/superadmin/users
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { search = '' } = req.query;

    const query = {};
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .populate('organizationId', 'name type')
      .lean();

    const userIds = users.map((u) => u._id);

    // Fetch all stores owned by these users
    const allUserStores = await Organization.find({ ownerId: { $in: userIds } })
      .sort({ createdAt: -1 })
      .lean();

    // Group stores by ownerId
    const storesByOwner = {};
    allUserStores.forEach((org) => {
      const ownerKey = org.ownerId.toString();
      if (!storesByOwner[ownerKey]) {
        storesByOwner[ownerKey] = [];
      }
      storesByOwner[ownerKey].push({
        id: org._id,
        name: org.name,
        type: org.type,
        slug: org.slug,
        createdAt: org.createdAt,
      });
    });

    const enrichedUsers = users.map((u) => {
      const uId = u._id.toString();
      const ownedStores = storesByOwner[uId] || [];
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        isSuperAdmin: isSuperAdminEmail(u.email),
        isOnboarded: u.isOnboarded,
        gmailConnectedEmail: u.gmailConnectedEmail || null,
        lastGmailSync: u.lastGmailSync || null,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        activeStore: u.organizationId
          ? { id: u.organizationId._id, name: u.organizationId.name, type: u.organizationId.type }
          : null,
        stores: ownedStores,
        storeCount: ownedStores.length,
      };
    });

    return res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin: Get All Stores with owner info and catalog metrics
 * GET /api/superadmin/stores
 */
export const getAllStores = async (req, res, next) => {
  try {
    const { search = '' } = req.query;

    const query = {};
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { type: regex }];
    }

    const stores = await Organization.find(query)
      .sort({ createdAt: -1 })
      .populate('ownerId', 'name email avatar')
      .lean();

    const storeIds = stores.map((s) => s._id);

    // Aggregate items metrics per store
    const itemMetrics = await Item.aggregate([
      { $match: { organizationId: { $in: storeIds } } },
      {
        $group: {
          _id: '$organizationId',
          skuCount: { $sum: 1 },
          totalUnits: { $sum: '$currentStock' },
          totalCostValue: { $sum: { $multiply: ['$currentStock', '$unitCost'] } },
          totalRetailValue: { $sum: { $multiply: ['$currentStock', '$sellingPrice'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$currentStock', '$reorderLevel'] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Aggregate sales metrics per store
    const salesMetrics = await Sale.aggregate([
      { $match: { organizationId: { $in: storeIds } } },
      {
        $group: {
          _id: '$organizationId',
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
        },
      },
    ]);

    const itemMap = new Map();
    itemMetrics.forEach((m) => itemMap.set(m._id.toString(), m));

    const salesMap = new Map();
    salesMetrics.forEach((m) => salesMap.set(m._id.toString(), m));

    const enrichedStores = stores.map((s) => {
      const sId = s._id.toString();
      const iMetric = itemMap.get(sId) || {
        skuCount: 0,
        totalUnits: 0,
        totalCostValue: 0,
        totalRetailValue: 0,
        lowStockCount: 0,
      };
      const sMetric = salesMap.get(sId) || {
        salesCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
      };

      return {
        id: s._id,
        name: s.name,
        type: s.type,
        slug: s.slug,
        createdAt: s.createdAt,
        owner: s.ownerId
          ? {
              id: s.ownerId._id,
              name: s.ownerId.name,
              email: s.ownerId.email,
              avatar: s.ownerId.avatar,
            }
          : { name: 'Unknown', email: 'N/A' },
        metrics: {
          skuCount: iMetric.skuCount,
          totalUnits: iMetric.totalUnits,
          totalCostValue: Math.round(iMetric.totalCostValue || 0),
          totalRetailValue: Math.round(iMetric.totalRetailValue || 0),
          lowStockCount: iMetric.lowStockCount,
          salesCount: sMetric.salesCount,
          totalRevenue: Math.round(sMetric.totalRevenue || 0),
          totalProfit: Math.round(sMetric.totalProfit || 0),
        },
      };
    });

    return res.status(200).json({
      success: true,
      count: enrichedStores.length,
      stores: enrichedStores,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin: Inspect a specific store's catalog and health
 * GET /api/superadmin/stores/:orgId/catalog
 */
export const getStoreCatalog = async (req, res, next) => {
  try {
    const { orgId } = req.params;

    const store = await Organization.findById(orgId)
      .populate('ownerId', 'name email avatar')
      .lean();

    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const [items, recentSales, recentInvoices] = await Promise.all([
      Item.find({ organizationId: orgId }).sort({ currentStock: 1 }).limit(100).lean(),
      Sale.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(20).lean(),
      Invoice.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return res.status(200).json({
      success: true,
      store: {
        id: store._id,
        name: store.name,
        type: store.type,
        owner: store.ownerId,
        createdAt: store.createdAt,
      },
      itemCount: items.length,
      items,
      recentSales,
      recentInvoices,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPlatformOverview,
  getAllUsers,
  getAllStores,
  getStoreCatalog,
};
