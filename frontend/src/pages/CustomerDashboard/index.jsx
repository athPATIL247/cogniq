// filename: frontend/src/pages/CustomerDashboard/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getMe, getTransactions, createTransaction, getDevices, logout } from '../../services/api';
import { ShieldCheck, Send, AlertCircle } from 'lucide-react';

function RiskBadge({ score }) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e';
  const label = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
  return (
    <span style={{
      padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
      letterSpacing: '1px', color,
      background: score >= 70 ? 'rgba(239,68,68,0.12)' : score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
    }}>
      {label}
    </span>
  );
}

function TransactionRow({ tx }) {
  const isBlocked = tx.status === 'blocked';
  const isPending = tx.status === 'pending_verification';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 90px',
      gap: '12px', padding: '12px 16px', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      opacity: isBlocked ? 0.7 : 1,
    }}>
      <div>
        <div style={{ fontSize: '14px', color: '#e2e8f0' }}>{tx.merchant}</div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{tx.category}</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#f1f5f9' }}>
        ₹{parseFloat(tx.amount).toLocaleString('en-IN')}
      </div>
      <div>
        <RiskBadge score={tx.risk_score ?? 0} />
      </div>
      <div style={{
        fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px',
        color: isBlocked ? '#ef4444' : isPending ? '#f59e0b' : '#22c55e',
      }}>
        {tx.status?.toUpperCase()}
      </div>
      <div style={{ fontSize: '11px', color: '#64748b' }}>
        {new Date(tx.timestamp).toLocaleDateString()}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [txForm, setTxForm] = useState({ amount: '', merchant: '', category: 'general', channel: 'online' });
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

  const loadData = useCallback(async () => {
    try {
      const [meRes, txRes, devRes] = await Promise.allSettled([
        getMe(), getTransactions(), getDevices(),
      ]);
      if (meRes.status === 'fulfilled') setUser(meRes.value?.data?.user || meRes.value?.data);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value?.data?.transactions || []);
      if (devRes.status === 'fulfilled') setDevices(devRes.value?.data?.devices || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    if (!txForm.amount || !txForm.merchant) return;
    setTxLoading(true);
    setTxResult(null);
    try {
      const res = await createTransaction({
        amount: parseFloat(txForm.amount),
        merchant: txForm.merchant,
        category: txForm.category,
        channel: txForm.channel,
      });
      const data = res?.data || res;
      setTxResult(data);
      if (data?.transaction) {
        setTransactions((prev) => [data.transaction, ...prev]);
      }
      setTxForm({ amount: '', merchant: '', category: 'general', channel: 'online' });
    } catch (err) {
      setTxResult({ error: err?.response?.data?.error || 'Transaction failed' });
    } finally {
      setTxLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b14', fontFamily: "'Inter', system-ui, sans-serif", color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(11,11,20,0.9)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={24} color="#6366f1" />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>Cogniq</div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px' }}>SECURE BANKING</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{user?.name || user?.email}</span>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Welcome + Send Money CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: '14px' }}>
              Your account is protected by Cogniq AI risk scoring
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowSendMoney(!showSendMoney)}
            style={{
              padding: '12px 24px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={16} /> Send Money
            </div>
          </motion.button>
        </div>

        {/* Send Money Panel */}
        <AnimatePresence>
          {showSendMoney && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: '24px', overflow: 'hidden' }}
            >
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '600' }}>Send Money (Risk-Scored)</h3>
                <form onSubmit={handleSendMoney} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Amount (₹)</label>
                    <input type="number" value={txForm.amount} onChange={(e) => setTxForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="5000" required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Merchant</label>
                    <input type="text" value={txForm.merchant} onChange={(e) => setTxForm(p => ({ ...p, merchant: e.target.value }))}
                      placeholder="Amazon" required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Category</label>
                    <select value={txForm.category} onChange={(e) => setTxForm(p => ({ ...p, category: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    >
                      {['general', 'shopping', 'food', 'travel', 'utilities', 'crypto'].map(c => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Channel</label>
                    <select value={txForm.channel} onChange={(e) => setTxForm(p => ({ ...p, channel: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    >
                      {['online', 'atm', 'branch', 'mobile'].map(c => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={txLoading}
                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                  >
                    {txLoading ? '…' : 'Send'}
                  </button>
                </form>

                {txResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
                      background: txResult.error ? 'rgba(239,68,68,0.1)' :
                        txResult.riskAssessment?.riskScore >= 70 ? 'rgba(239,68,68,0.1)' :
                          txResult.riskAssessment?.riskScore >= 40 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                      border: `1px solid ${txResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {txResult.error ? (
                      <span style={{ color: '#fca5a5', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} /> {txResult.error}
                      </span>
                    ) : (
                      <div style={{ fontSize: '14px' }}>
                        <strong>Risk Score: {txResult.riskAssessment?.riskScore?.toFixed(1) ?? 'N/A'}</strong>
                        {' — '}{txResult.riskAssessment?.explanation || txResult.riskAssessment?.recommendedAction}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          {[{ id: 'transactions', label: 'Transactions' }, { id: 'devices', label: 'Devices' }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: activeTab === tab.id ? '#a5b4fc' : '#64748b',
                cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.id ? '600' : '400',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transactions table */}
        {activeTab === 'transactions' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 90px', gap: '12px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Merchant', 'Amount', 'Risk', 'Status', 'Date'].map((h) => (
                <div key={h} style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '600' }}>{h}</div>
              ))}
            </div>
            {transactions.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#475569', fontSize: '14px' }}>No transactions yet — try sending money above</div>
            ) : (
              transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </div>
        )}

        {/* Devices */}
        {activeTab === 'devices' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {devices.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#475569', gridColumn: '1/-1' }}>No devices registered</div>
            ) : devices.map((device) => (
              <div key={device.id} style={{
                padding: '20px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0' }}>{device.device_name}</div>
                  {device.is_trusted && (
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '11px', fontWeight: '600' }}>TRUSTED</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[['Trust Score', `${(device.trust_score * 100).toFixed(0)}%`], ['Last Seen', new Date(device.last_seen).toLocaleDateString()]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>{k}</span>
                      <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
