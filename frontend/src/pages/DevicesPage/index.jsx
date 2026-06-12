// filename: frontend/src/pages/DevicesPage/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getDevices, trustDevice, removeDevice } from '../../services/api';

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

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b14', fontFamily: "'Inter', system-ui, sans-serif", color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(11,11,20,0.9)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
            ← Back
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>My Devices</div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px' }}>DEVICE MANAGEMENT</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Registered Devices</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>Manage devices that have accessed your account. Trust devices to reduce friction.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <motion.div
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #10b981', borderTopColor: 'transparent' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : devices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569', fontSize: '14px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
            No devices registered yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devices.map((device) => {
              const trustPct = Math.round(device.trust_score * 100);
              const trustColor = trustPct >= 70 ? '#22c55e' : trustPct >= 40 ? '#f59e0b' : '#ef4444';

              return (
                <motion.div
                  key={device.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '20px 24px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${device.is_trusted ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ fontSize: '32px' }}>💻</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0' }}>{device.device_name}</span>
                        {device.is_trusted && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>TRUSTED</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                        {[['Trust Score', `${trustPct}%`, trustColor], ['Last Seen', new Date(device.last_seen).toLocaleDateString(), '#64748b']].map(([label, value, color]) => (
                          <div key={label} style={{ fontSize: '12px' }}>
                            <span style={{ color: '#64748b' }}>{label}: </span>
                            <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontWeight: '600' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Trust score bar */}
                  <div style={{ width: '80px' }}>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${trustPct}%`, background: trustColor, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {!device.is_trusted && (
                      <button
                        onClick={() => handleTrust(device.id)}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'rgba(34,197,94,0.12)', color: '#22c55e', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                      >
                        Trust
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(device.id)}
                      style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                    >
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
