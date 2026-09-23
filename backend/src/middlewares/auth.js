import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'stoqra-inventory-jwt-secret-key-default';

/**
 * Middleware: Enforces user authentication via JWT Bearer token
 * Attaches req.user with { userId, email, name, avatar, role, organizationId, isOnboarded }
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in with your Google account.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach basic user payload to request
    req.user = decoded;

    // Fetch fresh user from DB to get latest organizationId and role
    const user = await User.findById(decoded.userId).lean();
    if (user) {
      req.user = {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: user.organizationId ? user.organizationId.toString() : null,
        isOnboarded: user.isOnboarded || false,
      };
    }

    next();
  } catch (error) {
    const isExpired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      error: isExpired
        ? 'Session expired. Please sign in again.'
        : 'Invalid authentication token.',
    });
  }
};

/**
 * Middleware: Optional authentication (attaches user if valid token present)
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      const user = await User.findById(decoded.userId).lean();
      if (user) {
        req.user = {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          organizationId: user.organizationId ? user.organizationId.toString() : null,
          isOnboarded: user.isOnboarded || false,
        };
      }
    } catch {
      // Ignore token verification errors for optional auth
    }
  }

  next();
};

/**
 * Middleware: Enforces user has admin privileges
 */
export const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.',
    });
  }
  next();
};

/**
 * Middleware: Enforces user has an organization (has completed onboarding)
 */
export const requireOrg = async (req, res, next) => {
  if (!req.user || !req.user.organizationId) {
    return res.status(403).json({
      success: false,
      error: 'Store setup required. Please complete your store onboarding first.',
      needsOnboarding: true,
    });
  }
  next();
};

/**
 * Helper: Check if an email belongs to the platform Super Admin
 * Hardcodes ialksng@gmail.com and also checks ADMIN_EMAILS / ADMIN_ALERT_EMAIL
 */
export const isSuperAdminEmail = (email) => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (normalized === 'ialksng@gmail.com') return true;

  const raw = `${process.env.ADMIN_EMAILS || ''},${process.env.ADMIN_ALERT_EMAIL || ''}`;
  const adminEmails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(normalized);
};

/**
 * Middleware: Enforces user is the platform Super Admin (ialksng@gmail.com)
 */
export const requireSuperAdmin = async (req, res, next) => {
  if (!req.user || !isSuperAdminEmail(req.user.email)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Platform Super Admin privileges required.',
    });
  }
  next();
};

export default { requireAuth, optionalAuth, requireAdmin, requireOrg, requireSuperAdmin, isSuperAdminEmail, JWT_SECRET };

