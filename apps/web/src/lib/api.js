// apps/web/src/lib/api.js
const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('traza_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Error del servidor');
    err.status = res.status;
    err.upgrade = data.upgrade;
    throw err;
  }
  return data;
}

// ── Auth ──
export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

// ── Contacts ──
export const contacts = {
  list: () => request('/contacts'),
  create: (body) => request('/contacts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
};

// ── Alerts ──
export const alerts = {
  create: (body) => request('/alerts', { method: 'POST', body: JSON.stringify(body) }),
  list: (params) => request(`/alerts?${new URLSearchParams(params || {})}`),
  get: (id) => request(`/alerts/${id}`),
  resolve: (id) => request(`/alerts/${id}/resolve`, { method: 'PATCH' }),
};

// ── Tracking ──
export const tracking = {
  start: (body) => request('/tracking/start', { method: 'POST', body: JSON.stringify(body) }),
  pushPoint: (sessionId, body) => request(`/tracking/${sessionId}/point`, { method: 'POST', body: JSON.stringify(body) }),
  stop: (sessionId) => request(`/tracking/${sessionId}/stop`, { method: 'POST' }),
  lastSignal: () => request('/tracking/last-signal'),
  active: () => request('/tracking/active'),
  history: () => request('/tracking/history'),
};

// ── Evidence ──
export const evidence = {
  create: (body) => request('/evidence', { method: 'POST', body: JSON.stringify(body) }),
  list: (params) => request(`/evidence?${new URLSearchParams(params || {})}`),
  remove: (id) => request(`/evidence/${id}`, { method: 'DELETE' }),
  link: (id, alertId) => request(`/evidence/${id}/link`, { method: 'PATCH', body: JSON.stringify({ alertId }) }),
};

// ── Reminders ──
export const reminders = {
  list: (params) => request(`/reminders?${new URLSearchParams(params || {})}`),
  create: (body) => request('/reminders', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  complete: (id) => request(`/reminders/${id}/complete`, { method: 'PATCH' }),
  snooze: (id, minutes) => request(`/reminders/${id}/snooze`, { method: 'PATCH', body: JSON.stringify({ minutes }) }),
  remove: (id) => request(`/reminders/${id}`, { method: 'DELETE' }),
};

// ── Medications ──
export const medications = {
  list: () => request('/medications'),
  create: (body) => request('/medications', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/medications/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  confirmDose: (id, body) => request(`/medications/${id}/dose`, { method: 'POST', body: JSON.stringify(body) }),
  markMissed: (id, body) => request(`/medications/${id}/miss`, { method: 'POST', body: JSON.stringify(body) }),
  logs: (id) => request(`/medications/${id}/logs`),
  remove: (id) => request(`/medications/${id}`, { method: 'DELETE' }),
};

// ── Subscriptions ──
export const subscriptions = {
  plans: () => request('/subscriptions/plans'),
  me: () => request('/subscriptions/me'),
  upgrade: (planId) => request('/subscriptions/upgrade', { method: 'POST', body: JSON.stringify({ planId }) }),
  checkFeature: (feature) => request(`/subscriptions/check-feature/${feature}`),
};

// ── Settings ──
export const settings = {
  get: () => request('/settings'),
  update: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  getProfile: () => request('/settings/profile'),
  updateProfile: (body) => request('/settings/profile', { method: 'PUT', body: JSON.stringify(body) }),
};

// ── Audit ──
export const audit = {
  list: (limit) => request(`/audit?limit=${limit || 30}`),
};
