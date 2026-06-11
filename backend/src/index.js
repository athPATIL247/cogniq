// filename: backend/src/index.js
import './config/env.js'; // Load & validate env first
import http from 'http';
import express from 'express';
import cors from 'cors';

import { config } from './config/env.js';
import { getRedisClient, getMongoClient } from './config/database.js';
import { initSocket } from './websocket/socketServer.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRouter from './routes/auth.js';
import deviceRouter from './routes/device.js';
import riskRouter from './routes/risk.js';
import dashboardRouter from './routes/dashboard.js';
import onboardingRouter from './routes/onboarding.js';
import transactionRouter from './routes/transaction.js';

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────

initSocket(httpServer);

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint'],
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── General rate limiter (all routes) ───────────────────────────────────────

app.use(generalLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'Cogniq Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/devices', deviceRouter);
app.use('/api/v1/risk', riskRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/onboarding', onboardingRouter);
app.use('/api/v1/transactions', transactionRouter);

// ─── 404 + Error handlers (must be last) ─────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────

async function start() {
  // Connect to Redis
  try {
    await getRedisClient();
    console.log('[Startup] Redis connected');
  } catch (err) {
    console.error('[Startup] Redis connection failed:', err.message);
    console.warn('[Startup] Continuing without Redis — rate limiting and token blacklisting will be degraded');
  }

  // Connect to MongoDB
  try {
    await getMongoClient();
    console.log('[Startup] MongoDB connected');
  } catch (err) {
    console.error('[Startup] MongoDB connection failed:', err.message);
    console.warn('[Startup] Continuing without MongoDB — behavioral event storage unavailable');
  }

  // Start listening
  httpServer.listen(config.port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║         Cogniq Backend  🚀               ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Port   : ${config.port}                          ║`);
    console.log(`║  Env    : ${config.nodeEnv.padEnd(30)} ║`);
    console.log(`║  Frontend: ${config.frontendUrl.padEnd(29)} ║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch((err) => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);
  httpServer.close(async () => {
    try {
      const { closeDatabases } = await import('./config/database.js');
      await closeDatabases();
      console.log('[Shutdown] All connections closed.');
    } catch (err) {
      console.error('[Shutdown] Error during cleanup:', err.message);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  process.exit(1);
});

export default app;
