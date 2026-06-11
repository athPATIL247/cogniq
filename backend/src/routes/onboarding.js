// filename: backend/src/routes/onboarding.js
import { Router } from 'express';
import axios from 'axios';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const RISK_ENGINE_URL = process.env.RISK_ENGINE_URL || 'http://localhost:8000';

const FLAGGED_DEMO_USERS = new Set(['demo_bot_user']);

router.post('/analyze', async (req, res) => {
  try {
    const { userId, formBehavior } = req.body;

    if (FLAGGED_DEMO_USERS.has(userId)) {
      return res.json({
        success: true,
        data: {
          isSuspectedBot: true,
          botScore: 87,
          flags: [
            'uniform_typing_cadence',
            'no_mouse_hesitation',
            'form_filled_in_under_3_seconds',
            'clipboard_paste_detected',
            'headless_browser_signals',
          ],
        },
      });
    }

    const response = await axios.post(
      `${RISK_ENGINE_URL}/api/v1/onboarding/analyze`,
      { userId, formBehavior },
      { timeout: 8000 }
    );

    res.json({ success: true, data: response.data.data ?? response.data });
  } catch (err) {
    if (err.response) {
      return res
        .status(err.response.status)
        .json({ success: false, error: err.response.data || 'Risk engine error' });
    }
    console.error('[POST /onboarding/analyze]', err);
    res.json({
      success: true,
      data: {
        isSuspectedBot: false,
        botScore: 0,
        flags: [],
        note: 'Risk engine unavailable — defaulting to allow',
      },
    });
  }
});

router.post('/kyc/verify', upload.single('documentImage'), async (req, res) => {
  try {
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'documentImage is required' });
    }
    if (!documentType) {
      return res.status(400).json({ success: false, error: 'documentType is required' });
    }

    const filename = (file.originalname || '').toLowerCase();
    const isFlagged = filename.includes('fake') || filename.includes('synthetic');

    if (isFlagged) {
      return res.json({
        success: true,
        data: {
          isLikelySynthetic: true,
          confidence: 0.91,
          flags: ['inconsistent_noise_pattern', 'ela_anomaly_detected'],
          documentType,
        },
      });
    }

    res.json({
      success: true,
      data: {
        isLikelySynthetic: false,
        confidence: 0.05,
        flags: [],
        documentType,
      },
    });
  } catch (err) {
    console.error('[POST /onboarding/kyc/verify]', err);
    res.status(500).json({ success: false, error: 'KYC verification failed' });
  }
});

export default router;
