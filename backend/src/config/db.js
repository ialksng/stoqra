import mongoose from 'mongoose';

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
    console.warn('⚠️ Go to: Render Dashboard > Environment > Add Environment Variable');
    console.warn('⚠️ Key: MONGODB_URI, Value: mongodb+srv://<user>:<password>@cluster...');
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
