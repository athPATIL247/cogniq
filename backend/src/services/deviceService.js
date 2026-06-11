// filename: backend/src/services/deviceService.js
import { pgPool } from '../config/database.js';

export async function registerDevice(userId, { fingerprint, deviceName, os, browser }) {
  const upsertQuery = `
    INSERT INTO devices (user_id, device_fingerprint, device_name, os, browser, trust_score, first_seen, last_seen, is_trusted, is_active)
    VALUES ($1, $2, $3, $4, $5, 0.1, NOW(), NOW(), false, true)
    ON CONFLICT (user_id, device_fingerprint)
    DO UPDATE SET
      device_name = EXCLUDED.device_name,
      os          = EXCLUDED.os,
      browser     = EXCLUDED.browser,
      last_seen   = NOW()
    RETURNING *
  `;

  const { rows } = await pgPool.query(upsertQuery, [
    userId,
    fingerprint,
    deviceName || 'Unknown Device',
    os || 'Unknown OS',
    browser || 'Unknown Browser',
  ]);

  return rows[0];
}

export async function getDeviceTrustScore(fingerprint) {
  if (!fingerprint) return 0;

  const { rows } = await pgPool.query(
    `SELECT trust_score FROM devices
     WHERE device_fingerprint = $1 AND is_active = true
     ORDER BY trust_score DESC
     LIMIT 1`,
    [fingerprint],
  );

  if (rows.length === 0) return 0;
  return parseFloat(rows[0].trust_score) || 0;
}

export async function updateDeviceTrustScore(deviceId, newScore) {
  const clamped = Math.min(1, Math.max(0, newScore));

  const { rows } = await pgPool.query(
    `UPDATE devices
     SET trust_score = $1, last_seen = NOW()
     WHERE id = $2 AND is_active = true
     RETURNING *`,
    [clamped, deviceId],
  );

  return rows[0] || null;
}

export async function markDeviceTrusted(deviceId) {
  const { rows } = await pgPool.query(
    `UPDATE devices
     SET is_trusted = true, trust_established_at = NOW(), trust_score = GREATEST(trust_score, 0.8), last_seen = NOW()
     WHERE id = $1 AND is_active = true
     RETURNING *`,
    [deviceId],
  );

  return rows[0] || null;
}

export async function getDevicesForUser(userId) {
  const { rows } = await pgPool.query(
    `SELECT id, device_fingerprint, device_name, os, browser,
            trust_score, first_seen, last_seen, is_trusted, trust_established_at
     FROM devices
     WHERE user_id = $1 AND is_active = true
     ORDER BY last_seen DESC`,
    [userId],
  );

  return rows;
}
