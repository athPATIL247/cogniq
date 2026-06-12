// filename: frontend/src/pages/Landing/index.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Zap, Lock, ArrowRight, Eye, Network } from 'lucide-react';

const FEATURES = [
  {
    icon: Activity,
    title: 'Behavioral DNA',
    desc: 'Keystroke cadence, mouse entropy, and session timing fused into a unique behavioral fingerprint — captured passively.',
  },
  {
    icon: Zap,
    title: 'Zero-Friction Trust',
    desc: 'Legitimate users experience no interruptions. Challenges trigger only when risk crosses a calculated threshold.',
  },
  {
    icon: Network,
    title: 'Insider Threat Graph',
    desc: 'Entity relationship modeling detects anomalous access patterns across accounts — catching insider threats before damage is done.',
  },
  {
    icon: Eye,
    title: 'Full Explainability',
    desc: 'Every risk decision is decomposed into weighted factors: behavioral, device, location, temporal, transactional.',
  },
  {
    icon: Lock,
    title: 'Privacy-First Architecture',
    desc: 'Raw biometrics are never stored. Only derived mathematical vectors are persisted — compliant by design.',
  },
  {
    icon: ShieldCheck,
    title: 'Real-Time SOC Feed',
    desc: 'Analyst dashboard with live WebSocket event stream, risk breakdown charts, and one-click alert resolution.',
  },
];

const HIGHLIGHTS = [
  { value: '2.4M+', label: 'Sessions Scored Daily' },
  { value: '<12ms', label: 'Avg Risk Decision Latency' },
  { value: '99.7%', label: 'Legitimate User Pass-through' },
  { value: '₹840Cr', label: 'Fraud Prevented (FY25)' },
];

export default function Landing() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Animated particle grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dots = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width)  d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16,185,129,0.35)';
        ctx.fill();
      });
      dots.forEach((a, i) => dots.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(16,185,129,${0.08 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }));
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'Space Grotesk', system-ui, sans-serif", color: '#f5f5f5', overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '0 48px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16,185,129,0.4)',
          }}>
            <ShieldCheck size={18} color="#080808" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.3px' }}>Cogniq</span>
          <span style={{ fontSize: '10px', color: '#555', letterSpacing: '2px', marginLeft: '4px', fontFamily: "'Inter', sans-serif" }}>IDENTITY TRUST</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => navigate('/login')} style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid #2a2a2a',
            background: 'transparent', color: '#a1a1a1', cursor: 'pointer',
            fontSize: '13px', fontFamily: 'inherit', fontWeight: '500',
          }}>
            Sign In
          </button>
          <button onClick={() => navigate('/onboard')} style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none',
            background: '#10b981', color: '#080808', cursor: 'pointer',
            fontSize: '13px', fontFamily: 'inherit', fontWeight: '700',
            boxShadow: '0 0 20px rgba(16,185,129,0.3)',
          }}>
            Open Account
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 48px 60px' }}>
        {/* Animated canvas bg */}
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }} />

        {/* Center glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px', pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 65%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '5px 14px', borderRadius: '20px',
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              fontSize: '12px', color: '#10b981', fontWeight: '600', letterSpacing: '1px',
              marginBottom: '32px', fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            AI-POWERED IDENTITY SECURITY
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontSize: 'clamp(42px, 6vw, 76px)', fontWeight: '700',
              lineHeight: 1.05, letterSpacing: '-2px', marginBottom: '24px',
              color: '#f5f5f5',
            }}
          >
            Real-time Identity Trust<br />
            <span style={{ color: '#10b981' }}>Without the Friction.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: '18px', color: '#6b6b6b', lineHeight: 1.7, maxWidth: '580px', margin: '0 auto 48px', fontFamily: "'Inter', sans-serif" }}
          >
            Cogniq silently scores every banking session using behavioral AI — blocking fraud before it happens while legitimate users feel nothing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button onClick={() => navigate('/onboard')} style={{
              padding: '14px 32px', borderRadius: '10px', border: 'none',
              background: '#10b981', color: '#080808',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 32px rgba(16,185,129,0.35)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 40px rgba(16,185,129,0.5)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 32px rgba(16,185,129,0.35)'}
            >
              Open an Account <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/login')} style={{
              padding: '14px 32px', borderRadius: '10px',
              border: '1px solid #2a2a2a',
              background: 'rgba(255,255,255,0.03)', color: '#a1a1a1',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              Analyst Portal
            </button>
          </motion.div>
        </div>
      </section>

      {/* Trusted by */}
      <section style={{ padding: '28px 48px', borderTop: '1px solid #1a1a1a', background: '#0a0a0a' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px', fontFamily: "'Inter', sans-serif" }}>
            Trusted by leading financial institutions
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '48px', flexWrap: 'wrap', opacity: 0.45 }}>
            {['HDFC Bank', 'ICICI Direct', 'Axis Neo', 'Razorpay', 'PhonePe'].map((name) => (
              <span key={name} style={{ fontSize: '15px', fontWeight: '600', color: '#888', letterSpacing: '0.5px', fontFamily: "'Space Grotesk', sans-serif" }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights bar */}
      <section style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '32px 48px', background: '#0f0f0f' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {HIGHLIGHTS.map(({ value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', letterSpacing: '-1px', marginBottom: '4px' }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#555', letterSpacing: '0.5px', fontFamily: "'Inter', sans-serif" }}>{label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '96px 48px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '38px', fontWeight: '700', letterSpacing: '-1px', marginBottom: '16px' }}>
            Five layers of protection.<br />
            <span style={{ color: '#555' }}>One seamless experience.</span>
          </h2>
          <p style={{ color: '#555', fontSize: '16px', maxWidth: '480px', margin: '0 auto', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
            Each layer operates independently. Together, they form a trust score that adapts to every session.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              style={{
                padding: '28px', borderRadius: '12px',
                background: '#0f0f0f', border: '1px solid #1a1a1a',
                transition: 'border-color 0.2s, background 0.2s',
                cursor: 'default',
              }}
              whileHover={{ scale: 1.02 }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)';
                e.currentTarget.style.background = '#111';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1a1a1a';
                e.currentTarget.style.background = '#0f0f0f';
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Icon size={20} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#f5f5f5' }}>{title}</h3>
              <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 48px', textAlign: 'center', borderTop: '1px solid #1a1a1a' }}>
        <h2 style={{ fontSize: '42px', fontWeight: '700', letterSpacing: '-1px', marginBottom: '16px' }}>
          Ready to upgrade your security?
        </h2>
        <p style={{ color: '#555', fontSize: '16px', marginBottom: '36px', fontFamily: "'Inter', sans-serif" }}>
          Integrate Cogniq AI to invisibly protect your users with behavioral analytics.
        </p>
        <button onClick={() => navigate('/onboard')} style={{
          padding: '14px 40px', borderRadius: '10px', border: 'none',
          background: '#10b981', color: '#080808',
          fontSize: '16px', fontWeight: '700', cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: '0 4px 32px rgba(16,185,129,0.3)',
        }}>
          Get Started — It's Free
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="#10b981" />
          <span style={{ fontSize: '13px', color: '#555' }}>Cogniq — Behavioral Identity Trust</span>
        </div>
        <span style={{ fontSize: '12px', color: '#333', fontFamily: "'Inter', sans-serif" }}>Real-time fraud prevention · Privacy-first by design</span>
      </footer>
    </div>
  );
}
