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

export default { requireAuth, optionalAuth, requireAdmin, requireOrg, JWT_SECRET };
