// filename: frontend/src/components/ThreatPulseOrb/index.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const LEVEL_CONFIG = {
  normal: {
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.5)',
    glowOuter: 'rgba(34, 197, 94, 0.15)',
    label: 'NORMAL',
    pulseSpeed: 3,
    rings: 2,
  },
  elevated: {
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.5)',
    glowOuter: 'rgba(245, 158, 11, 0.15)',
    label: 'ELEVATED',
    pulseSpeed: 1.8,
    rings: 3,
  },
  critical: {
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.7)',
    glowOuter: 'rgba(220, 38, 38, 0.25)',
    label: 'CRITICAL',
    pulseSpeed: 0.9,
    rings: 3,
  },
};

export function ThreatPulseOrb({ threatLevel = 'normal', riskScore = 0 }) {
  const cfg = LEVEL_CONFIG[threatLevel] ?? LEVEL_CONFIG.normal;
  const isCritical = threatLevel === 'critical';

  const ringDelays = useMemo(() => {
    return Array.from({ length: cfg.rings }, (_, i) => (i * cfg.pulseSpeed) / cfg.rings);
  }, [cfg.rings, cfg.pulseSpeed]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', userSelect: 'none' }}>
      <div style={{ position: 'relative', width: '220px', height: '220px' }}>
        <div
          style={{
            position: 'absolute',
            inset: '-30px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${cfg.glowOuter} 0%, transparent 70%)`,
            transition: 'all 0.6s ease',
          }}
        />

        {ringDelays.map((delay, i) => (
          <motion.div
            key={`${threatLevel}-ring-${i}`}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `1.5px solid ${cfg.color}`,
              opacity: 0,
            }}
            animate={{ scale: [1, 1.5 + i * 0.15], opacity: [0.6, 0] }}
            transition={{ duration: cfg.pulseSpeed, delay, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}

        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <radialGradient id={`orb-gradient-${threatLevel}`} cx="40%" cy="35%">
              <stop offset="0%" stopColor={cfg.color} stopOpacity="0.9" />
              <stop offset="60%" stopColor={cfg.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={cfg.color} stopOpacity="0.05" />
            </radialGradient>
            <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={isCritical ? '8' : '5'} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="110" cy="110" r="100" fill="#0d0d1a" stroke={cfg.color} strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="110" cy="110" r="78" fill={`url(#orb-gradient-${threatLevel})`} filter="url(#orb-glow)" style={{ transition: 'all 0.6s ease' }} />

          <motion.circle
            cx="110" cy="110" r="92" fill="none"
            stroke={cfg.color} strokeWidth="2" strokeOpacity="0.3" strokeDasharray="40 540"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '110px 110px' }}
          />

          <text x="110" y="100" textAnchor="middle" fill={cfg.color} fontSize="42"
            fontFamily="'JetBrains Mono', monospace" fontWeight="700"
            style={{ filter: `drop-shadow(0 0 8px ${cfg.glow})` }}>
            {String(Math.round(riskScore)).padStart(2, '0')}
          </text>
          <text x="110" y="125" textAnchor="middle" fill="#64748b" fontSize="11"
            fontFamily="'Inter', system-ui" letterSpacing="2">
            RISK SCORE
          </text>
          <ellipse cx="90" cy="80" rx="18" ry="10" fill="white" opacity="0.04" />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#64748b', fontFamily: "'Inter', system-ui", marginBottom: '4px' }}>
          THREAT LEVEL
        </div>
        <motion.div
          key={threatLevel}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '4px', fontFamily: "'Inter', system-ui", color: cfg.color, textShadow: `0 0 12px ${cfg.glow}` }}
        >
          {cfg.label}
        </motion.div>
      </div>
    </div>
  );
}

export default ThreatPulseOrb;
