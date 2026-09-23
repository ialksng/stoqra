import Organization, { STORE_TYPES_LIST } from '../models/Organization.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middlewares/auth.js';

/**
 * Create a new organization (store) and link the user to it
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

    // Check if user already has an org
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    let org;
    if (user.organizationId) {
      // Allow re-setup only if updating (admin only)
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

    // Link user to org and mark as admin + onboarded
    user.organizationId = org._id;
    user.role = 'admin';
    user.isOnboarded = true;
    await user.save();

    // Issue a fresh JWT with org info
    const newToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: org._id.toString(),
        isOnboarded: true,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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

export default { setupOrganization, getMyOrganization, getStoreTypes };
