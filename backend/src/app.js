import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import inventoryRoutes from './routes/inventoryRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orgRoutes from './routes/orgRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import issueRoutes from './routes/issueRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security and standard middlewares
// Configure CSP to allow Vite scripts, styles, and data URIs
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false, // Critical: Allows Google OAuth popup window to communicate with opener
    crossOriginResourcePolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Ensures Google receives the exact origin
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Canonicalize www.ialksng.me to ialksng.me for OAuth and session consistency
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('www.ialksng.me')) {
    return res.redirect(301, `https://ialksng.me${req.originalUrl}`);
  }
  next();
});

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Health & Keep-Awake Endpoints (ultra-lightweight, 0ms, no DB overhead)
const healthHandler = (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    subpath: '/projects/stoqra',
  });
};

const pingHandler = (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send('pong');
};

// Support GET and HEAD for UptimeRobot, Cron-job.org, BetterStack, and internal pinger
app.all(['/health', '/projects/stoqra/health'], (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return healthHandler(req, res);
  next();
});

app.all(['/ping', '/projects/stoqra/ping', '/api/ping', '/projects/stoqra/api/ping'], (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return pingHandler(req, res);
  next();
});

// API Routes mounted on both /api and /projects/stoqra/api
// This ensures full compatibility whether a reverse proxy strips the subpath or forwards it
app.use('/api', inventoryRoutes);
app.use('/projects/stoqra/api', inventoryRoutes);

app.use('/api/analytics', analyticsRoutes);
app.use('/projects/stoqra/api/analytics', analyticsRoutes);

app.use('/api/auth', authRoutes);
app.use('/projects/stoqra/api/auth', authRoutes);

app.use('/api/org', orgRoutes);
app.use('/projects/stoqra/api/org', orgRoutes);

app.use('/api/superadmin', superAdminRoutes);
app.use('/projects/stoqra/api/superadmin', superAdminRoutes);

app.use('/api/issues', issueRoutes);
app.use('/projects/stoqra/api/issues', issueRoutes);

// Static frontend serving (Production / Build mode)
// Supports both root and /projects/stoqra base paths
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  console.log(`[Static] Serving frontend from ${frontendDistPath}`);

  const staticOptions = {
    setHeaders: (res, filePath) => {
      if (
        filePath.endsWith('.html') ||
        filePath.endsWith('manifest.json') ||
        filePath.endsWith('sw.js')
      ) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  };

  // Serve static assets at both /projects/stoqra and root
  app.use('/projects/stoqra', express.static(frontendDistPath, staticOptions));
  app.use(express.static(frontendDistPath, staticOptions));

  // SPA fallback for client-side navigation
  const spaFallback = (req, res, next) => {
    if (
      req.originalUrl.startsWith('/api') ||
      req.originalUrl.startsWith('/projects/stoqra/api') ||
      req.originalUrl.startsWith('/health') ||
      req.originalUrl.startsWith('/projects/stoqra/health')
    ) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  };

  app.get('/projects/stoqra*', spaFallback);
  app.get('*', spaFallback);
} else {
  // If frontend is not yet built, serve a helpful status page on root
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'Stoqra Automated Inventory Management API',
      status: 'active',
      endpoints: {
        health: '/health',
        items: '/api/inventory/items',
        stockHealth: '/api/analytics/stock-health',
        salesVelocity: '/api/analytics/sales-velocity',
      },
      frontendNotice: 'Frontend build not found. Run "npm run build:frontend" to compile.',
    });
  });
}

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Error Middleware]', err);

  // Multer file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Database Validation Error',
      details: messages,
    });
  }

  // Mongoose cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
