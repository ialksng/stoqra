import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../middlewares/auth.js';

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
        error: 'Google Client ID is not configured on the server. Please set GOOGLE_CLIENT_ID or GMAIL_CLIENT_ID in .env.',
      });
    }

    const oauth2Client = new google.auth.OAuth2(googleClientId);

    // Verify token with Google's public keys
    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Google credential token.',
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split('@')[0];
    const avatar = payload.picture || null;

    const adminEmail = (process.env.ADMIN_ALERT_EMAIL || '').toLowerCase().trim();
    const isAdmin = adminEmail && email === adminEmail;

    // Upsert user in database
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (!user) {
      user = await User.create({
        googleId,
        email,
        name,
        avatar,
        role: isAdmin ? 'admin' : 'staff',
        lastLogin: new Date(),
      });
    } else {
      user.googleId = googleId;
      user.avatar = avatar || user.avatar;
      user.lastLogin = new Date();
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
      }
      await user.save();
    }

    // Generate session JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
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
  return res.status(200).json({
    success: true,
    user: req.user,
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

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Logged in as Demo Admin',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAuthConfig,
  googleLogin,
  getCurrentUser,
  demoLogin,
};
