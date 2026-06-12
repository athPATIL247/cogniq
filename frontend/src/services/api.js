// filename: frontend/src/services/api.js
// Merged & unified API service — covers both analyst (agent4) and customer (agent5) endpoints.

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach auth token ───────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tp_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: handle 401 ────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tp_access_token');
      localStorage.removeItem('tp_refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const login = (payload) =>
  api.post('/auth/login', payload).then((r) => r.data);

export const mfaVerify = (payload) =>
  api.post('/auth/mfa/verify', payload).then((r) => r.data);

export const refreshToken = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken }).then((r) => r.data);

export const logout = async () => {
  const res = await api.post('/auth/logout').then((r) => r.data);
  localStorage.removeItem('tp_access_token');
  localStorage.removeItem('tp_refresh_token');
  return res;
};

export const getMe = () => api.get('/auth/me').then((r) => r.data);

// ─── DASHBOARD (analyst) ──────────────────────────────────────────────────────

export const getDashboardStats = () =>
  api.get('/dashboard/stats').then((r) => r.data);

export const getDashboardEvents = (params = {}) =>
  api.get('/dashboard/events', { params }).then((r) => r.data);

export const getActiveAlerts = (status = 'active') =>
  api.get('/dashboard/alerts', { params: { status } }).then((r) => r.data);

export const getAllAlerts = (params = {}) =>
  api.get('/dashboard/alerts', { params }).then((r) => r.data);

export const updateAlert = (id, payload) =>
  api.patch(`/dashboard/alerts/${id}`, payload).then((r) => r.data);

export const getUserTimeline = (userId, days = 30) =>
  api.get(`/dashboard/users/${userId}/timeline`, { params: { days } }).then((r) => r.data);

export const getEntityGraph = () =>
  api.get('/dashboard/graph').then((r) => r.data);

export const getAllUsers = (params = {}) =>
  api.get('/dashboard/users', { params }).then((r) => r.data);

// ─── RISK ─────────────────────────────────────────────────────────────────────

export const scoreAction = (payload) =>
  api.post('/risk/score', payload).then((r) => r.data);

export const scoreTransaction = (payload) =>
  api.post('/risk/transaction', payload).then((r) => r.data);

export const getRiskHistory = (userId, params = {}) =>
  api.get(`/risk/history/${userId}`, { params }).then((r) => r.data);

export const updateBehavioral = (sample) =>
  api.post('/risk/behavioral/update', { sample }).then((r) => r.data);

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export const getTransactions = (params = {}) =>
  api.get('/transactions', { params }).then((r) => r.data);

export const createTransaction = (payload) =>
  api.post('/transactions', payload).then((r) => r.data);

export const getAllTransactions = (params = {}) =>
  api.get('/transactions/all', { params }).then((r) => r.data);

// ─── DEVICES ──────────────────────────────────────────────────────────────────

export const getDevices = () =>
  api.get('/devices').then((r) => r.data);

export const registerDevice = (payload) =>
  api.post('/devices/register', payload).then((r) => r.data);

export const trustDevice = (id) =>
  api.patch(`/devices/${id}/trust`, {}).then((r) => r.data);

export const removeDevice = (id) =>
  api.delete(`/devices/${id}`).then((r) => r.data);

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

export const analyzeOnboarding = (payload) =>
  api.post('/onboarding/analyze', payload).then((r) => r.data);

export const verifyKYC = (formData) =>
  api.post('/onboarding/kyc/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export default api;
