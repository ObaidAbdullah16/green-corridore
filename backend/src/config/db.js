import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hazard_nav';

  try {
    console.log(`Connecting to MongoDB at ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500
    });
    isConnected = true;
    console.log('MongoDB connected successfully.');
    return true;
  } catch (err) {
    console.warn(`MongoDB connection failed (${err.message}). Running in resilient fallback mode (in-memory repository for hazards).`);
    isConnected = false;
    return false;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
