// filename: backend/src/routes/dashboard.js
import { Router } from 'express';
import { authenticate, requireEmployee } from '../middleware/authMiddleware.js';
import { pgPool } from '../config/database.js';
import { getStats, getUserTimeline, getEntityGraphData } from '../services/dashboardService.js';
import {
  getAlerts,
  getAlertById,
  updateAlertStatus,
} from '../services/alertService.js';

const router = Router();

router.use(authenticate, requireEmployee);

router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[GET /dashboard/stats]', err);
    res.status(500).json({ success: false, error: 'Failed to load stats' });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const { status, severity, limit } = req.query;
    const alerts = await getAlerts({
      status: status || undefined,
      severity: severity || undefined,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[GET /dashboard/alerts]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

router.get('/alerts/:alertId', async (req, res) => {
  try {
    const alert = await getAlertById(req.params.alertId);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    res.json({ success: true, data: alert });
  } catch (err) {
    console.error('[GET /dashboard/alerts/:alertId]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch alert' });
  }
});

router.patch('/alerts/:alertId', async (req, res) => {
  try {
    const { status, resolvedBy } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const validStatuses = ['active', 'investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updated = await updateAlertStatus(
      req.params.alertId,
      status,
      resolvedBy || req.user?.email || null
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PATCH /dashboard/alerts/:alertId]', err);
    res.status(500).json({ success: false, error: 'Failed to update alert' });
  }
});

router.get('/users/:userId/timeline', async (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const timeline = await getUserTimeline(req.params.userId, days);
    res.json({ success: true, data: timeline });
  } catch (err) {
    console.error('[GET /dashboard/users/:userId/timeline]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user timeline' });
  }
});

router.get('/graph', (_req, res) => {
  try {
    const graphData = getEntityGraphData();
    res.json({ success: true, data: graphData });
  } catch (err) {
    console.error('[GET /dashboard/graph]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch graph data' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
    const offset = (page - 1) * limit;

    const [dataRes, countRes] = await Promise.all([
      pgPool.query(
        `SELECT
           u.id,
           u.name,
           u.email,
           u.phone,
           u.is_employee,
           u.employee_role,
           u.risk_tier,
           COUNT(DISTINCT d.id)::int              AS device_count,
           (
             SELECT re.risk_score
             FROM risk_events re
             WHERE re.user_id = u.id
             ORDER BY re.timestamp DESC
             LIMIT 1
           ) AS latest_risk_score,
           (
             SELECT re.timestamp
             FROM risk_events re
             WHERE re.user_id = u.id
             ORDER BY re.timestamp DESC
             LIMIT 1
           ) AS last_activity
         FROM users u
         LEFT JOIN devices d ON d.user_id = u.id
         GROUP BY u.id
         ORDER BY u.name ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pgPool.query(`SELECT COUNT(*)::int AS total FROM users`),
    ]);

    res.json({
      success: true,
      data: {
        users: dataRes.rows,
        pagination: {
          page,
          limit,
          total: countRes.rows[0]?.total ?? 0,
          totalPages: Math.ceil((countRes.rows[0]?.total ?? 0) / limit),
        },
      },
    });
  } catch (err) {
    console.error('[GET /dashboard/users]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
    const { rows } = await pgPool.query(
      `SELECT
         re.id,
         re.event_type       AS "actionType",
         re.risk_score       AS "riskScore",
         re.risk_factors     AS "factors",
         re.action_taken     AS "action",
         re.ip_address       AS "ipAddress",
         re.timestamp,
         u.email             AS "email"
       FROM risk_events re
       JOIN users u ON re.user_id = u.id
       ORDER BY re.timestamp DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET /dashboard/events]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard events' });
  }
});

export default router;
