// filename: frontend/src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import DevicesPage from './pages/DevicesPage';
import OnboardingFlow from './pages/OnboardingFlow';

const AnalystDashboard = lazy(() => import('./pages/AnalystDashboard'));

// ─── Protected Route ──────────────────────────────────────────────────────────

function ProtectedRoute({ children, requiresEmployee = false }) {
  const token = localStorage.getItem('tp_access_token');
  if (!token) return <Navigate to="/login" replace />;

  if (requiresEmployee) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isEmployee = payload.isEmployee === true;
      if (!isEmployee) return <Navigate to="/dashboard" replace />;
    } catch {
      // If decode fails, server will reject
    }
  }

  return children;
}

// ─── Loading fallback ─────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0b14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid #6366f1',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Root → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/onboard" element={<OnboardingFlow />} />

          {/* Customer routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <DevicesPage />
              </ProtectedRoute>
            }
          />

          {/* Analyst dashboard — employee only */}
          <Route
            path="/analyst"
            element={
              <ProtectedRoute requiresEmployee>
                <AnalystDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
