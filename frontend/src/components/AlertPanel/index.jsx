// filename: frontend/src/components/AlertPanel/index.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowUpCircle, ChevronDown, ChevronUp } from 'lucide-react';

function getSeverityConfig(severity) {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return {
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.08)',
        glow: 'rgba(239,68,68,0.4)',
        border: '#ef4444',
        label: 'CRITICAL',
      };
    case 'HIGH':
      return {
        color: '#f97316',
        bg: 'rgba(249,115,22,0.08)',
        glow: 'rgba(249,115,22,0.3)',
        border: '#f97316',
        label: 'HIGH',
      };
    case 'MEDIUM':
      return {
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        glow: 'rgba(245,158,11,0.25)',
        border: '#f59e0b',
        label: 'MEDIUM',
      };
    case 'LOW':
    default:
      return {
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.08)',
        glow: 'rgba(34,197,94,0.2)',
        border: '#22c55e',
        label: 'LOW',
      };
  }
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function AlertCard({ alert, onUpdateAlert }) {
  const cfg = getSeverityConfig(alert.severity);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(null);

  const handleAction = async (status) => {
    setLoading(status);
    try {
      await onUpdateAlert(alert.id, { status });
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        background: '#0d0d1a',
        border: '1px solid rgba(99,102,241,0.12)',
        borderLeft: `4px solid ${cfg.border}`,
        borderRadius: '8px',
        padding: '14px 16px',
        cursor: 'pointer',
        boxShadow: alert.severity?.toUpperCase() === 'CRITICAL'
          ? `0 0 20px rgba(220,38,38,0.15), inset 0 0 30px rgba(220,38,38,0.03)`
          : 'none',
        transition: 'all 0.2s ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = `rgba(99,102,241,0.25)`;
        e.currentTarget.style.boxShadow = alert.severity?.toUpperCase() === 'CRITICAL'
          ? `0 0 30px rgba(220,38,38,0.2), 0 4px 20px rgba(0,0,0,0.3)`
          : '0 4px 20px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)';
        e.currentTarget.style.boxShadow = alert.severity?.toUpperCase() === 'CRITICAL'
          ? `0 0 20px rgba(220,38,38,0.15), inset 0 0 30px rgba(220,38,38,0.03)`
          : 'none';
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Severity badge */}
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '3px',
              background: cfg.bg,
              color: cfg.color,
              fontSize: '9px',
              fontWeight: '700',
              letterSpacing: '1.5px',
              fontFamily: "'Inter', system-ui",
              boxShadow: `0 0 8px ${cfg.glow}`,
            }}
          >
            {cfg.label}
          </span>

          {/* Alert type */}
          {alert.type && (
            <span
              style={{
                fontSize: '10px',
                color: '#64748b',
                fontFamily: "'Inter', system-ui",
                letterSpacing: '0.5px',
              }}
            >
              {alert.type}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              color: '#64748b',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {timeAgo(alert.createdAt ?? alert.created_at)}
          </span>
          <div
            onClick={() => setExpanded((v) => !v)}
            style={{ color: '#64748b', cursor: 'pointer' }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      {/* User info */}
      <div style={{ marginBottom: '6px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#e2e8f0',
            fontFamily: "'Inter', system-ui",
          }}
        >
          {alert.userName ?? alert.user_name ?? 'Unknown User'}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#64748b',
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: '2px',
          }}
        >
          {alert.userEmail ?? alert.user_email ?? ''}
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: '12px',
          color: '#94a3b8',
          fontFamily: "'Inter', system-ui",
          lineHeight: '1.5',
          marginBottom: '10px',
        }}
      >
        {alert.description ?? alert.message ?? 'Suspicious activity detected'}
      </div>

      {/* Risk factor tags */}
      {(alert.riskFactors ?? alert.risk_factors ?? []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
          {(alert.riskFactors ?? alert.risk_factors).map((factor, i) => (
            <span
              key={i}
              style={{
                padding: '2px 7px',
                borderRadius: '3px',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#a5b4fc',
                fontSize: '10px',
                fontFamily: "'Inter', system-ui",
              }}
            >
              {factor}
            </span>
          ))}
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '10px',
                background: 'rgba(99,102,241,0.04)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '11px',
                color: '#64748b',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: '1.6',
              }}
            >
              <div>Alert ID: {alert.id}</div>
              {alert.riskScore != null && <div>Risk Score: {alert.riskScore}</div>}
              {alert.userId && <div>User ID: {alert.userId}</div>}
              {alert.metadata && (
                <div style={{ marginTop: '6px', color: '#94a3b8' }}>
                  {typeof alert.metadata === 'string'
                    ? alert.metadata
                    : JSON.stringify(alert.metadata, null, 2)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => handleAction('resolved')}
          disabled={loading != null}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '5px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#22c55e',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: "'Inter', system-ui",
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading === 'resolved' ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(34,197,94,0.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(34,197,94,0.1)';
          }}
        >
          <CheckCircle size={12} />
          Resolve
        </button>

        <button
          onClick={() => handleAction('false_positive')}
          disabled={loading != null}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '5px',
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            color: '#a5b4fc',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: "'Inter', system-ui",
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading === 'false_positive' ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(99,102,241,0.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
          }}
        >
          <XCircle size={12} />
          False Positive
        </button>

        <button
          onClick={() => handleAction('escalated')}
          disabled={loading != null}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '5px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: "'Inter', system-ui",
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading === 'escalated' ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
          }}
        >
          <ArrowUpCircle size={12} />
          Escalate
        </button>
      </div>
    </motion.div>
  );
}

export function AlertPanel({ alerts = [], onUpdateAlert }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const statuses = ['ALL', 'active', 'escalated', 'resolved'];

  const filtered = alerts.filter((a) => {
    const sevOk = filterSeverity === 'ALL' || a.severity?.toUpperCase() === filterSeverity;
    const stOk = filterStatus === 'ALL' || (a.status ?? 'active') === filterStatus;
    return sevOk && stOk;
  });

  const FilterBtn = ({ value, current, onChange, color }) => (
    <button
      onClick={() => onChange(value)}
      style={{
        padding: '4px 10px',
        borderRadius: '4px',
        border: current === value
          ? `1px solid ${color ?? '#6366f1'}`
          : '1px solid rgba(99,102,241,0.15)',
        background: current === value ? `${color ?? '#6366f1'}20` : 'transparent',
        color: current === value ? (color ?? '#a5b4fc') : '#64748b',
        fontSize: '10px',
        fontWeight: '600',
        letterSpacing: '0.8px',
        fontFamily: "'Inter', system-ui",
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {value}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          padding: '10px 0',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: "'Inter', system-ui", letterSpacing: '1px' }}>
            SEVERITY
          </span>
          {severities.map((s) => (
            <FilterBtn key={s} value={s} current={filterSeverity} onChange={setFilterSeverity} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: "'Inter', system-ui", letterSpacing: '1px' }}>
            STATUS
          </span>
          {statuses.map((s) => (
            <FilterBtn key={s} value={s} current={filterStatus} onChange={setFilterStatus} />
          ))}
        </div>
      </div>

      {/* Alert count */}
      <div
        style={{
          fontSize: '11px',
          color: '#64748b',
          fontFamily: "'Inter', system-ui",
        }}
      >
        {filtered.length} alert{filtered.length !== 1 ? 's' : ''} shown
        {alerts.length !== filtered.length && ` (${alerts.length} total)`}
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px',
        }}
      >
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#64748b',
              fontFamily: "'Inter', system-ui",
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#22c55e', marginBottom: '4px' }}>
              No active alerts
            </div>
            <div style={{ fontSize: '12px' }}>System is operating normally</div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onUpdateAlert={onUpdateAlert}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default AlertPanel;
