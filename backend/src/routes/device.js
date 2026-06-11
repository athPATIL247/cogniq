// filename: backend/src/routes/device.js
import { Router } from 'express';
import { pgPool } from '../config/database.js';
import {
  registerDevice,
  getDevicesForUser,
  markDeviceTrusted,
} from '../services/deviceService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(authenticate);
router.use(generalLimiter);

router.post('/register', async (req, res, next) => {
  try {
    const { fingerprint, deviceName, os, browser } = req.body;

    if (!fingerprint) {
      return res.status(400).json({ success: false, error: 'Device fingerprint is required.' });
    }

    const device = await registerDevice(req.user.userId, {
      fingerprint,
      deviceName: deviceName || 'Unknown Device',
      os: os || 'Unknown OS',
      browser: browser || 'Unknown Browser',
    });

    return res.status(201).json({ success: true, data: { device } });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const devices = await getDevicesForUser(req.user.userId);
    return res.status(200).json({ success: true, data: { devices } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:deviceId/trust', async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    const { rows } = await pgPool.query(
      `SELECT id FROM devices WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [deviceId, req.user.userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Device not found.' });
    }

    const device = await markDeviceTrusted(deviceId);

    return res.status(200).json({ success: true, data: { device } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:deviceId', async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    const { rows } = await pgPool.query(
      `UPDATE devices
       SET is_active = false, last_seen = NOW()
       WHERE id = $1 AND user_id = $2 AND is_active = true
       RETURNING id`,
      [deviceId, req.user.userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Device not found.' });
    }

    return res.status(200).json({ success: true, message: 'Device removed successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
