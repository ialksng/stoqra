import dotenv from 'dotenv';
// Load environment variables before any other imports
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { startGmailWatcher, stopGmailWatcher } from './workers/gmailWatcher.js';

const PORT = process.env.PORT || 5000;

let server = null;

const startServer = async () => {
  try {
    console.log('---------------------------------------------------------');
    console.log('🚀 Launching Stoqra Inventory Management System...');
    console.log('---------------------------------------------------------');

    // 1. Establish database connection
    await connectDB();

    // 2. Start Express HTTP Server
    server = app.listen(PORT, () => {
      console.log(`[Server] Express HTTP server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`[Server] Health check available at http://localhost:${PORT}/health`);
    });

    // 3. Initialize background Gmail ingestion cron worker
    startGmailWatcher();

  } catch (error) {
    console.error('[Server] Critical startup error:', error.message);
    process.exit(1);
  }
};

/**
 * Graceful termination handling
 */
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

  stopGmailWatcher();

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
