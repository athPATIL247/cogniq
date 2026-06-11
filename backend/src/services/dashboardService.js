// filename: backend/src/services/dashboardService.js
import { pgPool } from '../config/database.js';

export async function getStats() {
  const [
    activeAlertsRes,
    blockedTodayRes,
    totalUsersRes,
    avgRiskRes,
    distributionRes,
    riskFactorsRes,
    recentBlocksRes,
  ] = await Promise.all([
    pgPool.query(`SELECT COUNT(*)::int AS count FROM alerts WHERE status = 'active'`),
    pgPool.query(
      `SELECT COUNT(*)::int AS count
       FROM risk_events
       WHERE action_taken = 'block'
         AND timestamp > NOW() - INTERVAL '24 hours'`
    ),
    pgPool.query(`SELECT COUNT(*)::int AS count FROM users`),
    pgPool.query(
      `SELECT COALESCE(ROUND(AVG(risk_score)::numeric, 2), 0) AS avg
       FROM risk_events
       WHERE timestamp > NOW() - INTERVAL '24 hours'`
    ),
    pgPool.query(
      `SELECT
         SUM(CASE WHEN risk_score < 35  THEN 1 ELSE 0 END)::int AS low,
         SUM(CASE WHEN risk_score >= 35 AND risk_score < 60  THEN 1 ELSE 0 END)::int AS medium,
         SUM(CASE WHEN risk_score >= 60 AND risk_score < 80  THEN 1 ELSE 0 END)::int AS high,
         SUM(CASE WHEN risk_score >= 80 THEN 1 ELSE 0 END)::int AS critical
       FROM risk_events
       WHERE timestamp > NOW() - INTERVAL '24 hours'`
    ),
    pgPool.query(
      `SELECT factor_name, COUNT(*)::int AS count
       FROM risk_events,
            jsonb_array_elements_text(risk_factors) AS factor_name
       WHERE timestamp > NOW() - INTERVAL '24 hours'
       GROUP BY factor_name
       ORDER BY count DESC
       LIMIT 5`
    ),
    pgPool.query(
      `SELECT
         re.id,
         re.event_type,
         re.risk_score,
         re.risk_factors,
         re.action_taken,
         re.ip_address,
         re.timestamp,
         u.id    AS user_id,
         u.name  AS user_name,
         u.email AS user_email
       FROM risk_events re
       JOIN users u ON re.user_id = u.id
       WHERE re.action_taken = 'block'
       ORDER BY re.timestamp DESC
       LIMIT 5`
    ),
  ]);

  const dist = distributionRes.rows[0] || { low: 0, medium: 0, high: 0, critical: 0 };

  return {
    activeAlerts: activeAlertsRes.rows[0]?.count ?? 0,
    blockedToday: blockedTodayRes.rows[0]?.count ?? 0,
    totalUsersMonitored: totalUsersRes.rows[0]?.count ?? 0,
    avgRiskScore: parseFloat(avgRiskRes.rows[0]?.avg ?? 0),
    riskScoreDistribution: {
      low: dist.low ?? 0,
      medium: dist.medium ?? 0,
      high: dist.high ?? 0,
      critical: dist.critical ?? 0,
    },
    topRiskFactors: riskFactorsRes.rows.map(r => ({
      factor: r.factor_name,
      count: r.count,
    })),
    recentBlocks: recentBlocksRes.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      riskScore: row.risk_score,
      riskFactors: row.risk_factors,
      actionTaken: row.action_taken,
      ipAddress: row.ip_address,
      timestamp: row.timestamp,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
      },
    })),
  };
}

export async function getUserTimeline(userId, days = 30) {
  const result = await pgPool.query(
    `SELECT
       timestamp,
       risk_score   AS "riskScore",
       action_taken AS action,
       event_type   AS "eventType",
       CASE
         WHEN risk_score < 35 THEN 'low'
         WHEN risk_score < 60 THEN 'medium'
         WHEN risk_score < 80 THEN 'high'
         ELSE 'critical'
       END AS "riskLevel"
     FROM risk_events
     WHERE user_id = $1
       AND timestamp > NOW() - ($2 || ' days')::INTERVAL
     ORDER BY timestamp ASC`,
    [userId, days]
  );

  return result.rows;
}

export function getEntityGraphData() {
  const nodes = [
    { id: 'emp_1', label: 'Amit Kumar (Manager)', type: 'employee', suspicious: false },
    { id: 'emp_2', label: 'Priya Desai (Teller)', type: 'employee', suspicious: false },
    { id: 'emp_3', label: 'Ravi Nair (Teller)',   type: 'employee', suspicious: true  },
    { id: 'acc_1', label: 'Account #1001', type: 'account', suspicious: false },
    { id: 'acc_2', label: 'Account #1002', type: 'account', suspicious: false },
    { id: 'acc_3', label: 'Account #1003', type: 'account', suspicious: false },
    { id: 'acc_4', label: 'Account #1004', type: 'account', suspicious: false },
    { id: 'acc_5', label: 'Account #1005', type: 'account', suspicious: false },
    { id: 'acc_6', label: 'Account #1006', type: 'account', suspicious: false },
    { id: 'acc_7', label: 'Account #1007', type: 'account', suspicious: false },
    { id: 'acc_8', label: 'Account #1008', type: 'account', suspicious: false },
    { id: 'acc_9',  label: 'Account #2001', type: 'account', suspicious: true },
    { id: 'acc_10', label: 'Account #2002', type: 'account', suspicious: true },
    { id: 'acc_11', label: 'Account #2003', type: 'account', suspicious: true },
    { id: 'acc_12', label: 'Account #2004', type: 'account', suspicious: true },
    { id: 'acc_13', label: 'Account #2005', type: 'account', suspicious: true },
    { id: 'acc_14', label: 'Account #2006', type: 'account', suspicious: true },
    { id: 'acc_15', label: 'Account #2007', type: 'account', suspicious: true },
  ];

  const edges = [
    { source: 'emp_1', target: 'acc_1', label: 'accessed', suspicious: false },
    { source: 'emp_1', target: 'acc_2', label: 'accessed', suspicious: false },
    { source: 'emp_1', target: 'acc_3', label: 'accessed', suspicious: false },
    { source: 'emp_2', target: 'acc_4', label: 'accessed', suspicious: false },
    { source: 'emp_2', target: 'acc_5', label: 'accessed', suspicious: false },
    { source: 'emp_2', target: 'acc_6', label: 'accessed', suspicious: false },
    { source: 'emp_2', target: 'acc_7', label: 'accessed', suspicious: false },
    { source: 'emp_3', target: 'acc_3', label: 'accessed', suspicious: false },
    { source: 'emp_3', target: 'acc_6', label: 'accessed', suspicious: false },
    { source: 'emp_3', target: 'acc_7', label: 'accessed', suspicious: false },
    { source: 'emp_3', target: 'acc_8', label: 'accessed', suspicious: false },
    { source: 'emp_3', target: 'acc_1', label: 'accessed', suspicious: false },
    { source: 'emp_3', target: 'acc_9',  label: 'accessed', suspicious: true },
    { source: 'emp_3', target: 'acc_10', label: 'accessed', suspicious: true },
    { source: 'emp_3', target: 'acc_11', label: 'accessed', suspicious: true },
    { source: 'emp_3', target: 'acc_12', label: 'accessed', suspicious: true },
    { source: 'emp_3', target: 'acc_13', label: 'accessed', suspicious: true },
    { source: 'emp_3', target: 'acc_14', label: 'accessed', suspicious: true },
    { source: 'emp_3', target: 'acc_15', label: 'accessed', suspicious: true },
  ];

  return {
    nodes,
    edges,
    highlightedNode: 'emp_3',
    anomalyDescription:
      'Ravi Nair accessed 12 accounts at 11:47 PM — 9 of which were never accessed before',
  };
}
