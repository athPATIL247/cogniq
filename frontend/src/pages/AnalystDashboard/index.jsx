// filename: frontend/src/pages/AnalystDashboard/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThreatPulseOrb } from '../../components/ThreatPulseOrb';
import { RiskFeed } from '../../components/RiskFeed';
import { useRiskFeed } from '../../hooks/useRiskFeed';
import { getDashboardStats, getAllAlerts, updateAlert, getAllUsers } from '../../services/api';

function StatCard({ label, value, color = '#10b981', sub }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}
    >
      <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '600' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: '700', color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#475569' }}>{sub}</div>}
    </motion.div>
  );
}

function getOrbLevel(score) {
  if (score >= 70) return 'critical';
  if (score >= 40) return 'elevated';
  return 'normal';
}

function RiskDistribution({ dist }) {
  if (!dist) return null;
  const segments = [
    { key: 'low', label: 'Low', color: '#22c55e', count: dist.low ?? 0 },
    { key: 'medium', label: 'Med', color: '#f59e0b', count: dist.medium ?? 0 },
    { key: 'high', label: 'High', color: '#f97316', count: dist.high ?? 0 },
    { key: 'critical', label: 'Crit', color: '#ef4444', count: dist.critical ?? 0 },
  ];
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '600' }}>
        Risk Distribution (24h)
      </div>
      <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginBottom: '10px' }}>
        {segments.map((s) => s.count > 0 && (
          <div key={s.key} style={{ width: `${(s.count / total) * 100}%`, background: s.color, transition: 'width 0.5s' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {segments.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
            <span style={{ color: '#64748b' }}>{s.label}</span>
            <span style={{ color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginLeft: 'auto' }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalystDashboard() {
  const navigate = useNavigate();
  const { events, clearEvents, connected } = useRiskFeed();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [avgRisk, setAvgRisk] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, alertsRes, usersRes] = await Promise.allSettled([
        getDashboardStats(),
        getAllAlerts({ limit: 50 }),
        getAllUsers(),
      ]);
      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value?.data || statsRes.value;
        setStats(s);
        setAvgRisk(s?.avgRiskScore || 0);
      }
      if (alertsRes.status === 'fulfilled') {
        const raw = alertsRes.value?.data || [];
        const sorted = [...raw].sort((a, b) => {
          const sev = { critical: 0, high: 1, medium: 2, low: 3 };
          const sa = sev[a.severity] ?? 4;
          const sb = sev[b.severity] ?? 4;
          if (sa !== sb) return sa - sb;
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (b.status === 'active' && a.status !== 'active') return 1;
          return 0;
        });
        setAlerts(sorted);
      }
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value?.data?.users || usersRes.value?.data || []);
      }
    } catch (err) {
      console.error('Failed to load analyst data:', err);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Recalculate avg risk from live events
  useEffect(() => {
    if (events.length === 0) return;
    const recentEvents = events.slice(0, 10);
    const avg = recentEvents.reduce((sum, e) => sum + parseFloat(e.riskScore ?? 0), 0) / recentEvents.length;
    setAvgRisk(Math.round(avg));
  }, [events]);

  const handleLogout = () => {
    localStorage.removeItem('tp_access_token');
    localStorage.removeItem('tp_refresh_token');
    navigate('/login');
  };

  const resolveAlert = async (alertId) => {
    try {
      await updateAlert(alertId, { status: 'resolved' });
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status: 'resolved' } : a));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const tabs = [
    { id: 'feed', label: `Live Feed${events.length > 0 ? ` · ${events.length}` : ''}` },
    { id: 'alerts', label: `Alerts ${alerts.filter(a => a.status === 'active' || a.status === 'investigating').length > 0 ? `(${alerts.filter(a => a.status === 'active' || a.status === 'investigating').length})` : ''}` },
    { id: 'users', label: 'Users' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      color: '#f5f5f5',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(16,185,129,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16,185,129,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backdropFilter: 'blur(20px)',
          background: 'rgba(8,8,8,0.92)',
          position: 'sticky', top: 0, zIndex: 10,
          borderBottom: '1px solid #1a1a1a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(16,185,129,0.3)' }}>
              <ShieldCheck size={16} color="#080808" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.3px' }}>Cogniq</div>
              <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px' }}>ANALYST DASHBOARD</div>
            </div>
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#475569' }}>Ravi Analyst · SOC-IN-01</span>
            <div style={{
              marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '20px',
              background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <motion.div
                animate={{ opacity: connected ? [1, 0.3, 1] : 1 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#10b981' : '#ef4444' }}
              />
              <span style={{ fontSize: '11px', color: connected ? '#10b981' : '#ef4444', fontWeight: '600', letterSpacing: '0.5px' }}>
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 'calc(100vh - 65px)' }}>
          {/* Left panel — Orb + stats */}
          <div style={{
            borderRight: '1px solid rgba(255,255,255,0.05)',
            padding: '32px 24px',
            display: 'flex', flexDirection: 'column', gap: '32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ThreatPulseOrb threatLevel={getOrbLevel(avgRisk)} riskScore={avgRisk} />
            </div>

            {stats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <StatCard label="Active Alerts" value={stats.activeAlerts ?? 0} color="#ef4444" />
                <StatCard label="Blocked Today" value={stats.blockedToday ?? 0} color="#f97316" />
                <StatCard label="Users Monitored" value={stats.totalUsersMonitored ?? 0} color="#10b981" />
                <StatCard label="Avg Risk Score" value={`${Math.round(stats.avgRiskScore ?? 0)}`} color={avgRisk > 60 ? '#ef4444' : avgRisk > 35 ? '#f59e0b' : '#22c55e'} sub="last 24h" />
                <RiskDistribution dist={stats.riskScoreDistribution} />
              </div>
            )}

            {events.length > 0 && (
              <button
                onClick={clearEvents}
                style={{
                  padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)', color: '#64748b',
                  cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                }}
              >
                Clear {events.length} events
              </button>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '4px' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: activeTab === tab.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: activeTab === tab.id ? '#6ee7b7' : '#64748b',
                    cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.id ? '600' : '400',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'feed' && (
                  <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Real-time risk events across all monitored accounts
                      </span>
                      <span style={{ fontSize: '11px', color: connected ? '#10b981' : '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>
                        {connected ? '● STREAMING' : '○ DISCONNECTED'}
                      </span>
                    </div>
                    <RiskFeed events={events} />
                  </motion.div>
                )}

                {activeTab === 'alerts' && (
                  <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '48px', fontSize: '14px' }}>
                        No active alerts — system is clean ✓
                      </div>
                    ) : alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        layout
                        style={{
                          padding: '16px', borderRadius: '12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px',
                              background: alert.severity === 'critical' ? 'rgba(239,68,68,0.15)' : alert.severity === 'high' ? 'rgba(249,115,22,0.15)' : 'rgba(245,158,11,0.15)',
                              color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#f59e0b',
                            }}>
                              {alert.severity?.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{alert.user?.email}</span>
                            {alert.createdAt && (
                              <span style={{ fontSize: '10px', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                                {new Date(alert.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>{alert.description}</p>
                          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#475569', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }}>
                              {alert.status?.replace('_', ' ')}
                            </span>
                            {(alert.riskFactors || alert.risk_factors || [])?.slice?.(0, 2).map((f, i) => (
                              <span key={i} style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{typeof f === 'string' ? f : f}</span>
                            ))}
                          </div>
                        </div>
                        {(alert.status === 'active' || alert.status === 'investigating') && (
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            style={{
                              padding: '6px 12px', borderRadius: '6px', border: 'none',
                              background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                              cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', whiteSpace: 'nowrap',
                            }}
                          >
                            Resolve
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'users' && (
                  <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          {['Name', 'Email', 'Risk Score', 'Risk Tier', 'Devices'].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '600' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => {
                          const score = user.latest_risk_score ?? 0;
                          const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e';
                          return (
                            <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{user.name}</td>
                              <td style={{ padding: '10px 12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>{user.email}</td>
                              <td style={{ padding: '10px 12px', color, fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }}>
                                {score ? Math.round(score) : '—'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                  background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                                }}>
                                  {user.risk_tier || 'standard'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#64748b' }}>{user.device_count ?? 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
