// filename: backend/src/config/env.js
import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'POSTGRES_URL',
  'REDIS_URL',
  'MONGO_URL',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    sessionExpiresIn: process.env.JWT_SESSION_EXPIRES_IN || '5m',
  },

  db: {
    postgresUrl: process.env.POSTGRES_URL,
    redisUrl: process.env.REDIS_URL,
    mongoUrl: process.env.MONGO_URL,
  },

  riskEngineUrl: process.env.RISK_ENGINE_URL || 'http://localhost:8000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
