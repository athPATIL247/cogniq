// filename: frontend/src/pages/Login/index.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, Ban, ArrowRight, ArrowLeft, Fingerprint } from 'lucide-react';
import { login } from '../../services/api';
import { useBehavioralCapture } from '../../hooks/useBehavioralCapture';
import MFAChallenge from '../../components/MFAChallenge';

function generateFingerprint() {
  const data = [
    navigator.userAgent, navigator.language,
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
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [blocked, setBlocked]   = useState(false);
  const [mfaState, setMfaState] = useState(null);
  const [sessionApproved, setSessionApproved] = useState(null);
  
  const { captureRef, getSnapshot } = useBehavioralCapture();
  const canvasRef = useRef(null);

  // Background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.4);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(cx - Math.cos(angle) * 100, cy - Math.sin(angle) * 50, 400, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.03)';
      ctx.fill();

      angle += 0.005;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  const handleLogin = async (evt) => {
    evt.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError(''); setBlocked(false);
    try {
      const data = await login({
        email: email.trim().toLowerCase(), password,
        deviceFingerprint: generateFingerprint(),
        behavioralSnapshot: getSnapshot(),
      });
      const d = data?.data ?? data;
      if (d.blocked) { setBlocked(true); return; }
      if (d.requiresMFA) {
        setMfaState({ type: d.mfaType || 'otp', sessionToken: d.sessionToken });
        return;
      }
      if (d.accessToken) {
        localStorage.setItem('tp_access_token', d.accessToken);
        if (d.refreshToken) localStorage.setItem('tp_refresh_token', d.refreshToken);
        if (!d.requiresMFA && (d.riskScore ?? 50) < 50) {
          setSessionApproved({ riskScore: d.riskScore, factors: d.riskFactors });
          setTimeout(() => navigate(d.user?.isEmployee ? '/analyst' : '/dashboard', { replace: true }), 900);
        } else {
          navigate(d.user?.isEmployee ? '/analyst' : '/dashboard', { replace: true });
        }
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = (result) => {
    const d = result?.data ?? result;
    if (d?.accessToken) {
      localStorage.setItem('tp_access_token', d.accessToken);
      if (d?.refreshToken) localStorage.setItem('tp_refresh_token', d.refreshToken);
    }
    navigate(d?.user?.isEmployee ? '/analyst' : '/dashboard', { replace: true });
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '10px',
    background: '#111', border: '1px solid #222',
    color: '#f5f5f5', fontSize: '15px', outline: 'none',
    transition: 'all 0.2s', boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div ref={captureRef} style={{ 
      minHeight: '100vh', background: '#080808', 
      fontFamily: "'Inter', system-ui, sans-serif", color: '#f5f5f5', 
      position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Grid Overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(#1e1e1e 1px, transparent 1px)',
        backgroundSize: '32px 32px', opacity: 0.5
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1000px', display: 'flex', gap: '64px', padding: '40px' }}>
        
        {/* Left Side: Info & Marketing */}
        <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button onClick={() => navigate('/')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: 0,
            background: 'none', border: 'none', color: '#555', cursor: 'pointer',
            fontSize: '13px', fontWeight: '500', marginBottom: '64px', transition: 'color 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.color = '#a1a1a1'} onMouseLeave={e => e.currentTarget.style.color = '#555'}>
            <ArrowLeft size={16} /> Back to Home
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16,185,129,0.4)',
            }}>
              <ShieldCheck size={22} color="#080808" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '20px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px' }}>Cogniq</span>
          </div>

          <h1 style={{ fontSize: '42px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '20px' }}>
            Welcome to<br />
            <span style={{ color: '#10b981' }}>Secure Access.</span>
          </h1>
          <p style={{ color: '#a1a1a1', fontSize: '15px', lineHeight: 1.6, marginBottom: '48px' }}>
            Your session is protected by continuous behavioral analytics. Fraud is stopped before it happens.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
            {[
              'Invisible keystroke cadence checks',
              'Real-time device trust scoring',
              'Context-aware MFA triggers',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0, boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
                <span style={{ color: '#f5f5f5', fontSize: '14px', fontWeight: '500' }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Fingerprint size={16} color="#10b981" />
              <span style={{ color: '#10b981', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700' }}>
                Active Protection
              </span>
            </div>
            <p style={{ color: '#a1a1a1', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Our engine analyzes <strong style={{ color: '#f5f5f5' }}>120+ telemetry points</strong> in real time to guarantee your identity.
            </p>
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '100%', maxWidth: '480px', margin: '0 auto',
            background: 'rgba(15, 15, 15, 0.7)', backdropFilter: 'blur(24px)', 
            border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', 
            padding: '56px 48px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Subtle top glare */}
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />

            <AnimatePresence mode="wait">
              {blocked ? (
                <motion.div key="blocked" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(239,68,68,0.2)' }}>
                        <Ban size={40} color="#ef4444" />
                      </div>
                    </div>
                    <h2 style={{ fontSize: '26px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", color: '#ef4444', marginBottom: '16px' }}>Access Blocked</h2>
                    <p style={{ color: '#a1a1a1', fontSize: '15px', marginBottom: '32px', lineHeight: 1.6 }}>
                      Unusual behavioral patterns detected. Your session has been halted to protect your account.
                    </p>
                    <button onClick={() => setBlocked(false)} style={{
                      width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #222',
                      background: '#111', color: '#f5f5f5', cursor: 'pointer', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', transition: 'all 0.2s'
                    }} onMouseEnter={e=>e.currentTarget.style.background='#161616'} onMouseLeave={e=>e.currentTarget.style.background='#111'}>
                      Try Again
                    </button>
                  </div>
                </motion.div>
              ) : sessionApproved ? (
                <motion.div key="approved" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <ShieldCheck size={36} color="#10b981" />
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", color: '#10b981', marginBottom: '8px' }}>Identity Verified</h2>
                  <p style={{ color: '#a1a1a1', fontSize: '14px', marginBottom: '16px' }}>
                    Risk score <strong style={{ color: '#f5f5f5', fontFamily: "'JetBrains Mono', monospace" }}>{sessionApproved.riskScore?.toFixed?.(1) ?? sessionApproved.riskScore}</strong> — no MFA required
                  </p>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Redirecting to your portal…</div>
                </motion.div>
              ) : mfaState ? (
                <motion.div key="mfa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <MFAChallenge
                    type={mfaState.type}
                    sessionToken={mfaState.sessionToken}
                    onSuccess={handleMFASuccess}
                    onCancel={() => setMfaState(null)}
                  />
                </motion.div>
              ) : (
                <motion.div key="login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px', marginBottom: '8px' }}>Sign In</h2>
                  <p style={{ color: '#a1a1a1', fontSize: '15px', marginBottom: '40px' }}>
                    Log in to your secure portal.
                  </p>


                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#a1a1a1', fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
                        Email Address
                      </label>
                      <input type="email" value={email} required placeholder="you@example.com"
                        onChange={e => setEmail(e.target.value)}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = '#10b981'}
                        onBlur={e => e.target.style.borderColor = '#222'}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#a1a1a1', fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input type={showPw ? 'text' : 'password'} value={password} required placeholder="••••••••••"
                          onChange={e => setPassword(e.target.value)}
                          style={{ ...inputStyle, paddingRight: '48px' }}
                          onFocus={e => e.target.style.borderColor = '#10b981'}
                          onBlur={e => e.target.style.borderColor = '#222'}
                        />
                        <button type="button" onClick={() => setShowPw(p => !p)} style={{
                          position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: '#555',
                          display: 'flex', alignItems: 'center', transition: 'color 0.2s'
                        }} onMouseEnter={e=>e.currentTarget.style.color='#a1a1a1'} onMouseLeave={e=>e.currentTarget.style.color='#555'}>
                          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{
                            padding: '12px 16px', borderRadius: '8px', marginTop: '4px',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
                          }}>
                            <Ban size={14} />
                            {error}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button type="submit" disabled={loading} style={{
                      marginTop: '8px', padding: '16px', borderRadius: '10px', border: 'none',
                      background: loading ? '#0d9268' : '#10b981',
                      color: '#080808', fontWeight: '700', fontSize: '15px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 24px rgba(16,185,129,0.3)',
                      transition: 'all 0.2s',
                    }}>
                      {loading
                        ? <><span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#080808' }} /> Authenticating…</>
                        : <><span>Sign In</span><ArrowRight size={16} /></>
                      }
                    </button>
                  </form>

                  <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <a href="/onboard" style={{ color: '#10b981', fontSize: '14px', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='#34d399'} onMouseLeave={e=>e.currentTarget.style.color='#10b981'}>
                      New here? Open an account →
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
