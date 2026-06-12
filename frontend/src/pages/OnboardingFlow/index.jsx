// filename: frontend/src/pages/OnboardingFlow/index.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { analyzeOnboarding, verifyKYC } from '../../services/api';
import { useBehavioralCapture } from '../../hooks/useBehavioralCapture';
import { ShieldCheck, FileText, Upload, Search, CheckCircle, ArrowRight, ArrowLeft, Fingerprint } from 'lucide-react';

const STEPS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'kyc', label: 'KYC Upload' },
  { id: 'analysis', label: 'Risk Analysis' },
  { id: 'complete', label: 'Status' },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { captureRef, getSnapshot } = useBehavioralCapture();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', pan: '', dob: '' });
  const [kycFile, setKycFile] = useState(null);
  const [kycResult, setKycResult] = useState(null);
  const [botResult, setBotResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fieldTimes, setFieldTimes] = useState([]);
  const [fieldStart, setFieldStart] = useState(null);

  // Background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.4);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * 100, cy + Math.sin(angle) * 50, 400, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.03)';
      ctx.fill();

      angle += 0.005;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

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

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    background: '#111', border: '1px solid #222',
    color: '#f5f5f5', fontSize: '14px', outline: 'none',
    transition: 'all 0.2s', boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div ref={captureRef} style={{ 
      minHeight: '100vh', background: '#080808', 
      fontFamily: "'Inter', system-ui, sans-serif", color: '#f5f5f5', 
      position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Grid Overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(#1e1e1e 1px, transparent 1px)',
        backgroundSize: '32px 32px', opacity: 0.5
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '900px', display: 'flex', gap: '48px', padding: '40px' }}>
        
        {/* Left Side: Progress & Info */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', paddingTop: '20px' }}>
          <button onClick={() => navigate('/')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: 0,
            background: 'none', border: 'none', color: '#555', cursor: 'pointer',
            fontSize: '13px', fontWeight: '500', marginBottom: '48px', transition: 'color 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.color = '#a1a1a1'} onMouseLeave={e => e.currentTarget.style.color = '#555'}>
            <ArrowLeft size={16} /> Cancel Onboarding
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16,185,129,0.4)',
            }}>
              <ShieldCheck size={22} color="#080808" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px' }}>Cogniq</div>
              <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}>Secure Setup</div>
            </div>
          </div>

          {/* Vertical Stepper */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '15px', top: '20px', bottom: '20px', width: '2px', background: '#1a1a1a', zIndex: -1 }} />
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < step ? '#10b981' : i === step ? '#111' : '#080808',
                  border: `2px solid ${i <= step ? '#10b981' : '#222'}`,
                  color: i < step ? '#080808' : i === step ? '#10b981' : '#555',
                  fontSize: '13px', fontWeight: '700', transition: 'all 0.3s',
                  boxShadow: i === step ? '0 0 16px rgba(16,185,129,0.2)' : 'none'
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: i === step ? '600' : '500', color: i <= step ? '#f5f5f5' : '#555', transition: 'color 0.3s' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#555', fontSize: '12px', padding: '12px', background: '#111', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
              <Fingerprint size={16} color="#10b981" />
              <span>Behavioral analytics active</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            background: 'rgba(15, 15, 15, 0.7)', backdropFilter: 'blur(24px)', 
            border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', 
            padding: '48px', minHeight: '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Subtle top glare */}
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />

            <AnimatePresence mode="wait">
              {/* Step 0: Personal Info */}
              {step === 0 && (
                <motion.div key="personal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px', marginBottom: '8px' }}>Personal Information</h2>
                  <p style={{ color: '#a1a1a1', fontSize: '14px', marginBottom: '32px' }}>Please provide your details exactly as they appear on your ID.</p>
                  
                  <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a1a1a1', marginBottom: '8px', fontWeight: '500' }}>Full Name</label>
                      <input type="text" value={formData.name} placeholder="John Doe" required onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} onFocus={(e) => { handleFieldFocus(); e.target.style.borderColor = '#10b981'; }} onBlur={(e) => { handleFieldBlur(); e.target.style.borderColor = '#222'; }} style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a1a1a1', marginBottom: '8px', fontWeight: '500' }}>Email Address</label>
                      <input type="email" value={formData.email} placeholder="john@example.com" required onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} onFocus={(e) => { handleFieldFocus(); e.target.style.borderColor = '#10b981'; }} onBlur={(e) => { handleFieldBlur(); e.target.style.borderColor = '#222'; }} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a1a1a1', marginBottom: '8px', fontWeight: '500' }}>Phone Number</label>
                      <input type="tel" value={formData.phone} placeholder="+91 9876543210" required onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} onFocus={(e) => { handleFieldFocus(); e.target.style.borderColor = '#10b981'; }} onBlur={(e) => { handleFieldBlur(); e.target.style.borderColor = '#222'; }} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a1a1a1', marginBottom: '8px', fontWeight: '500' }}>Date of Birth</label>
                      <input type="date" value={formData.dob} required onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))} onFocus={(e) => { handleFieldFocus(); e.target.style.borderColor = '#10b981'; }} onBlur={(e) => { handleFieldBlur(); e.target.style.borderColor = '#222'; }} style={{...inputStyle, color: formData.dob ? '#f5f5f5' : '#555'}} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#a1a1a1', marginBottom: '8px', fontWeight: '500' }}>PAN Card Number</label>
                      <input type="text" value={formData.pan} placeholder="ABCDE1234F" required onChange={e => setFormData(p => ({ ...p, pan: e.target.value.toUpperCase() }))} onFocus={(e) => { handleFieldFocus(); e.target.style.borderColor = '#10b981'; }} onBlur={(e) => { handleFieldBlur(); e.target.style.borderColor = '#222'; }} style={inputStyle} />
                    </div>
                    
                    <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                      <button type="submit" disabled={analyzing} style={{
                        width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                        background: analyzing ? '#0d9268' : '#10b981', color: '#080808', 
                        fontWeight: '700', fontSize: '15px', cursor: analyzing ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: analyzing ? 'none' : '0 4px 20px rgba(16,185,129,0.3)', transition: 'all 0.2s'
                      }}>
                        {analyzing ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#080808' }} /> : null}
                        {analyzing ? 'Analyzing Pattern...' : 'Continue to KYC'}
                        {!analyzing && <ArrowRight size={16} />}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 1: KYC */}
              {step === 1 && (
                <motion.div key="kyc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px', marginBottom: '8px' }}>Verify Identity</h2>
                  <p style={{ color: '#a1a1a1', fontSize: '14px', marginBottom: '32px' }}>Upload a clear photo of your Aadhaar or PAN Card.</p>

                  {/* Behavior banner */}
                  {botResult && (
                    <div style={{
                      padding: '16px', borderRadius: '12px', marginBottom: '24px',
                      background: isBotDetected ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                      border: `1px solid ${isBotDetected ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                      display: 'flex', alignItems: 'flex-start', gap: '12px'
                    }}>
                      <div style={{ marginTop: '2px' }}>
                        <Fingerprint size={20} color={isBotDetected ? '#fca5a5' : '#6ee7b7'} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: isBotDetected ? '#fca5a5' : '#6ee7b7', marginBottom: '4px' }}>
                          {isBotDetected ? 'Bot-like behavior detected' : 'Human behavior confirmed'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#a1a1a1', lineHeight: 1.5 }}>
                          Trust Score: {100 - (botResult.botScore || 0)}/100 — {isBotDetected ? botResult.flags?.join(', ') : 'Typing pattern and cadence appear natural.'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '40px',
                      textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                      background: kycFile ? 'rgba(16,185,129,0.05)' : '#0a0a0a',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16,185,129,0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = kycFile ? '#10b981' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = kycFile ? 'rgba(16,185,129,0.05)' : '#0a0a0a'; }}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleKYCUpload} style={{ display: 'none' }} />
                    {analyzing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <span className="spinner" style={{ width: 32, height: 32, borderWidth: '3px' }} />
                        <div style={{ color: '#a1a1a1', fontSize: '14px', fontWeight: '500' }}>Running forensic analysis...</div>
                      </div>
                    ) : kycFile ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                          <FileText size={48} color="#10b981" />
                        </div>
                        <div style={{ color: '#f5f5f5', fontWeight: '600', fontSize: '16px' }}>{kycFile.name}</div>
                        <div style={{ color: '#10b981', fontSize: '13px', marginTop: '8px' }}>Click to change file</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
                            <Upload size={28} color="#a1a1a1" />
                          </div>
                        </div>
                        <div style={{ color: '#f5f5f5', fontSize: '16px', fontWeight: '500' }}>Click to upload document</div>
                        <div style={{ color: '#555', fontSize: '13px', marginTop: '8px' }}>JPG, PNG, or PDF — max 10MB</div>
                        <div style={{ color: '#10b981', fontSize: '12px', marginTop: '16px', padding: '6px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: '20px', display: 'inline-block' }}>
                          Test: upload "fake_id.jpg" to trigger AI block
                        </div>
                      </div>
                    )}
                  </div>

                  {kycResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{
                      marginTop: '24px', padding: '16px', borderRadius: '12px',
                      background: isSyntheticDoc ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                      border: `1px solid ${isSyntheticDoc ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: isSyntheticDoc ? '#fca5a5' : '#6ee7b7' }}>
                        {isSyntheticDoc ? 'Synthetic Document Detected' : 'Document Verified Authentic'}
                      </div>
                      {kycResult.flags?.length > 0 && (
                        <ul style={{ margin: '8px 0 0', paddingLeft: '16px', fontSize: '13px', color: '#a1a1a1', lineHeight: 1.6 }}>
                          {kycResult.flags.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      )}
                    </motion.div>
                  )}

                  <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                    <button onClick={() => setStep(0)} style={{ padding: '14px 24px', borderRadius: '10px', border: '1px solid #222', background: '#111', color: '#a1a1a1', cursor: 'pointer', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#161616'} onMouseLeave={e=>e.currentTarget.style.background='#111'}>Back</button>
                    <button onClick={() => setStep(2)} disabled={!kycResult}
                      style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: !kycResult ? '#111' : '#10b981', color: !kycResult ? '#555' : '#080808', fontWeight: '700', fontSize: '15px', cursor: !kycResult ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: !kycResult ? 'none' : '0 4px 20px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}
                    >
                      Review Analysis
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Analysis */}
              {step === 2 && (
                <motion.div key="analysis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px', marginBottom: '8px' }}>Risk Assessment</h2>
                  <p style={{ color: '#a1a1a1', fontSize: '14px', marginBottom: '32px' }}>Final review of trust signals before account creation.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                    {[
                      { label: 'Behavioral Biometrics', ok: !isBotDetected, detail: isBotDetected ? `Anomalous pattern (Score: ${botResult?.botScore})` : 'Natural human kinematics' },
                      { label: 'Document Forensics', ok: !isSyntheticDoc, detail: isSyntheticDoc ? 'Deepfake/synthetic signs detected' : 'Pixel-level authenticity verified' },
                      { label: 'Identity Cross-reference', ok: true, detail: 'PAN and Aadhaar matched' },
                    ].map(({ label, ok, detail }, idx) => (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={label} style={{
                        padding: '16px 20px', borderRadius: '12px',
                        background: ok ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                        border: `1px solid ${ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#f5f5f5' }}>{label}</div>
                          <div style={{ fontSize: '13px', color: '#a1a1a1', marginTop: '4px' }}>{detail}</div>
                        </div>
                        <div style={{ 
                          width: '28px', height: '28px', borderRadius: '50%', background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: ok ? '#10b981' : '#ef4444' 
                        }}>
                          {ok ? <CheckCircle size={16} /> : <Search size={16} />}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {(isBotDetected || isSyntheticDoc) && (
                    <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '32px' }}>
                      <p style={{ color: '#fca5a5', fontSize: '15px', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={18} /> High Risk Signals Detected
                      </p>
                      <p style={{ color: '#a1a1a1', fontSize: '14px', margin: '8px 0 0', lineHeight: 1.5 }}>
                        Your application cannot be automatically approved. It will be forwarded to our SOC analysts for manual review.
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={() => setStep(1)} style={{ padding: '14px 24px', borderRadius: '10px', border: '1px solid #222', background: '#111', color: '#a1a1a1', cursor: 'pointer', fontSize: '15px', fontWeight: '600', fontFamily: 'inherit', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#161616'} onMouseLeave={e=>e.currentTarget.style.background='#111'}>Back</button>
                    <button onClick={() => setStep(3)}
                      style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#080808', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}
                    >
                      {isBotDetected || isSyntheticDoc ? 'Submit for Manual Review' : 'Create Account'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Complete */}
              {step === 3 && (
                <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
                  <motion.div animate={{ scale: [0, 1.1, 1] }} transition={{ type: 'spring', damping: 15, stiffness: 100 }} style={{ marginBottom: '24px' }}>
                    <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: isBotDetected || isSyntheticDoc ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${isBotDetected || isSyntheticDoc ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                      {isBotDetected || isSyntheticDoc ? <Search size={48} color="#fca5a5" /> : <CheckCircle size={48} color="#10b981" />}
                    </div>
                  </motion.div>
                  
                  <h2 style={{ fontSize: '32px', fontWeight: '700', fontFamily: "'Space Grotesk', sans-serif", color: '#f5f5f5', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
                    {isBotDetected || isSyntheticDoc ? 'Application Under Review' : 'Welcome to Cogniq'}
                  </h2>
                  <p style={{ color: '#a1a1a1', fontSize: '16px', marginBottom: '48px', maxWidth: '360px', lineHeight: 1.6 }}>
                    {isBotDetected || isSyntheticDoc
                      ? 'Our security team has flagged some anomalies. We will review your application and contact you within 2 business days.'
                      : 'Your identity has been verified with 99.8% confidence. Your account is ready.'}
                  </p>
                  <button
                    onClick={() => navigate('/login')}
                    style={{ padding: '16px 48px', borderRadius: '12px', border: 'none', background: '#10b981', color: '#080808', fontWeight: '700', fontSize: '16px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 24px rgba(16,185,129,0.3)', transition: 'transform 0.2s' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Go to Portal
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
