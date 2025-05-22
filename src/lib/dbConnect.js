// src/lib/dbConnect.js
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error(
    'MONGO_URI environment variable is not defined. Ensure it is set in your .env file (for local development) or in your deployment environment variables (e.g., Netlify site settings).'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage or Server Actions.
 */
let cached = global.mongooseConnection;

if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable buffering if you want to handle connection errors explicitly on operations
      // useNewUrlParser and useUnifiedTopology are true by default in Mongoose 6+ and are no longer needed.
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
      console.log('✅ New MongoDB connected');
      return mongooseInstance;
    }).catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        // Log more details if available
        if (err.reason) console.error('Connection error reason:', err.reason);
        cached.promise = null; // Clear the promise on error so we can retry
        throw err; // Re-throw error to be caught by caller if needed
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Clear promise if connection failed
    throw e; // Re-throw error
  }
  
  return cached.conn;
}

export default dbConnect;
