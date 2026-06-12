// filename: frontend/src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const Landing          = lazy(() => import('./pages/Landing'));
const Login            = lazy(() => import('./pages/Login'));
const CustomerDashboard= lazy(() => import('./pages/CustomerDashboard'));
const AnalystDashboard = lazy(() => import('./pages/AnalystDashboard'));
const OnboardingFlow   = lazy(() => import('./pages/OnboardingFlow'));
const DevicesPage      = lazy(() => import('./pages/DevicesPage'));

// ─── Token helpers ────────────────────────────────────────────────────────────

function getTokenPayload() {
  try {
    const token = localStorage.getItem('tp_access_token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

// ─── Route guards ─────────────────────────────────────────────────────────────

function ProtectedRoute({ children, employeeOnly = false }) {
  const payload = getTokenPayload();
  if (!payload) return <Navigate to="/login" replace />;
  if (employeeOnly && !payload.isEmployee) return <Navigate to="/dashboard" replace />;
  return children;
}

// Redirect already-authenticated users away from login
function AuthRoute({ children }) {
  const payload = getTokenPayload();
  if (payload) {
    return <Navigate to={payload.isEmployee ? '/analyst' : '/dashboard'} replace />;
  }
  return children;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public landing */}
          <Route path="/" element={<Landing />} />

          {/* Auth */}
          <Route path="/login"   element={<AuthRoute><Login /></AuthRoute>} />
          <Route path="/onboard" element={<OnboardingFlow />} />

          {/* Customer */}
          <Route path="/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/devices"   element={<ProtectedRoute><DevicesPage /></ProtectedRoute>} />

          {/* Analyst */}
          <Route path="/analyst" element={<ProtectedRoute employeeOnly><AnalystDashboard /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
