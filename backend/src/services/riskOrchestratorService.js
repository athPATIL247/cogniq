// filename: backend/src/services/riskOrchestratorService.js
import axios from 'axios';
import { pgPool } from '../config/database.js';
import { emitRiskEvent } from '../websocket/socketServer.js';

const RISK_ENGINE_URL = process.env.RISK_ENGINE_URL || 'http://localhost:8000';

export async function scoreAction({
  userId,
  deviceFingerprint,
  deviceTrustScore,
  action,
  context,
  behavioralSnapshot,
  transactionContext,
  userBaseline,
}) {
  try {
    const payload = {
      userId,
      deviceFingerprint: deviceFingerprint || "",
      deviceTrustScore: deviceTrustScore ?? 1.0,
      action,
      context: context || { ipAddress: "0.0.0.0" },
      behavioralSnapshot: behavioralSnapshot || null,
      transactionContext: transactionContext || null,
      userBaseline: userBaseline || null,
    };

    const response = await axios.post(
      `${RISK_ENGINE_URL}/api/v1/risk/score`,
      payload,
      { timeout: 5000 }
    );

    const riskData = response.data?.data || response.data;
    const { riskScore, riskLevel, riskFactors, recommendedAction, explanation } = riskData;

    return {
      riskScore: riskScore ?? 0,
      riskLevel: riskLevel ?? 'low',
      riskFactors: riskFactors ?? [],
      recommendedAction: recommendedAction ?? 'allow',
      explanation: explanation ?? '',
    };
  } catch (err) {
    console.warn('[riskOrchestratorService] scoreAction failed, using fallback:', err.message);
    return {
      riskScore: 25,
      riskLevel: 'low',
      riskFactors: [],
      recommendedAction: 'allow',
      explanation: 'Risk engine unavailable',
    };
  }
}

export async function getTemporalRisk(userId) {
  try {
    const response = await axios.get(
      `${RISK_ENGINE_URL}/api/v1/risk/history/${userId}`,
      { timeout: 5000 }
    );
    return response.data?.data?.accumulatedRisk ?? response.data?.accumulatedRisk ?? 0;
  } catch (err) {
    console.warn('[riskOrchestratorService] getTemporalRisk failed:', err.message);
    return 0;
  }
}

export async function scoreTransaction({
  userId,
  deviceFingerprint,
  amount,
  merchant,
  category,
  channel,
  ipAddress,
}) {
  const transactionContext = { amount, merchant, category, channel };
  const context = {
    transactionAmount: amount,
    merchant,
    category,
    channel,
    ipAddress: ipAddress || null,
  };

  const result = await scoreAction({
    userId,
    deviceFingerprint: deviceFingerprint || "",
    deviceTrustScore: 1.0,
    action: 'transaction',
    context: {
      ipAddress: ipAddress || "0.0.0.0",
    },
    transactionContext,
  });

  const { riskScore, riskLevel, riskFactors, recommendedAction, explanation } = result;

  let deviceId = null;
  if (deviceFingerprint) {
    try {
      const devRes = await pgPool.query(
        'SELECT id FROM devices WHERE device_fingerprint = $1 AND user_id = $2 LIMIT 1',
        [deviceFingerprint, userId]
      );
      if (devRes.rows.length > 0) deviceId = devRes.rows[0].id;
    } catch (_) {}
  }

  let eventRow;
  try {
    const insertEvent = await pgPool.query(
      `INSERT INTO risk_events
         (user_id, device_id, event_type, risk_score, risk_factors, action_taken, ip_address, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        userId,
        deviceId,
        'transaction',
        riskScore,
        JSON.stringify(riskFactors),
        recommendedAction,
        ipAddress || null,
      ]
    );
    eventRow = insertEvent.rows[0];
  } catch (dbErr) {
    console.error('[riskOrchestratorService] Failed to insert risk_event:', dbErr.message);
  }

  if (riskScore > 70 && eventRow) {
    try {
      const { getSeverityFromScore, createAlert } = await import('./alertService.js');
      const severity = getSeverityFromScore(riskScore);
      await createAlert({
        userId,
        severity,
        description: `High-risk transaction detected: ${merchant} — ${explanation}`,
        riskFactors,
      });
    } catch (alertErr) {
      console.warn('[riskOrchestratorService] Failed to create alert:', alertErr.message);
    }
  }

  try {
    emitRiskEvent('risk:new_event', {
      userId,
      riskScore,
      riskLevel,
      riskFactors,
      recommendedAction,
      action: 'transaction',
      eventId: eventRow?.id || null,
      timestamp: eventRow?.timestamp || new Date().toISOString(),
    });
  } catch (wsErr) {
    console.warn('[riskOrchestratorService] WebSocket emit failed:', wsErr.message);
  }

  return {
    riskScore,
    riskLevel,
    riskFactors,
    recommendedAction,
    explanation,
    eventId: eventRow?.id || null,
  };
}
