// filename: frontend/src/pages/Login/index.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { login } from '../../services/api';
import { useBehavioralCapture } from '../../hooks/useBehavioralCapture';
import MFAChallenge from '../../components/MFAChallenge';
import { ShieldCheck, Ban } from 'lucide-react';

function generateFingerprint() {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 4,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [mfaState, setMfaState] = useState(null);
  const { captureRef, getSnapshot } = useBehavioralCapture();

  useEffect(() => {
    if (localStorage.getItem('tp_access_token')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');
    setBlocked(false);

    const deviceFingerprint = generateFingerprint();
    const behavioralSnapshot = getSnapshot();

    try {
      const res = await login({ email, password, deviceFingerprint, behavioralSnapshot });
      const data = res.data || res;

      if (data.blocked) {
        setBlocked(true);
        return;
      }

      if (data.requiresMFA) {
        setMfaState({
          type: data.mfaType || 'otp',
          sessionToken: data.sessionToken,
        });
        return;
      }

      // Direct login success
      if (data.accessToken) {
        localStorage.setItem('tp_access_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('tp_refresh_token', data.refreshToken);

        const user = data.user || {};
        if (user.isEmployee || user.is_employee) {
          navigate('/analyst');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = (result) => {
    const data = result?.data || result;
    if (data?.accessToken) {
      localStorage.setItem('tp_access_token', data.accessToken);
      if (data?.refreshToken) localStorage.setItem('tp_refresh_token', data.refreshToken);
    }
    const user = data?.user || {};
    if (user.isEmployee || user.is_employee) {
      navigate('/analyst');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div
      ref={captureRef}
      style={{
        minHeight: '100vh',
        background: '#0b0b14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '20px',
      }}
    >
      {/* Animated background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px', zIndex: 0,
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '420px',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: '48px', marginBottom: '16px', display: 'inline-block' }}
          >
            <ShieldCheck size={48} color="#6366f1" />
          </motion.div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>
            Cogniq
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
            Real-time Identity Trust Scoring
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}>
          {blocked ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <Ban size={48} color="#ef4444" />
              </div>
              <h2 style={{ color: '#ef4444', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>Access Blocked</h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>
                Our system has detected suspicious activity. Please contact your bank branch.
              </p>
              <button
                onClick={() => setBlocked(false)}
                style={{
                  padding: '10px 24px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', cursor: 'pointer', fontSize: '14px',
                }}
              >
                Try Again
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: '500', marginBottom: '8px', letterSpacing: '0.3px' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bank.com"
                  required
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f1f5f9', fontSize: '15px', outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: '500', marginBottom: '8px', letterSpacing: '0.3px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f1f5f9', fontSize: '15px', outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '14px' }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '13px', borderRadius: '8px', border: 'none',
                  background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: 'white', fontWeight: '600', fontSize: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.3)',
                }}
              >
                {loading && (
                  <motion.div
                    style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                {loading ? 'Authenticating…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Demo creds */}
          <div style={{ marginTop: '24px', padding: '12px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
            <p style={{ color: '#64748b', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: '600' }}>Demo Credentials</p>
            <div style={{ display: 'grid', gap: '4px' }}>
              {[
                { label: 'Customer', email: 'alice@demo.com', pw: 'password123' },
                { label: 'Analyst', email: 'ravi.analyst@bank.com', pw: 'password123' },
              ].map(({ label, email: demoEmail, pw }) => (
                <button
                  key={label}
                  onClick={() => { setEmail(demoEmail); setPassword(pw); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#6366f1', fontSize: '12px', textAlign: 'left', padding: '2px 0',
                    fontFamily: 'monospace',
                  }}
                >
                  {label}: {demoEmail} / {pw}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#475569', fontSize: '12px', marginTop: '24px' }}>
          🔒 Behavioral analysis active — your typing pattern is being monitored
        </p>
      </motion.div>

      {/* MFA Challenge */}
      {mfaState && (
        <MFAChallenge
          type={mfaState.type}
          sessionToken={mfaState.sessionToken}
          onSuccess={handleMFASuccess}
          onCancel={() => setMfaState(null)}
        />
      )}
    </div>
  );
}
