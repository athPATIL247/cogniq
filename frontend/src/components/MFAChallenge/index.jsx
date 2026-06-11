// filename: frontend/src/components/MFAChallenge/index.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mfaVerify } from '../../services/api';
import { ShieldAlert, Smartphone } from 'lucide-react';

// ─── OTP sub-component ────────────────────────────────────────────────────────
function OTPInput({ onSuccess, onCancel, sessionToken }) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleDigitChange = (i, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[i] = value.slice(-1);
    setDigits(next);
    if (value && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = digits.join('');
    if (code.length < 6) return;
    setLoading(true);
    setError(false);
    try {
      const result = await mfaVerify({ sessionToken, code });
      onSuccess(result);
    } catch {
      setError(true);
      setShakeKey((k) => k + 1);
      setDigits(Array(6).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <ShieldAlert size={32} color="#6366f1" />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Two-Factor Verification</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>Enter the 6-digit code sent to your device</p>
      </div>

      <motion.div
        key={shakeKey}
        animate={error ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', gap: '8px' }}
        onPaste={handlePaste}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{
              width: '44px', height: '56px', textAlign: 'center',
              fontSize: '20px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace",
              borderRadius: '8px',
              border: `2px solid ${error ? '#ef4444' : d ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
              background: error ? 'rgba(239,68,68,0.1)' : d ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
              color: '#f1f5f9', outline: 'none', transition: 'all 0.2s',
            }}
          />
        ))}
      </motion.div>

      {error && <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>Incorrect code. Please try again.</p>}

      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
        Demo code: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>123456</span>
      </p>

      <button
        onClick={handleSubmit}
        disabled={loading || digits.join('').length < 6}
        style={{
          width: '100%', padding: '12px', borderRadius: '8px',
          background: loading || digits.join('').length < 6 ? 'rgba(99,102,241,0.3)' : '#6366f1',
          color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer',
          fontSize: '15px', transition: 'all 0.2s',
        }}
      >
        {loading ? 'Verifying…' : 'Verify Code'}
      </button>

      <button
        disabled={resendCooldown > 0}
        onClick={() => setResendCooldown(30)}
        style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? '#64748b' : '#6366f1', cursor: 'pointer', fontSize: '14px' }}
      >
        {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
      </button>

      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>
        Cancel
      </button>
    </div>
  );
}

// ─── Push sub-component ───────────────────────────────────────────────────────
function PushApproval({ onSuccess, onCancel, sessionToken }) {
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setApproved(true);
      setTimeout(async () => {
        try {
          const result = await mfaVerify({ sessionToken, code: '123456' });
          onSuccess(result);
        } catch {
          onSuccess({ data: { accessToken: 'demo-token', refreshToken: 'demo-refresh' } });
        }
      }, 800);
    }, 3000);
    return () => clearTimeout(t);
  }, [onSuccess, sessionToken]);

  const handleApproveHere = async () => {
    try {
      const result = await mfaVerify({ sessionToken, code: '123456' });
      onSuccess(result);
    } catch {
      onSuccess({ data: { accessToken: 'demo-token', refreshToken: 'demo-refresh' } });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center' }}>
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Smartphone size={64} color="#6366f1" />
        </div>
      </motion.div>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Approve on your phone</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
          Tap <span style={{ color: '#a5b4fc', fontWeight: '500' }}>"Yes, it's me"</span> on your device
        </p>
      </div>

      {!approved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px' }}>
          <motion.div
            style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          Waiting for approval…
        </div>
      ) : (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: '#22c55e', fontWeight: '600', fontSize: '16px' }}>
          ✓ Approved!
        </motion.div>
      )}

      <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
        <button onClick={handleApproveHere} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '14px' }}>
          Approve here instead →
        </button>
      </div>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>
        Cancel
      </button>
    </div>
  );
}

// ─── Main MFAChallenge ────────────────────────────────────────────────────────
export default function MFAChallenge({ type = 'otp', sessionToken, onSuccess, onCancel }) {
  return (
    <AnimatePresence>
      <motion.div
        style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          style={{ position: 'relative', width: '100%', maxWidth: '380px', margin: '0 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: '#12121f', padding: '32px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          {onCancel && (
            <button
              onClick={onCancel}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}
            >
              ×
            </button>
          )}
          {type === 'otp' && <OTPInput onSuccess={onSuccess} onCancel={onCancel} sessionToken={sessionToken} />}
          {type === 'push' && <PushApproval onSuccess={onSuccess} onCancel={onCancel} sessionToken={sessionToken} />}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
