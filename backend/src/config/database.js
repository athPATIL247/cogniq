// filename: backend/src/config/database.js
import pg from 'pg';
import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import { config } from './env.js';

const { Pool } = pg;

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
export const pgPool = new Pool({
  connectionString: config.db.postgresUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pgPool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
});

// ─── Redis ────────────────────────────────────────────────────────────────────
let redisClient = null;

export async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({ url: config.db.redisUrl });

  redisClient.on('error', (err) => {
    console.error('[Redis] Client error:', err.message);
  });

  redisClient.on('reconnecting', () => {
    console.warn('[Redis] Reconnecting...');
  });

  await redisClient.connect();
  console.log('[Redis] Connected successfully');
  return redisClient;
}

// ─── MongoDB ──────────────────────────────────────────────────────────────────
let mongoDb = null;
let mongoClientInstance = null;

export async function getMongoClient() {
  if (mongoDb) {
    return mongoDb;
  }

  mongoClientInstance = new MongoClient(config.db.mongoUrl, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  await mongoClientInstance.connect();
  mongoDb = mongoClientInstance.db('cogniq');
  console.log('[MongoDB] Connected successfully');
  return mongoDb;
}

export async function closeDatabases() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
  if (mongoClientInstance) {
    await mongoClientInstance.close();
  }
  await pgPool.end();
}
