// filename: frontend/src/components/RiskFeed/index.jsx
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_VISIBLE = 15;

function getRiskColor(score) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  if (score >= 35) return '#f59e0b';
  return '#22c55e';
}

function getRiskLabel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

function getActionBadge(action) {
  switch (action?.toUpperCase()) {
    case 'BLOCK':
    case 'BLOCKED':
      return { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', text: 'BLOCKED' };
    case 'HARD_MFA':
    case 'MFA_OTP':
    case 'OTP':
    case 'CHALLENGE':
      return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', text: 'MFA' };
    case 'SOFT_CHALLENGE':
    case 'MFA_PUSH':
      return { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', text: 'PUSH' };
    case 'ALLOW':
    case 'ALLOWED':
    default:
      return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', text: 'ALLOWED' };
  }
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function RiskDot({ score }) {
  const color = getRiskColor(score);
  const isCritical = score >= 80;
  return (
    <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 6px ${color}`, position: 'relative', zIndex: 1 }} />
      {isCritical && (
        <motion.div
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: color, zIndex: 0 }}
          animate={{ scale: [1, 2], opacity: [0.5, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}

export function RiskFeed({ events = [], filterLevel = null, maxVisible = MAX_VISIBLE }) {
  const filtered = useMemo(() => {
    let list = events;
    if (filterLevel) {
      list = events.filter((e) => {
        const label = getRiskLabel(e.riskScore ?? e.risk_score ?? 0);
        return label === filterLevel.toUpperCase();
      });
    }
    return list.slice(0, maxVisible);
  }, [events, filterLevel, maxVisible]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', maxHeight: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 90px 80px', gap: '8px', padding: '6px 12px', borderBottom: '1px solid rgba(99,102,241,0.1)', marginBottom: '2px' }}>
        {['', 'USER / ACTION', 'SCORE', 'TIME', 'RESULT'].map((h, i) => (
          <div key={i} style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#64748b', fontFamily: "'Inter', system-ui", fontWeight: 500 }}>
            {h}
          </div>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: '32px 12px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontFamily: "'Inter', system-ui" }}
          >
            No events yet — watching for activity…
          </motion.div>
        )}

        {filtered.map((event) => {
          const score = event.riskScore ?? event.risk_score ?? 0;
          const color = getRiskColor(score);
          const isCritical = score >= 80;
          const action = getActionBadge(event.action ?? event.recommendedAction ?? event.decision);
          const email = event.email ?? event.userEmail ?? event.userId ?? 'unknown@user';
          const actionType = event.actionType ?? event.event_type ?? 'event';
          const ts = event.receivedAt ?? event.timestamp ?? event.createdAt;

          return (
            <motion.div
              key={event.id ?? `${email}-${ts}`}
              layout
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                display: 'grid', gridTemplateColumns: '24px 1fr 80px 90px 80px', gap: '8px',
                alignItems: 'center', padding: '8px 12px',
                borderLeft: isCritical ? `3px solid ${color}` : '3px solid transparent',
                boxShadow: isCritical ? `inset 0 0 20px rgba(239,68,68,0.04)` : 'none',
                borderBottom: '1px solid rgba(99,102,241,0.05)',
                cursor: 'default', transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RiskDot score={score} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: "'Inter', system-ui", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email.length > 28 ? email.slice(0, 25) + '…' : email}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', fontFamily: "'Inter', system-ui", textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '1px' }}>
                  {actionType}
                </div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: '700', color, textShadow: `0 0 8px ${color}40` }}>
                {String(Math.round(score)).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                {timeAgo(ts)}
              </div>
              <div style={{ padding: '2px 6px', borderRadius: '3px', background: action.bg, color: action.color, fontSize: '9px', fontWeight: '700', letterSpacing: '1px', fontFamily: "'Inter', system-ui", textAlign: 'center', whiteSpace: 'nowrap' }}>
                {action.text}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default RiskFeed;
