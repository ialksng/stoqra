import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { JWT_SECRET } from '../middlewares/auth.js';

/**
 * Parse configured administrator emails from environment variables
 * Supports comma-separated list in ADMIN_EMAILS and ADMIN_ALERT_EMAIL
 */
export const getAdminEmails = () => {
  const raw = `${process.env.ADMIN_EMAILS || ''},${process.env.ADMIN_ALERT_EMAIL || ''}`;
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Build a safe user object for API responses
 */
const buildUserResponse = (user, org = null) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  role: user.role,
  organizationId: user.organizationId || null,
  isOnboarded: user.isOnboarded || false,
  organization: org
    ? { id: org._id, name: org.name, type: org.type }
    : null,
});

/**
 * Get public authentication configuration for frontend initialization
 * GET /api/auth/config
 */
export const getAuthConfig = async (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || '';
  return res.status(200).json({
    success: true,
    googleClientId,
    hasGoogleAuth: Boolean(googleClientId),
    demoEnabled: true,
  });
};

/**
 * Authenticate with Google Identity Services ID Token credential
 * POST /api/auth/google
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Google ID token credential is required.',
      });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;

    if (!googleClientId) {
      return res.status(500).json({
        success: false,
        error: 'Google Client ID is not configured on the server.',
      });
    }

    const oauth2Client = new google.auth.OAuth2(googleClientId);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, error: 'Invalid Google credential token.' });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split('@')[0];
    const avatar = payload.picture || null;

    const adminEmails = getAdminEmails();
    const isConfiguredAdmin = adminEmails.includes(email);

    // Upsert user
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        googleId,
        email,
        name,
        avatar,
        role: isConfiguredAdmin ? 'admin' : 'admin', // Everyone starts as admin of their own store
        lastLogin: new Date(),
      });
    } else {
      user.googleId = googleId;
      user.avatar = avatar || user.avatar;
      user.lastLogin = new Date();
      if (isConfiguredAdmin && user.role !== 'admin') {
        user.role = 'admin';
      }
      await user.save();
    }

    // Fetch org if exists
    let org = null;
    if (user.organizationId) {
      org = await Organization.findById(user.organizationId).lean();
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: user.organizationId ? user.organizationId.toString() : null,
        isOnboarded: user.isOnboarded || false,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: buildUserResponse(user, org),
    });
  } catch (error) {
    console.error('[AuthController] Google sign-in verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: `Google verification failed: ${error.message}`,
    });
  }
};

/**
 * Get profile of current authenticated user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.userId).lean();
  let org = null;
  if (user?.organizationId) {
    org = await Organization.findById(user.organizationId).lean();
  }
  return res.status(200).json({
    success: true,
    user: buildUserResponse(user || req.user, org),
  });
};

/**
 * Quick demo login for local development and testing
 * POST /api/auth/demo
 */
export const demoLogin = async (req, res, next) => {
  try {
    const demoEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@stoqra.local';
    const demoName = 'Stoqra Admin (Demo)';

    let user = await User.findOne({ email: demoEmail.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: demoEmail.toLowerCase(),
        name: demoName,
        avatar: null,
        role: 'admin',
        lastLogin: new Date(),
      });
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

    let org = null;
    if (user.organizationId) {
      org = await Organization.findById(user.organizationId).lean();
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: user.organizationId ? user.organizationId.toString() : null,
        isOnboarded: user.isOnboarded || false,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Logged in as Demo Admin',
      token,
      user: buildUserResponse(user, org),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all users in the same organization (Protected: Admins only)
 * GET /api/auth/users
 */
export const listUsers = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;

    // If user has no org, return only themselves
    const filter = orgId ? { organizationId: orgId } : { _id: req.user.userId };

    const users = await User.find(filter)
      .select('-__v')
      .sort({ role: 1, lastLogin: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        avatar: u.avatar,
        role: u.role,
        organizationId: u.organizationId,
        isOnboarded: u.isOnboarded,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role (promote to admin or demote to staff)
 * PATCH /api/auth/users/:id/role
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be "admin" or "staff".' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Ensure target is in the same org
    if (
      req.user.organizationId &&
      targetUser.organizationId?.toString() !== req.user.organizationId
    ) {
      return res.status(403).json({
        success: false,
        error: 'You can only manage users in your organization.',
      });
    }

    if (targetUser._id.toString() === req.user.userId && role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'You cannot demote yourself from admin status.',
      });
    }

    targetUser.role = role;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name || targetUser.email} is now a ${role}.`,
      user: { id: targetUser._id, email: targetUser.email, name: targetUser.name, role: targetUser.role },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a staff/viewer user from the organization (Admin only)
 * DELETE /api/auth/users/:id
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own account.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Only delete users in the same org
    if (
      req.user.organizationId &&
      targetUser.organizationId?.toString() !== req.user.organizationId
    ) {
      return res.status(403).json({
        success: false,
        error: 'You can only remove users from your own organization.',
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name || targetUser.email} has been removed from your organization.`,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAdminEmails,
  getAuthConfig,
  googleLogin,
  getCurrentUser,
  demoLogin,
  listUsers,
  updateUserRole,
  deleteUser,
};
