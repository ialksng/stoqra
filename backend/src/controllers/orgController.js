import Organization, { STORE_TYPES_LIST } from '../models/Organization.js';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Invoice from '../models/Invoice.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import ProcessedMail from '../models/ProcessedMail.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middlewares/auth.js';

/**
 * Helper to generate JWT token for user
 */
const generateUserToken = (user, orgId) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      organizationId: orgId ? orgId.toString() : null,
      isOnboarded: Boolean(orgId),
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Setup or update active organization
 * POST /api/org/setup
 */
export const setupOrganization = async (req, res, next) => {
  try {
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Store name is required.' });
    }

    if (!type || !STORE_TYPES_LIST.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Store type must be one of: ${STORE_TYPES_LIST.join(', ')}`,
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    let org;
    if (user.organizationId) {
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can change the store settings.',
        });
      }
      org = await Organization.findById(user.organizationId);
      if (org) {
        org.name = name.trim();
        org.type = type;
        await org.save();
        user.isOnboarded = true;
        await user.save();
        return res.status(200).json({
          success: true,
          message: `Store "${org.name}" updated successfully.`,
          organization: { id: org._id, name: org.name, type: org.type },
        });
      }
    }

    // Create new organization
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
    org = await Organization.create({
      name: name.trim(),
      type,
      ownerId: user._id,
      slug,
    });

    user.organizationId = org._id;
    user.role = 'admin';
    user.isOnboarded = true;
    await user.save();

    const newToken = generateUserToken(user, org._id);

    return res.status(201).json({
      success: true,
      message: `Store "${org.name}" created successfully! Welcome to your dashboard.`,
      token: newToken,
      organization: { id: org._id, name: org.name, type: org.type },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: org._id,
        isOnboarded: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all stores/organizations owned by or accessible to the current user
 * GET /api/org/list
 */
export const listMyOrganizations = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const activeOrgId = req.user.organizationId ? req.user.organizationId.toString() : null;

    // Find all organizations where the user is owner
    const orgs = await Organization.find({ ownerId: userId }).sort({ createdAt: -1 }).lean();

    // Enrich with counts for products and invoices
    const stores = await Promise.all(
      orgs.map(async (org) => {
        const [itemsCount, invoicesCount] = await Promise.all([
          Item.countDocuments({ organizationId: org._id }),
          Invoice.countDocuments({ organizationId: org._id }),
        ]);

        return {
          id: org._id.toString(),
          _id: org._id.toString(),
          name: org.name,
          type: org.type,
          slug: org.slug,
          createdAt: org.createdAt,
          itemsCount,
          invoicesCount,
          isActive: activeOrgId === org._id.toString(),
        };
      })
    );

    return res.status(200).json({
      success: true,
      stores,
      activeStoreId: activeOrgId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new additional store and switch active context to it
 * POST /api/org/create
 */
export const createOrganization = async (req, res, next) => {
  try {
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Store name is required.' });
    }

    if (!type || !STORE_TYPES_LIST.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Store type must be one of: ${STORE_TYPES_LIST.join(', ')}`,
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
    const org = await Organization.create({
      name: name.trim(),
      type,
      ownerId: user._id,
      slug,
    });

    // Switch active organization to new store
    user.organizationId = org._id;
    user.role = 'admin';
    user.isOnboarded = true;
    await user.save();

    const newToken = generateUserToken(user, org._id);

    return res.status(201).json({
      success: true,
      message: `New store "${org.name}" created and activated!`,
      token: newToken,
      organization: { id: org._id, name: org.name, type: org.type },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: org._id,
        isOnboarded: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Switch active store for the current user
 * POST /api/org/switch/:id
 */
export const switchOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const targetOrg = await Organization.findOne({ _id: id, ownerId: userId }).lean();
    if (!targetOrg) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have permission to access it.',
      });
    }

    const user = await User.findById(userId);
    user.organizationId = targetOrg._id;
    user.isOnboarded = true;
    await user.save();

    const newToken = generateUserToken(user, targetOrg._id);

    return res.status(200).json({
      success: true,
      message: `Switched active store to "${targetOrg.name}".`,
      token: newToken,
      organization: {
        id: targetOrg._id,
        name: targetOrg.name,
        type: targetOrg.type,
      },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: targetOrg._id,
        isOnboarded: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a store and permanently clean up its data
 * DELETE /api/org/:id
 */
export const deleteOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const targetOrg = await Organization.findOne({ _id: id, ownerId: userId });
    if (!targetOrg) {
      return res.status(404).json({
        success: false,
        error: 'Store not found or you do not have permission to delete it.',
      });
    }

    const storeName = targetOrg.name;
    const orgId = targetOrg._id;

    // Cascade deletion of all scoped data for this organization
    const [deletedItems, deletedInvoices, deletedTx, deletedMail] = await Promise.all([
      Item.deleteMany({ organizationId: orgId }),
      Invoice.deleteMany({ organizationId: orgId }),
      InventoryTransaction.deleteMany({ organizationId: orgId }),
      ProcessedMail.deleteMany({ organizationId: orgId }),
    ]);

    console.log(`[OrgController] Cascade deleted data for store "${storeName}" (${orgId}): ` +
      `${deletedItems.deletedCount} items, ${deletedInvoices.deletedCount} invoices, ` +
      `${deletedTx.deletedCount} transactions, ${deletedMail.deletedCount} mail logs.`);

    // Delete organization document
    await Organization.findByIdAndDelete(orgId);

    // If the user's active store was this deleted store, fallback to another store
    const user = await User.findById(userId);
    let fallbackOrg = null;
    let newToken = null;

    if (user.organizationId && user.organizationId.toString() === orgId.toString()) {
      // Find remaining store
      fallbackOrg = await Organization.findOne({ ownerId: userId }).sort({ createdAt: -1 });

      if (fallbackOrg) {
        user.organizationId = fallbackOrg._id;
        user.isOnboarded = true;
      } else {
        user.organizationId = null;
        user.isOnboarded = false;
      }

      await user.save();
      newToken = generateUserToken(user, user.organizationId);
    }

    return res.status(200).json({
      success: true,
      message: `Store "${storeName}" and all associated inventory and invoices were permanently deleted.`,
      activeOrganization: fallbackOrg ? { id: fallbackOrg._id, name: fallbackOrg.name, type: fallbackOrg.type } : null,
      token: newToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: user.organizationId,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's organization info
 * GET /api/org/me
 */
export const getMyOrganization = async (req, res, next) => {
  try {
    if (!req.user.organizationId) {
      return res.status(200).json({ success: true, organization: null });
    }

    const org = await Organization.findById(req.user.organizationId).lean();
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found.' });
    }

    return res.status(200).json({
      success: true,
      organization: {
        id: org._id,
        name: org.name,
        type: org.type,
        ownerId: org.ownerId,
        createdAt: org.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available store types
 * GET /api/org/types
 */
export const getStoreTypes = async (req, res) => {
  return res.status(200).json({ success: true, types: STORE_TYPES_LIST });
};

export default {
  setupOrganization,
  listMyOrganizations,
  createOrganization,
  switchOrganization,
  deleteOrganization,
  getMyOrganization,
  getStoreTypes,
};
