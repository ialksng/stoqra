import dotenv from 'dotenv';
// Load environment variables before any other imports
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { startGmailWatcher, stopGmailWatcher } from './workers/gmailWatcher.js';
import { startKeepAwake, stopKeepAwake } from './workers/keepAwake.js';

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

let server = null;

const startServer = async () => {
  try {
    console.log('---------------------------------------------------------');
    console.log('🚀 Launching Stoqra Inventory Management System...');
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('---------------------------------------------------------');

    // 1. Start HTTP Server immediately on 0.0.0.0 so Render detects the port
    server = app.listen(PORT, HOST, () => {
      console.log(`[Server] Express HTTP server running on http://${HOST}:${PORT}`);
      console.log(`[Server] Health check ready at http://${HOST}:${PORT}/health`);
      console.log(`[Server] Subpath ready at http://${HOST}:${PORT}/projects/stoqra`);
    });

    // 2. Start Keep-Awake service (pings health check to prevent Render from idling out)
    startKeepAwake();

    // 3. Establish database connection in background (resilient to initial offline status)
    connectDB()
      .then((conn) => {
        if (conn) {
          // 4. Initialize background Gmail ingestion cron worker after DB connects
          startGmailWatcher();
        } else {
          console.warn('[Server] Running without active database connection. Update MONGODB_URI in settings to enable full persistence.');
        }
      })
      .catch((dbErr) => {
        console.error('[Server] Non-fatal DB connection error during bootstrap:', dbErr.message);
      });

  } catch (error) {
    console.error('[Server] Critical HTTP startup error:', error.message);
    process.exit(1);
  }
};

/**
 * Graceful termination handling
 */
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

  stopGmailWatcher();
  stopKeepAwake();

  if (server) {
    server.close(() => {
      console.log('[Server] Express HTTP server closed.');
    });
  }

  await disconnectDB();

  console.log('[Server] Graceful shutdown completed.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
