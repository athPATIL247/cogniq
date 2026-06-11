// filename: backend/src/routes/risk.js
import { Router } from 'express';
import axios from 'axios';
import { authenticate, requireEmployee } from '../middleware/authMiddleware.js';
import { pgPool } from '../config/database.js';
import {
  scoreAction,
  scoreTransaction,
} from '../services/riskOrchestratorService.js';

const router = Router();
const RISK_ENGINE_URL = process.env.RISK_ENGINE_URL || 'http://localhost:8000';

router.post('/score', authenticate, async (req, res) => {
  try {
    const {
      userId,
      deviceFingerprint,
      deviceTrustScore,
      action,
      context,
      behavioralSnapshot,
      transactionContext,
      userBaseline,
    } = req.body;

    const resolvedUserId = userId || req.user?.id;

    const result = await scoreAction({
      userId: resolvedUserId,
      deviceFingerprint,
      deviceTrustScore,
      action: action || 'generic',
      context,
      behavioralSnapshot,
      transactionContext,
      userBaseline,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[POST /risk/score]', err);
    res.status(500).json({ success: false, error: 'Failed to score action' });
  }
});

router.post('/transaction', authenticate, async (req, res) => {
  try {
    const { amount, merchant, category, channel } = req.body;

    if (amount === undefined || !merchant) {
      return res.status(400).json({ success: false, error: 'amount and merchant are required' });
    }

    const result = await scoreTransaction({
      userId: req.user.id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || null,
      amount: parseFloat(amount),
      merchant,
      category: category || 'general',
      channel: channel || 'online',
      ipAddress: req.ip,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[POST /risk/transaction]', err);
    res.status(500).json({ success: false, error: 'Failed to score transaction' });
  }
});

router.get('/history/:userId', authenticate, requireEmployee, async (req, res) => {
  try {
    const { userId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
    const offset = (page - 1) * limit;

    const [dataRes, countRes] = await Promise.all([
      pgPool.query(
        `SELECT
           re.id,
           re.event_type,
           re.risk_score,
           re.risk_factors,
           re.action_taken,
           re.ip_address,
           re.timestamp,
           d.device_name,
           d.trust_score AS device_trust_score
         FROM risk_events re
         LEFT JOIN devices d ON re.device_id = d.id
         WHERE re.user_id = $1
         ORDER BY re.timestamp DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      pgPool.query(
        `SELECT COUNT(*)::int AS total FROM risk_events WHERE user_id = $1`,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        events: dataRes.rows,
        pagination: {
          page,
          limit,
          total: countRes.rows[0]?.total ?? 0,
          totalPages: Math.ceil((countRes.rows[0]?.total ?? 0) / limit),
        },
      },
    });
  } catch (err) {
    console.error('[GET /risk/history/:userId]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch risk history' });
  }
});

router.post('/behavioral/update', authenticate, async (req, res) => {
  try {
    const { sample } = req.body;

    if (!Array.isArray(sample) || sample.length !== 10) {
      return res
        .status(400)
        .json({ success: false, error: 'sample must be an array of 10 floats' });
    }

    const payload = {
      userId: req.user.id,
      newSample: sample,
    };

    const response = await axios.post(
      `${RISK_ENGINE_URL}/api/v1/risk/behavioral/update`,
      payload,
      { timeout: 5000 }
    );

    res.json({ success: true, data: response.data });
  } catch (err) {
    if (err.response) {
      return res
        .status(err.response.status)
        .json({ success: false, error: err.response.data || 'Risk engine error' });
    }
    console.error('[POST /risk/behavioral/update]', err);
    res.status(502).json({ success: false, error: 'Risk engine unavailable' });
  }
});

export default router;
