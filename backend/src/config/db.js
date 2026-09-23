import mongoose from 'mongoose';

/**
 * Clean up legacy single-tenant indexes from MongoDB collections
 * Prevents E11000 duplicate key errors on messageId_1, invoiceNumber_1, sku_1
 */
export const cleanupLegacyIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    // 1. processedmails collection
    try {
      const pmIndexes = await db.collection('processedmails').indexes();
      const hasOldMsgId = pmIndexes.some((idx) => idx.name === 'messageId_1');
      if (hasOldMsgId) {
        console.log('[Database] Dropping legacy single-field index messageId_1 on processedmails...');
        await db.collection('processedmails').dropIndex('messageId_1');
      }
    } catch (e) {
      // Index might not exist
    }

    // 2. invoices collection
    try {
      const invIndexes = await db.collection('invoices').indexes();
      if (invIndexes.some((idx) => idx.name === 'messageId_1')) {
        console.log('[Database] Dropping legacy single-field index messageId_1 on invoices...');
        await db.collection('invoices').dropIndex('messageId_1');
      }
      if (invIndexes.some((idx) => idx.name === 'invoiceNumber_1')) {
        console.log('[Database] Dropping legacy single-field index invoiceNumber_1 on invoices...');
        await db.collection('invoices').dropIndex('invoiceNumber_1');
      }
    } catch (e) {
      // Index might not exist
    }

    // 3. items collection
    try {
      const itemIndexes = await db.collection('items').indexes();
      if (itemIndexes.some((idx) => idx.name === 'sku_1')) {
        console.log('[Database] Dropping legacy single-field index sku_1 on items...');
        await db.collection('items').dropIndex('sku_1');
      }
    } catch (e) {
      // Index might not exist
    }
  } catch (err) {
    console.warn('[Database] Legacy index cleanup notice:', err.message);
  }
};

/**
 * Connect to MongoDB database with retry logic
 * @param {number} [retries=3]
 * @param {number} [delay=5000]
 * @returns {Promise<typeof mongoose | null>}
 */
export const connectDB = async (retries = 3, delay = 5000) => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('====================================================================');
    console.warn('⚠️ [Database] MONGODB_URI is not set in environment variables!');
    console.warn('⚠️ Please add your MongoDB Atlas URI in the Render Dashboard.');
    console.warn('====================================================================');
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Database] Connecting to MongoDB (attempt ${attempt}/${retries})...`);
      const conn = await mongoose.connect(uri, {
        autoIndex: true,
        serverSelectionTimeoutMS: 5000,
      });

      console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

      // Drop legacy single-tenant unique indexes to prevent E11000 duplicate key errors
      await cleanupLegacyIndexes();

      return conn;
    } catch (error) {
      console.error(`[Database] Connection attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`[Database] Retrying connection in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('[Database] Could not connect to MongoDB after multiple attempts. Application is running in degraded mode.');
  return null;
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed');
  } catch (error) {
    console.error(`[Database] Disconnect error: ${error.message}`);
  }
};

// Monitor connection events
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] Connection runtime error: ${err.message}`);
});

export default connectDB;
