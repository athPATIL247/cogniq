import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Send, AlertCircle, LogOut, Monitor, TrendingUp, Wallet, CreditCard, Lock } from 'lucide-react';

function formatTxDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const diffH = (now - d) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diffH < 168) return d.toLocaleDateString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
import { getMe, getTransactions, createTransaction, logout } from '../../services/api';

function RiskBadge({ score }) {
  if (score == null) return null;
  const s = parseFloat(score);
  const [bg, color, label] =
    s >= 70 ? ['rgba(239,68,68,0.12)', '#ef4444', 'HIGH'] :
    s >= 40 ? ['rgba(245,158,11,0.12)', '#f59e0b', 'MEDIUM'] :
              ['rgba(16,185,129,0.12)',  '#10b981', 'LOW'];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: '600', letterSpacing: '0.8px',
      background: bg, color, border: `1px solid ${color}30`,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {label} · {s.toFixed(0)}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent = '#10b981' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px', padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={accent} />
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser]             = useState(null);
  const [transactions, setTx]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showSend, setShowSend]     = useState(false);
  const [txLoading, setTxLoading]   = useState(false);
  const [txResult, setTxResult]     = useState(null);
  const [txForm, setTxForm]         = useState({ amount: '', merchant: '', category: 'general', channel: 'online' });

  const load = useCallback(async () => {
    try {
      const [meRes, txRes] = await Promise.all([getMe(), getTransactions({ limit: 50 })]);
      setUser(meRes?.data?.user ?? meRes?.user ?? meRes);
      setTx(txRes?.data?.transactions ?? txRes?.transactions ?? []);
    } catch {
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async (e) => {
    e.preventDefault();
    setTxLoading(true); setTxResult(null);
    try {
      const res = await createTransaction(txForm);
      const d = res?.data ?? res;
      setTxResult(d);
      if (!d?.riskAssessment || d.riskAssessment?.riskScore < 70) {
        setTxForm({ amount: '', merchant: '', category: 'general', channel: 'online' });
        setTimeout(load, 800);
      }
    } catch (err) {
      setTxResult({ error: err?.response?.data?.error || 'Transaction failed.' });
    } finally {
      setTxLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login', { replace: true });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  const totalSpend = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const blocked    = transactions.filter(t => t.status === 'blocked').length;
  const firstName  = user?.name?.split(' ')[0] ?? 'User';
  const accountBalance = 482350 - totalSpend + (blocked * 0);
  const trustScore = user?.risk_tier === 'trusted' ? 96 : user?.risk_tier === 'elevated' ? 68 : 91;
  const accountNum = user?.id ? `XXXX-${String(user.id).slice(-4).toUpperCase()}-8291` : 'XXXX-0000-8291';

  const categorySpend = transactions
    .filter(t => t.status === 'completed')
    .reduce((acc, t) => {
      const cat = t.category || 'general';
      acc[cat] = (acc[cat] || 0) + parseFloat(t.amount || 0);
      return acc;
    }, {});
  const topCategories = Object.entries(categorySpend).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'Space Grotesk', system-ui, sans-serif", color: '#f5f5f5' }}>
      {/* Topbar */}
      <div style={{
        borderBottom: '1px solid #1a1a1a', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(16,185,129,0.3)' }}>
            <ShieldCheck size={15} color="#080808" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px' }}>Cogniq</span>
          <span style={{ fontSize: '11px', color: '#475569', letterSpacing: '1.5px', marginLeft: '4px' }}>SECURE BANKING</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <Lock size={11} color="#10b981" />
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600', letterSpacing: '0.3px' }}>AI Protection Active</span>
          </div>
          <button onClick={() => navigate('/devices')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Monitor size={15} /> Devices
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>{user?.name ?? user?.email}</span>
          <button onClick={handleLogout} style={{
            padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer', fontSize: '12px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Welcome */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' }}>
              Welcome back, {firstName}
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Your account is protected by Cogniq AI — behavioral risk scoring is active
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setShowSend(s => !s); setTxResult(null); }}
            style={{
              padding: '10px 20px', borderRadius: '9px', border: 'none',
              background: showSend ? 'rgba(255,255,255,0.05)' : '#10b981',
              color: showSend ? '#888' : '#080808', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: showSend ? 'none' : '0 4px 20px rgba(16,185,129,0.35)',
            }}
          >
            <Send size={14} /> {showSend ? 'Cancel' : 'Send Money'}
          </motion.button>
        </div>

        {/* Account + Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)',
            border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Available Balance</span>
              <Wallet size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px', fontFamily: "'JetBrains Mono', monospace" }}>
              ₹{Math.max(accountBalance, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CreditCard size={12} /> {accountNum}</span>
              <span>Savings · Cogniq Secure</span>
            </div>
          </div>
          <StatCard label="Spent (7 days)" value={`₹${totalSpend.toLocaleString('en-IN')}`} icon={TrendingUp} accent="#22c55e" sub={`${transactions.filter(t => t.status === 'completed').length} transactions`} />
          <StatCard label="Blocked" value={blocked} icon={AlertCircle} accent="#ef4444" sub="Fraud attempts stopped" />
          <StatCard label="Trust Score" value={`${trustScore}%`} icon={ShieldCheck} accent="#10b981" sub={user?.risk_tier === 'trusted' ? 'Trusted tier' : `${user?.risk_tier ?? 'standard'} tier`} />
        </div>

        {topCategories.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Spending by Category</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {topCategories.map(([cat, amt]) => (
                <div key={cat} style={{ flex: '1 1 120px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize', marginBottom: '4px' }}>{cat}</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace" }}>₹{amt.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Send Money Panel */}
        <AnimatePresence>
          {showSend && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: '24px' }}
            >
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px', color: '#f1f5f9' }}>Risk-Scored Transfer</h3>
                <form onSubmit={handleSend} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                  {[
                    { label: 'Amount (₹)', key: 'amount', type: 'number', placeholder: '5000' },
                    { label: 'Merchant',   key: 'merchant', type: 'text', placeholder: 'Amazon' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '6px', letterSpacing: '0.5px' }}>{label.toUpperCase()}</label>
                      <input type={type} value={txForm[key]} placeholder={placeholder} required
                        onChange={e => setTxForm(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = '#10b981'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                  ))}
                  {[
                    { label: 'Category', key: 'category', opts: ['general','shopping','food','travel','utilities','crypto'] },
                    { label: 'Channel',  key: 'channel',  opts: ['online','atm','branch','mobile'] },
                  ].map(({ label, key, opts }) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '6px', letterSpacing: '0.5px' }}>{label.toUpperCase()}</label>
                      <select value={txForm[key]} onChange={e => setTxForm(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '7px', background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      >
                        {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                      </select>
                    </div>
                  ))}
                  <button type="submit" disabled={txLoading} style={{
                    padding: '10px 20px', borderRadius: '7px', border: 'none',
                    background: '#10b981', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                  }}>
                    {txLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Send size={14} />}
                    {txLoading ? '' : 'Send'}
                  </button>
                </form>

                <AnimatePresence>
                  {txResult && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{
                      marginTop: '16px', padding: '14px 16px', borderRadius: '8px',
                      background: txResult.error ? 'rgba(239,68,68,0.08)' :
                        txResult.riskAssessment?.riskScore >= 70 ? 'rgba(239,68,68,0.08)' :
                        txResult.riskAssessment?.riskScore >= 40 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                      {txResult.error ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '13px' }}>
                          <AlertCircle size={14} /> {txResult.error}
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            {txResult.riskAssessment?.riskScore >= 70 ? (
                              <span style={{ fontWeight: '700', color: '#ef4444', letterSpacing: '0.5px' }}>TRANSACTION BLOCKED</span>
                            ) : (
                              <span style={{ fontWeight: '600', color: '#f1f5f9' }}>Risk Score: {txResult.riskAssessment?.riskScore?.toFixed(1)}</span>
                            )}
                            <RiskBadge score={txResult.riskAssessment?.riskScore} />
                          </div>
                          <span style={{ color: '#94a3b8' }}>{txResult.riskAssessment?.explanation || txResult.riskAssessment?.recommendedAction}</span>
                          {txResult.riskAssessment?.riskScore >= 70 && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#fca5a5' }}>
                              This payment was halted automatically. Our security team has been notified.
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions Table */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>Transaction History</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{transactions.length} records</span>
          </div>
          {transactions.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#475569' }}>
              No transactions yet. Try sending money above!
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.8fr 1fr 90px', padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Merchant', 'Amount', 'Date', 'Category', 'Channel', 'Status', 'Risk'].map(h => (
                  <span key={h} style={{ fontSize: '11px', color: '#475569', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {transactions.map(tx => (
                <div key={tx.id} style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.8fr 1fr 90px',
                  padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                  alignItems: 'center', transition: 'background 0.15s',
                  background: tx.status === 'blocked' ? 'rgba(239,68,68,0.03)' : 'transparent',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = tx.status === 'blocked' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = tx.status === 'blocked' ? 'rgba(239,68,68,0.03)' : 'transparent'}
                >
                  <span style={{ fontWeight: '500', color: '#e2e8f0' }}>{tx.merchant}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: tx.status === 'blocked' ? '#fca5a5' : '#f1f5f9' }}>₹{parseFloat(tx.amount).toLocaleString('en-IN')}</span>
                  <span style={{ color: '#64748b', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>{formatTxDate(tx.timestamp)}</span>
                  <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{tx.category}</span>
                  <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{tx.channel}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    fontSize: '12px', fontWeight: '500',
                    color: tx.status === 'blocked' ? '#ef4444' : tx.status === 'pending_verification' ? '#f59e0b' : '#22c55e',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                    {tx.status.replace('_', ' ')}
                  </span>
                  <RiskBadge score={tx.risk_score} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
