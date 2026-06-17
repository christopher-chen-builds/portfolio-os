const API_BASE = 'http://localhost:3457/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Companies
  getCompanies: () => request('/companies'),
  getCompany: (id) => request(`/companies/${id}`),
  createCompany: (data) => request('/companies', { method: 'POST', body: data }),
  updateCompany: (id, data) => request(`/companies/${id}`, { method: 'PUT', body: data }),

  // Metrics
  getMetrics: (companyId) => request(`/companies/${companyId}/metrics`),
  addMetric: (companyId, data) =>
    request(`/companies/${companyId}/metrics`, { method: 'POST', body: data }),

  // Plans
  getPlans: (companyId) => request(`/companies/${companyId}/plans`),
  setPlan: (companyId, data) =>
    request(`/companies/${companyId}/plans`, { method: 'POST', body: data }),

  // Alerts
  getAlerts: (companyId) => request(`/companies/${companyId}/alerts`),
  getAllAlerts: () => request('/alerts'),
  acknowledgeAlert: (id) =>
    request(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  resolveAlert: (id, note) =>
    request(`/alerts/${id}/resolve`, { method: 'POST', body: { resolution_note: note } }),

  // Dashboard
  getDashboard: () => request('/dashboard'),
};