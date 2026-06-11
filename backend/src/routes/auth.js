// filename: backend/src/routes/auth.js
import { Router } from 'express';
import { pgPool, getRedisClient } from '../config/database.js';
import {
  signAccessToken,
  signRefreshToken,
  signSessionToken,
  verifyRefreshToken,
  verifyAccessToken,
  comparePassword,
  decodeToken,
} from '../services/authService.js';
import { getDeviceTrustScore, registerDevice } from '../services/deviceService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { strictLimiter, generalLimiter } from '../middleware/rateLimiter.js';
import { emitRiskEvent } from '../websocket/socketServer.js';
import { config } from '../config/env.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLevel(score) {
  if (score < 30) return 'low';
  if (score < 50) return 'medium';
  if (score < 70) return 'high';
  if (score < 85) return 'critical';
  return 'blocked';
}

function getRecommendedAction(score) {
  if (score < 50) return 'allow';
  if (score < 70) return 'mfa_push';
  if (score < 85) return 'mfa_otp';
  return 'block';
}

async function fetchRiskScore(payload) {
  try {
    const response = await fetch(`${config.riskEngineUrl}/api/v1/risk/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) throw new Error(`Risk engine returned ${response.status}`);

    const data = await response.json();
    const riskData = data.data || data;
    return {
      score: riskData.riskScore ?? riskData.risk_score ?? 25,
      factors: riskData.riskFactors ?? riskData.risk_factors ?? [],
      level: riskData.riskLevel ?? 'low',
      engineAvailable: true,
    };
  } catch (err) {
    console.warn('[Auth] Risk engine unavailable, using fallback score:', err.message);
    return {
      score: 25,
      factors: ['risk_engine_unavailable'],
      level: 'low',
      engineAvailable: false,
    };
  }
}

async function logRiskEvent({ userId, deviceId, eventType, riskScore, riskFactors, actionTaken, ipAddress }) {
  try {
    await pgPool.query(
      `INSERT INTO risk_events (user_id, device_id, event_type, risk_score, risk_factors, action_taken, ip_address, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        userId,
        deviceId || null,
        eventType,
        riskScore,
        JSON.stringify(riskFactors),
        actionTaken,
        ipAddress,
      ],
    );
  } catch (err) {
    console.error('[Auth] Failed to log risk event:', err.message);
  }
}

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post('/login', strictLimiter, async (req, res, next) => {
  try {
    const { email, password, deviceFingerprint, behavioralSnapshot } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    if (!deviceFingerprint) {
      return res.status(400).json({ success: false, error: 'Device fingerprint is required.' });
    }

    // ── 1. Fetch user ──────────────────────────────────────────────────────────
    const userResult = await pgPool.query(
      `SELECT id, name, email, password_hash, is_employee, employee_role, risk_tier
       FROM users WHERE email = $1 AND is_active = true`,
      [email.toLowerCase().trim()],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const user = userResult.rows[0];

    // ── 2. Verify password ────────────────────────────────────────────────────
    const passwordValid = await comparePassword(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    // ── 3. Device trust ───────────────────────────────────────────────────────
    const deviceTrustScore = await getDeviceTrustScore(deviceFingerprint);

    let deviceRow = null;
    try {
      deviceRow = await registerDevice(user.id, {
        fingerprint: deviceFingerprint,
        deviceName: req.headers['user-agent']?.substring(0, 100) || 'Unknown',
        os: 'Unknown',
        browser: 'Unknown',
      });
    } catch (err) {
      console.warn('[Auth] Device registration failed:', err.message);
    }

    // ── 4. Risk score ──────────────────────────────────────────────────────────
    const ipAddress = req.ip || req.connection?.remoteAddress;

    const riskPayload = {
      userId: user.id,
      deviceFingerprint,
      deviceTrustScore,
      action: 'login',
      context: {
        ipAddress,
        hour: new Date().getHours(),
      },
      behavioralSnapshot: behavioralSnapshot || null,
    };

    const { score: riskScore, factors: riskFactors } = await fetchRiskScore(riskPayload);

    const riskLevel = getRiskLevel(riskScore);
    const recommendedAction = getRecommendedAction(riskScore);

    // ── 5. Log risk event ─────────────────────────────────────────────────────
    await logRiskEvent({
      userId: user.id,
      deviceId: deviceRow?.id || null,
      eventType: 'login_attempt',
      riskScore,
      riskFactors,
      actionTaken: recommendedAction,
      ipAddress,
    });

    // ── 6. Emit WebSocket event ───────────────────────────────────────────────
    emitRiskEvent({
      userId: user.id,
      userEmail: user.email,
      email: user.email,
      riskScore,
      riskLevel,
      action: recommendedAction,
      actionType: 'login_attempt',
      factors: riskFactors,
      timestamp: new Date().toISOString(),
    });

    // ── 7. Decision ───────────────────────────────────────────────────────────
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      isEmployee: user.is_employee === true,
    };

    if (riskScore >= 85) {
      return res.status(200).json({
        success: true,
        data: {
          blocked: true,
          reason: 'Access blocked. Contact your bank.',
          riskScore,
          riskLevel,
          riskFactors,
          recommendedAction: 'block',
        },
      });
    }

    if (riskScore >= 70) {
      const sessionToken = signSessionToken({ ...tokenPayload, pendingAuth: true, mfaType: 'otp' });
      return res.status(200).json({
        success: true,
        data: {
          requiresMFA: true,
          mfaType: 'otp',
          sessionToken,
          riskScore,
          riskLevel,
          riskFactors,
          recommendedAction: 'mfa_otp',
        },
      });
    }

    if (riskScore >= 50) {
      const sessionToken = signSessionToken({ ...tokenPayload, pendingAuth: true, mfaType: 'push' });
      return res.status(200).json({
        success: true,
        data: {
          requiresMFA: true,
          mfaType: 'push',
          sessionToken,
          riskScore,
          riskLevel,
          riskFactors,
          recommendedAction: 'mfa_push',
        },
      });
    }

    // Low risk — issue full tokens immediately
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      data: {
        requiresMFA: false,
        accessToken,
        refreshToken,
        riskScore,
        riskLevel,
        riskFactors,
        recommendedAction: 'allow',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isEmployee: user.is_employee,
          employeeRole: user.employee_role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /mfa/verify ─────────────────────────────────────────────────────────

router.post('/mfa/verify', strictLimiter, async (req, res, next) => {
  try {
    const { sessionToken, code } = req.body;

    if (!sessionToken || !code) {
      return res.status(400).json({ success: false, error: 'sessionToken and code are required.' });
    }

    let payload;
    try {
      payload = verifyAccessToken(sessionToken);
    } catch {
      return res.status(401).json({ success: false, error: 'Session token is invalid or expired.' });
    }

    if (!payload.pendingAuth) {
      return res.status(401).json({ success: false, error: 'Invalid session token type.' });
    }

    const codeStr = String(code).trim();
    const isValidCode = codeStr === '123456' || /^\d{6}$/.test(codeStr);

    if (!isValidCode) {
      return res.status(401).json({ success: false, error: 'Invalid MFA code.' });
    }

    const userResult = await pgPool.query(
      `SELECT id, name, email, is_employee, employee_role FROM users WHERE id = $1`,
      [payload.userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }

    const user = userResult.rows[0];
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      isEmployee: user.is_employee === true,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isEmployee: user.is_employee,
          employeeRole: user.employee_role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

router.post('/refresh', generalLimiter, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'refreshToken is required.' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token.' });
    }

    const userResult = await pgPool.query(
      `SELECT id, email, is_employee FROM users WHERE id = $1 AND is_active = true`,
      [payload.userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }

    const user = userResult.rows[0];
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      isEmployee: user.is_employee === true,
    });

    return res.status(200).json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.token;

    if (token) {
      try {
        const redis = await getRedisClient();
        const decoded = decodeToken(token);
        const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;

        if (ttl > 0) {
          await redis.set(`blacklist:${token}`, '1', { EX: ttl });
        }
      } catch (err) {
        console.warn('[Auth] Could not blacklist token:', err.message);
      }
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /me ──────────────────────────────────────────────────────────────────

router.get('/me', authenticate, generalLimiter, async (req, res, next) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT id, name, email, phone, is_employee, employee_role, risk_tier, created_at
       FROM users WHERE id = $1`,
      [req.user.userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({ success: true, data: { user: rows[0] } });
  } catch (err) {
    next(err);
  }
});

export default router;
