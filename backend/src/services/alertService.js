// filename: backend/src/services/alertService.js
import { pgPool } from '../config/database.js';
import { emitRiskEvent } from '../websocket/socketServer.js';

export function getSeverityFromScore(riskScore) {
  if (riskScore < 35) return 'low';
  if (riskScore < 60) return 'medium';
  if (riskScore < 80) return 'high';
  return 'critical';
}

export async function getAlerts({ status, severity, limit = 50 } = {}) {
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (severity) {
    params.push(severity);
    conditions.push(`a.severity = $${params.length}`);
  }

  params.push(limit);
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      a.id,
      a.severity,
      a.status,
      a.description,
      a.risk_factors,
      a.created_at,
      a.resolved_at,
      a.resolved_by,
      u.id        AS user_id,
      u.name      AS user_name,
      u.email     AS user_email,
      u.risk_tier AS user_risk_tier
    FROM alerts a
    JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${params.length}
  `;

  const result = await pgPool.query(query, params);

  return result.rows.map(row => ({
    id: row.id,
    severity: row.severity,
    status: row.status,
    description: row.description,
    riskFactors: row.risk_factors,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      riskTier: row.user_risk_tier,
    },
  }));
}

export async function getAlertById(alertId) {
  const query = `
    SELECT
      a.id,
      a.severity,
      a.status,
      a.description,
      a.risk_factors,
      a.created_at,
      a.resolved_at,
      a.resolved_by,
      u.id        AS user_id,
      u.name      AS user_name,
      u.email     AS user_email,
      u.risk_tier AS user_risk_tier
    FROM alerts a
    JOIN users u ON a.user_id = u.id
    WHERE a.id = $1
    LIMIT 1
  `;

  const result = await pgPool.query(query, [alertId]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    severity: row.severity,
    status: row.status,
    description: row.description,
    riskFactors: row.risk_factors,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      riskTier: row.user_risk_tier,
    },
  };
}

export async function createAlert({ userId, severity, description, riskFactors }) {
  const result = await pgPool.query(
    `INSERT INTO alerts (user_id, severity, status, description, risk_factors, created_at)
     VALUES ($1, $2, 'active', $3, $4, NOW())
     RETURNING *`,
    [userId, severity, description, JSON.stringify(riskFactors || [])]
  );

  const alert = result.rows[0];

  try {
    emitRiskEvent('risk:alert_created', {
      alertId: alert.id,
      userId,
      severity,
      description,
      createdAt: alert.created_at,
    });
  } catch (wsErr) {
    console.warn('[alertService] WebSocket emit failed (createAlert):', wsErr.message);
  }

  return alert;
}

export async function updateAlertStatus(alertId, status, resolvedBy) {
  const resolvedAt = status === 'resolved' ? 'NOW()' : 'NULL';

  const result = await pgPool.query(
    `UPDATE alerts
     SET status = $1,
         resolved_at = ${resolvedAt},
         resolved_by = $2
     WHERE id = $3
     RETURNING *`,
    [status, resolvedBy || null, alertId]
  );

  if (result.rows.length === 0) return null;

  const alert = result.rows[0];

  try {
    emitRiskEvent('risk:alert_updated', {
      alertId: alert.id,
      status: alert.status,
      resolvedAt: alert.resolved_at,
      resolvedBy: alert.resolved_by,
    });
  } catch (wsErr) {
    console.warn('[alertService] WebSocket emit failed (updateAlertStatus):', wsErr.message);
  }

  return alert;
}
