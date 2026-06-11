// filename: backend/src/services/authService.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

const BCRYPT_ROUNDS = 10;

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'cogniq',
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'cogniq',
  });
}

export function signSessionToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '5m',
    issuer: 'cogniq',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, { issuer: 'cogniq' });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret, { issuer: 'cogniq' });
}

export function decodeToken(token) {
  return jwt.decode(token);
}

// ─── Passwords ────────────────────────────────────────────────────────────────

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

export async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}
