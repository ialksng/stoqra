import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'stoqra-inventory-jwt-secret-key-default';

/**
 * Middleware: Enforces user authentication via JWT Bearer token
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

    // Optionally check if user exists in database
    const user = await User.findById(decoded.userId).lean();
    if (user) {
      req.user = {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
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

export default { requireAuth, optionalAuth, requireAdmin, JWT_SECRET };
