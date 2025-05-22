// src/lib/dbConnect.js
import mongoose from 'mongoose';
// import dotenv from 'dotenv'; // Next.js automatically loads .env files

// dotenv.config(); // Not strictly necessary in Next.js server-side environments

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error(
    'Please define the MONGO_URI environment variable inside .env'
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
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
      console.log('✅ New MongoDB connected');
      return mongooseInstance;
    }).catch(err => {
        console.error('❌ MongoDB connection error:', err);
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
