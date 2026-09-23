import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Item from '../models/Item.js';
import Sale from '../models/Sale.js';
import Invoice from '../models/Invoice.js';
import StagedInvoice from '../models/StagedInvoice.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import ProcessedMail from '../models/ProcessedMail.js';
import { isSuperAdminEmail } from '../middlewares/auth.js';

/**
 * Super Admin: Get High-level Platform KPIs & Highlights
 * GET /api/superadmin/overview
 */
export const getPlatformOverview = async (req, res, next) => {
  try {
    const nonAdminUserFilter = {
      email: { $nin: ['ialksng@gmail.com', (req.user?.email || '').toLowerCase()].filter(Boolean) },
      isSuperAdmin: { $ne: true },
    };

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
      User.countDocuments(nonAdminUserFilter),
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
      User.find(nonAdminUserFilter)
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

    const query = {
      email: { $nin: ['ialksng@gmail.com', (req.user?.email || '').toLowerCase()].filter(Boolean) },
      isSuperAdmin: { $ne: true },
    };
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$and = [{ $or: [{ name: regex }, { email: regex }] }];
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

/**
 * Super Admin: Remove a user and clean up their owned stores and data
 * DELETE /api/superadmin/users/:userId
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (isSuperAdminEmail(user.email) || user.email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the Super Administrator account.',
      });
    }

    // Find all organizations owned by this user
    const userStores = await Organization.find({ ownerId: user._id }).lean();
    const storeIds = userStores.map((s) => s._id);

    if (storeIds.length > 0) {
      await Promise.all([
        Item.deleteMany({ organizationId: { $in: storeIds } }),
        Sale.deleteMany({ organizationId: { $in: storeIds } }),
        Invoice.deleteMany({ organizationId: { $in: storeIds } }),
        StagedInvoice.deleteMany({ organizationId: { $in: storeIds } }),
        InventoryTransaction.deleteMany({ organizationId: { $in: storeIds } }),
        ProcessedMail.deleteMany({ organizationId: { $in: storeIds } }),
        Organization.deleteMany({ _id: { $in: storeIds } }),
      ]);
    }

    // Unset active organizationId for any users who were associated with deleted stores
    if (storeIds.length > 0) {
      await User.updateMany(
        { organizationId: { $in: storeIds } },
        { $set: { organizationId: null, isOnboarded: false } }
      );
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: `User "${user.name}" (${user.email}) and ${storeIds.length} store(s) permanently removed.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin: Remove a store/organization and all its associated data
 * DELETE /api/superadmin/stores/:orgId
 */
export const deleteStore = async (req, res, next) => {
  try {
    const { orgId } = req.params;

    const store = await Organization.findById(orgId);
    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    // Clean up all related inventory, sales, invoices, staged invoices, transactions
    await Promise.all([
      Item.deleteMany({ organizationId: orgId }),
      Sale.deleteMany({ organizationId: orgId }),
      Invoice.deleteMany({ organizationId: orgId }),
      StagedInvoice.deleteMany({ organizationId: orgId }),
      InventoryTransaction.deleteMany({ organizationId: orgId }),
      ProcessedMail.deleteMany({ organizationId: orgId }),
      Organization.findByIdAndDelete(orgId),
    ]);

    // Update users whose active store was this org
    const affectedUsers = await User.find({ organizationId: orgId });
    for (const u of affectedUsers) {
      const remainingStore = await Organization.findOne({ ownerId: u._id, _id: { $ne: orgId } }).lean();
      if (remainingStore) {
        u.organizationId = remainingStore._id;
        u.isOnboarded = true;
      } else {
        u.organizationId = null;
        u.isOnboarded = false;
      }
      await u.save();
    }

    return res.status(200).json({
      success: true,
      message: `Store "${store.name}" and all associated inventory data permanently removed.`,
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
  deleteUser,
  deleteStore,
};
