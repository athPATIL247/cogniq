// filename: backend/src/routes/transaction.js
import { Router } from 'express';
import { authenticate, requireEmployee } from '../middleware/authMiddleware.js';
import { pgPool } from '../config/database.js';
import { scoreTransaction } from '../services/riskOrchestratorService.js';

const router = Router();

router.use(authenticate);

function statusFromRisk(riskScore) {
  if (riskScore > 85) return 'blocked';
  if (riskScore >= 70) return 'pending_verification';
  return 'completed';
}

router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;

    const [dataRes, countRes] = await Promise.all([
      pgPool.query(
        `SELECT
           id, amount, merchant, category, channel,
           status, risk_score, flagged, timestamp
         FROM transactions
         WHERE user_id = $1
         ORDER BY timestamp DESC
         LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      ),
      pgPool.query(
        `SELECT COUNT(*)::int AS total FROM transactions WHERE user_id = $1`,
        [req.user.id]
      ),
    ]);

    res.json({
      success: true,
      data: {
        transactions: dataRes.rows,
        pagination: {
          page,
          limit,
          total: countRes.rows[0]?.total ?? 0,
          totalPages: Math.ceil((countRes.rows[0]?.total ?? 0) / limit),
        },
      },
    });
  } catch (err) {
    console.error('[GET /transactions]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { amount, merchant, category, channel } = req.body;

    if (amount === undefined || !merchant) {
      return res.status(400).json({ success: false, error: 'amount and merchant are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }

    const riskResult = await scoreTransaction({
      userId: req.user.id,
      deviceFingerprint: req.headers['x-device-fingerprint'] || null,
      amount: parsedAmount,
      merchant,
      category: category || 'general',
      channel: channel || 'online',
      ipAddress: req.ip,
    });

    const { riskScore, riskLevel, riskFactors, recommendedAction, explanation } = riskResult;
    const status = statusFromRisk(riskScore);
    const flagged = riskScore >= 70;

    let txRow;
    try {
      const insertRes = await pgPool.query(
        `INSERT INTO transactions
           (user_id, amount, merchant, category, channel, status, risk_score, flagged, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          req.user.id,
          parsedAmount,
          merchant,
          category || 'general',
          channel || 'online',
          status,
          riskScore,
          flagged,
        ]
      );
      txRow = insertRes.rows[0];
    } catch (dbErr) {
      console.error('[POST /transactions] DB insert failed:', dbErr.message);
      return res.status(500).json({ success: false, error: 'Failed to save transaction' });
    }

    res.status(201).json({
      success: true,
      data: {
        transaction: txRow,
        riskAssessment: {
          riskScore,
          riskLevel,
          riskFactors,
          recommendedAction,
          explanation,
        },
      },
    });
  } catch (err) {
    console.error('[POST /transactions]', err);
    res.status(500).json({ success: false, error: 'Failed to create transaction' });
  }
});

router.get('/all', requireEmployee, async (req, res) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit   = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset  = (page - 1) * limit;
    const flaggedFilter = req.query.flagged === 'true';

    const filterParams  = [];
    const conditions    = [];

    if (req.query.flagged !== undefined) {
      filterParams.push(flaggedFilter);
      conditions.push(`t.flagged = $${filterParams.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const filterCount   = filterParams.length;
    const dataParams    = [...filterParams, limit, offset];
    const limitPlaceholder  = `$${filterCount + 1}`;
    const offsetPlaceholder = `$${filterCount + 2}`;

    const [dataRes, countRes] = await Promise.all([
      pgPool.query(
        `SELECT
           t.id, t.amount, t.merchant, t.category, t.channel,
           t.status, t.risk_score, t.flagged, t.timestamp,
           u.id    AS user_id,
           u.name  AS user_name,
           u.email AS user_email
         FROM transactions t
         JOIN users u ON t.user_id = u.id
         ${whereClause}
         ORDER BY t.timestamp DESC
         LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        dataParams
      ),
      pgPool.query(
        `SELECT COUNT(*)::int AS total FROM transactions t ${whereClause}`,
        filterParams
      ),
    ]);

    const transactions = dataRes.rows.map(row => ({
      id: row.id,
      amount: row.amount,
      merchant: row.merchant,
      category: row.category,
      channel: row.channel,
      status: row.status,
      riskScore: row.risk_score,
      flagged: row.flagged,
      timestamp: row.timestamp,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
      },
    }));

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total: countRes.rows[0]?.total ?? 0,
          totalPages: Math.ceil((countRes.rows[0]?.total ?? 0) / limit),
        },
      },
    });
  } catch (err) {
    console.error('[GET /transactions/all]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch all transactions' });
  }
});

export default router;
