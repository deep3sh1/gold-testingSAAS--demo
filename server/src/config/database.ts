import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './index.js';
import dns from 'dns';

// Ensure MongoDB Atlas SRV records resolve reliably on Windows development environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignore if permissions or platform restriction
}

let memoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(uri: string = config.mongoUri): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  mongoose.set('strictQuery', true);

  // 1. First attempt: configured MongoDB URI
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.name || 'database'}`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB] Could not connect to primary URI (${uri}).`);
    if (process.env.VERCEL) {
      console.log(`[MongoDB] Running in Vercel demo mode without external database.`);
      return mongoose;
    }
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.log(`[MongoDB] Starting zero-config in-memory MongoDB development database...`);
  }

  // 2. Fallback: In-Memory MongoDB Server for frictionless local development
  try {
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    const conn = await mongoose.connect(memUri, {
      autoIndex: true,
    });
    console.log(`[MongoDB] In-memory database started and connected successfully! (URI: ${memUri})`);
    return conn;
  } catch (fallbackError) {
    console.error('[MongoDB] Failed to initialize fallback database:', fallbackError);
    throw fallbackError;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}
