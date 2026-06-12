// filename: frontend/src/pages/DevicesPage/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Laptop, Smartphone, Tablet, ShieldCheck, Monitor } from 'lucide-react';
import { getDevices, trustDevice, removeDevice } from '../../services/api';

function DeviceIcon({ name, os }) {
  const n = (name + os).toLowerCase();
  if (n.includes('iphone') || n.includes('android') || n.includes('galaxy')) return Smartphone;
  if (n.includes('ipad')) return Tablet;
  return Laptop;
}

export default function DevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDevices = useCallback(async () => {
    try {
      const res = await getDevices();
      setDevices(res?.data?.devices || res?.data || []);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const handleTrust = async (deviceId) => {
    try {
      await trustDevice(deviceId);
      setDevices((prev) => prev.map((d) => d.id === deviceId ? { ...d, is_trusted: true, trust_score: Math.max(d.trust_score, 0.8) } : d));
    } catch (err) {
      console.error('Failed to trust device:', err);
    }
  };

  const handleRemove = async (deviceId) => {
    try {
      await removeDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch (err) {
      console.error('Failed to remove device:', err);
    }
  };

  const trustedCount = devices.filter((d) => d.is_trusted).length;
  const avgTrust = devices.length
    ? Math.round(devices.reduce((s, d) => s + parseFloat(d.trust_score || 0), 0) / devices.length * 100)
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'Space Grotesk', system-ui, sans-serif", color: '#f5f5f5' }}>
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
            ← Dashboard
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
          <Monitor size={16} color="#10b981" />
          <span style={{ fontSize: '15px', fontWeight: '600' }}>Device Trust Center</span>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' }}>Registered Devices</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Devices fingerprinted and scored by Cogniq behavioral AI. Trusted devices skip MFA.</p>
        </div>

        {devices.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Total Devices', value: devices.length, color: '#f1f5f9' },
              { label: 'Trusted', value: trustedCount, color: '#22c55e' },
              { label: 'Avg Trust Score', value: `${avgTrust}%`, color: avgTrust >= 80 ? '#22c55e' : '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : devices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569', fontSize: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Laptop size={40} color="#333" style={{ marginBottom: '16px' }} />
            No devices registered yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devices.map((device) => {
              const trustPct = Math.round(parseFloat(device.trust_score) * 100);
              const trustColor = trustPct >= 70 ? '#22c55e' : trustPct >= 40 ? '#f59e0b' : '#ef4444';
              const Icon = DeviceIcon({ name: device.device_name, os: device.os });

              return (
                <motion.div
                  key={device.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '20px 24px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${device.is_trusted ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0' }}>{device.device_name}</span>
                        {device.is_trusted && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={10} /> TRUSTED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {device.os} · {device.browser}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
                        Last seen {new Date(device.last_seen).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div style={{ width: '100px', textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: trustColor, fontFamily: "'JetBrains Mono', monospace" }}>{trustPct}%</div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                      <div style={{ height: '100%', width: `${trustPct}%`, background: trustColor, borderRadius: '2px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {!device.is_trusted && (
                      <button onClick={() => handleTrust(device.id)} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'rgba(16,185,129,0.12)', color: '#10b981', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}>
                        Trust
                      </button>
                    )}
                    <button onClick={() => handleRemove(device.id)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}>
                      Remove
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
