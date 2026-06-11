// filename: backend/src/middleware/authMiddleware.js
import { verifyAccessToken } from '../services/authService.js';
import { getRedisClient } from '../config/database.js';

function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

async function isTokenBlacklisted(token) {
  try {
    const redis = await getRedisClient();
    const result = await redis.get(`blacklist:${token}`);
    return result !== null;
  } catch {
    return false;
  }
}

export async function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: 'No authentication token provided.' });
  }

  try {
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ success: false, error: 'Token has been revoked.' });
    }

    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      id: payload.userId, // alias for convenience
      email: payload.email,
      isEmployee: payload.isEmployee === true,
    };
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

export async function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      req.user = null;
      return next();
    }

    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      id: payload.userId,
      email: payload.email,
      isEmployee: payload.isEmployee === true,
    };
    req.token = token;
  } catch {
    req.user = null;
  }

  next();
}

export function requireEmployee(req, res, next) {
  if (!req.user || req.user.isEmployee !== true) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Employee privileges required.',
    });
  }
  next();
}
