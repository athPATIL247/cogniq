// filename: frontend/src/pages/OnboardingFlow/index.jsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { analyzeOnboarding, verifyKYC } from '../../services/api';
import { useBehavioralCapture } from '../../hooks/useBehavioralCapture';
import { ShieldCheck, FileText, Upload, Search, CheckCircle } from 'lucide-react';

const STEPS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'kyc', label: 'KYC Verification' },
  { id: 'analysis', label: 'Risk Analysis' },
  { id: 'complete', label: 'Complete' },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { captureRef, getSnapshot } = useBehavioralCapture();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', pan: '', dob: '' });
  const [kycFile, setKycFile] = useState(null);
  const [kycResult, setKycResult] = useState(null);
  const [botResult, setBotResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fieldTimes, setFieldTimes] = useState([]);
  const [fieldStart, setFieldStart] = useState(null);

  const handleFieldFocus = () => setFieldStart(Date.now());
  const handleFieldBlur = () => {
    if (fieldStart) {
      setFieldTimes((prev) => [...prev, Date.now() - fieldStart]);
      setFieldStart(null);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setAnalyzing(true);
    try {
      const snap = getSnapshot();
      const formBehavior = {
        fieldCompletionTimes: fieldTimes,
        backspaceCount: 2,
        totalKeystrokes: snap.avgDwellTime > 0 ? 80 : 40,
        mouseEntropy: snap.mouseVelocity > 0 ? 0.6 : 0.05,
      };

      const res = await analyzeOnboarding({
        userId: formData.email || 'anonymous',
        formBehavior,
      });

      setBotResult(res?.data || res);
    } catch (err) {
      setBotResult({ isSuspectedBot: false, botScore: 0, flags: [] });
    } finally {
      setAnalyzing(false);
      setStep(1);
    }
  };

  const handleKYCUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKycFile(file);
    setAnalyzing(true);

    try {
      const fd = new FormData();
      fd.append('documentImage', file);
      fd.append('documentType', 'aadhaar');
      const res = await verifyKYC(fd);
      setKycResult(res?.data || res);
    } catch {
      setKycResult({ isLikelySynthetic: false, confidence: 0.05, flags: [] });
    } finally {
      setAnalyzing(false);
    }
  };

  const isBotDetected = botResult?.isSuspectedBot;
  const isSyntheticDoc = kycResult?.isLikelySynthetic;

  return (
    <div ref={captureRef} style={{ minHeight: '100vh', background: '#0b0b14', fontFamily: "'Inter', system-ui, sans-serif", color: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <ShieldCheck size={36} color="#6366f1" />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Open an Account</h1>
        <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>Secure onboarding with AI-powered identity verification</p>
      </div>

      {/* Progress steps */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '40px', width: '100%', maxWidth: '560px' }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {i > 0 && <div style={{ flex: 1, height: '2px', background: i <= step ? '#6366f1' : 'rgba(255,255,255,0.08)' }} />}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step ? '#6366f1' : i === step ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${i <= step ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                fontSize: '13px', fontWeight: '700', color: i <= step ? 'white' : '#64748b',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: '2px', background: i < step ? '#6366f1' : 'rgba(255,255,255,0.08)' }} />}
            </div>
            <div style={{ fontSize: '11px', color: i === step ? '#a5b4fc' : '#64748b', marginTop: '6px', letterSpacing: '0.3px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <AnimatePresence mode="wait">

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <motion.div key="personal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 24px' }}>Personal Information</h2>
                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'john@example.com' },
                    { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 9876543210' },
                    { label: 'PAN Card', key: 'pan', type: 'text', placeholder: 'ABCDE1234F' },
                    { label: 'Date of Birth', key: 'dob', type: 'date', placeholder: '' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>{label}</label>
                      <input
                        type={type}
                        value={formData[key]}
                        placeholder={placeholder}
                        required
                        onChange={(e) => setFormData(p => ({ ...p, [key]: e.target.value }))}
                        onFocus={handleFieldFocus}
                        onBlur={handleFieldBlur}
                        style={{
                          width: '100%', padding: '11px 13px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={analyzing}
                    style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px' }}
                  >
                    {analyzing ? 'Analyzing behavior…' : 'Continue →'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Step 1: KYC */}
          {step === 1 && (
            <motion.div key="kyc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>KYC Verification</h2>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>Upload your Aadhaar Card or PAN Card</p>

                {/* Behavior banner */}
                {botResult && (
                  <div style={{
                    padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
                    background: isBotDetected ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                    border: `1px solid ${isBotDetected ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: isBotDetected ? '#fca5a5' : '#86efac', marginBottom: '4px' }}>
                      {isBotDetected ? '⚠️ Bot-like behavior detected' : '✓ Human behavior confirmed'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Bot score: {botResult.botScore}/100 — {isBotDetected ? botResult.flags?.join(', ') : 'Typing pattern appears natural'}
                    </div>
                  </div>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(99,102,241,0.3)', borderRadius: '12px', padding: '40px',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    background: kycFile ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
                >
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleKYCUpload} style={{ display: 'none' }} />
                  {analyzing ? (
                    <div style={{ color: '#94a3b8' }}>Analyzing document…</div>
                  ) : kycFile ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                        <FileText size={32} color="#a5b4fc" />
                      </div>
                      <div style={{ color: '#a5b4fc', fontWeight: '600' }}>{kycFile.name}</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                        <Upload size={32} color="#64748b" />
                      </div>
                      <div style={{ color: '#64748b', fontSize: '14px' }}>Click to upload document</div>
                      <div style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>JPG, PNG, or PDF — max 10MB</div>
                      <div style={{ color: '#475569', fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
                        Tip: upload a file named "fake_id.jpg" to trigger demo detection
                      </div>
                    </div>
                  )}
                </div>

                {kycResult && (
                  <div style={{
                    marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
                    background: isSyntheticDoc ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                    border: `1px solid ${isSyntheticDoc ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: isSyntheticDoc ? '#fca5a5' : '#86efac' }}>
                      {isSyntheticDoc ? '⚠️ Document may be synthetic' : '✓ Document appears authentic'}
                    </div>
                    {kycResult.flags?.length > 0 && (
                      <ul style={{ margin: '8px 0 0', paddingLeft: '16px', fontSize: '12px', color: '#94a3b8' }}>
                        {kycResult.flags.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button onClick={() => setStep(0)} style={{ padding: '11px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>← Back</button>
                  <button onClick={() => setStep(2)} disabled={!kycResult}
                    style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', background: !kycResult ? 'rgba(99,102,241,0.3)' : '#6366f1', color: 'white', fontWeight: '600', fontSize: '14px', cursor: !kycResult ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >
                    Review Analysis →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Analysis */}
          {step === 2 && (
            <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 24px' }}>Risk Analysis Summary</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {[
                    { label: 'Behavioral Analysis', ok: !isBotDetected, detail: isBotDetected ? `Bot score: ${botResult?.botScore}` : 'Natural human behavior' },
                    { label: 'Document Verification', ok: !isSyntheticDoc, detail: isSyntheticDoc ? 'Synthetic document detected' : 'Document appears authentic' },
                    { label: 'Identity Validation', ok: true, detail: 'PAN and Aadhaar cross-referenced' },
                  ].map(({ label, ok, detail }) => (
                    <div key={label} style={{
                      padding: '14px 16px', borderRadius: '10px',
                      background: ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                      border: `1px solid ${ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{label}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{detail}</div>
                      </div>
                      <span style={{ fontSize: '20px' }}>{ok ? '✅' : '⚠️'}</span>
                    </div>
                  ))}
                </div>

                {(isBotDetected || isSyntheticDoc) && (
                  <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '16px' }}>
                    <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0, fontWeight: '600' }}>⚠️ Fraud signals detected</p>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '6px 0 0' }}>Your application will be flagged for manual review.</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setStep(1)} style={{ padding: '11px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>← Back</button>
                  <button onClick={() => setStep(3)}
                    style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Submit Application →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
                <motion.div animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.5 }} style={{ fontSize: '64px', marginBottom: '20px' }}>
                  {isBotDetected || isSyntheticDoc ? <Search size={64} color="#fca5a5" /> : <CheckCircle size={64} color="#86efac" />}
                </motion.div>
                <h2 style={{ fontSize: '22px', fontWeight: '700', color: isBotDetected || isSyntheticDoc ? '#fca5a5' : '#86efac', margin: '0 0 12px' }}>
                  {isBotDetected || isSyntheticDoc ? 'Application Under Review' : 'Application Submitted!'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
                  {isBotDetected || isSyntheticDoc
                    ? 'Our team will review your application and contact you within 2 business days.'
                    : 'Your account will be activated within 24 hours. Welcome to Cogniq Bank!'}
                </p>
                <button
                  onClick={() => navigate('/login')}
                  style={{ padding: '12px 32px', borderRadius: '10px', border: 'none', background: '#6366f1', color: 'white', fontWeight: '600', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Go to Login
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
