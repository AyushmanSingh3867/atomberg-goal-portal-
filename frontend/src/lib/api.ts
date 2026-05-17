const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://atomberg-backend.onrender.com/api';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ag_token') : '';

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export const api = {
  get: async (path: string) => ({ data: await apiFetch(path) }),
  post: async (path: string, body?: any) => ({ data: await apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }) }),
  put: async (path: string, body?: any) => ({ data: await apiFetch(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }) }),
  delete: async (path: string) => ({ data: await apiFetch(path, { method: 'DELETE' }) }),
  auth: {
    login: (email: string, password: string) =>
      apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => apiFetch('/auth/me'),
    logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  },
  goals: {
    getActiveCycles: () => apiFetch('/goals/cycles/active'),
    getThrustAreas: () => apiFetch('/goals/thrust-areas'),
    submit: (cycle_id: string, goals: any[]) =>
      apiFetch('/goals/submit', { method: 'POST', body: JSON.stringify({ cycle_id, goals }) }),
  },
  windows: {
    getActive: () => apiFetch('/windows/active'),
  },
  achievements: {
    getMy: (windowId: string) => apiFetch(`/achievements/my/${windowId}`),
    submit: (goal_id: string, window_id: string, actual_value: string, status: string, employee_notes?: string) =>
      apiFetch('/achievements', { method: 'POST', body: JSON.stringify({ goal_id, window_id, actual_value, status, employee_notes }) }),
    update: (id: string, actual_value?: string, status?: string, employee_notes?: string) =>
      apiFetch(`/achievements/${id}`, { method: 'PUT', body: JSON.stringify({ actual_value, status, employee_notes }) }),
  },
  manager: {
    getPendingSheets: () => apiFetch('/manager/pending-sheets'),
    getSheet: (id: string) => apiFetch(`/manager/sheet/${id}`),
    approve: (sheetId: string) => apiFetch(`/manager/approve/${sheetId}`, { method: 'POST' }),
    returnSheet: (sheetId: string, comment: string) => apiFetch(`/manager/return/${sheetId}`, { method: 'POST', body: JSON.stringify({ comment }) }),
    getTeamGoals: () => apiFetch('/manager/team-goals'),
    createSharedGoal: (data: any) => apiFetch('/manager/shared-goals', { method: 'POST', body: JSON.stringify(data) }),
  },
  checkins: {
    getTeamCheckins: (windowId: string) => apiFetch(`/checkins/team/${windowId}`),
    postComment: (goal_sheet_id: string, window_id: string, comment: string) => apiFetch('/checkins/comment', { method: 'POST', body: JSON.stringify({ goal_sheet_id, window_id, comment }) }),
    getComment: (sheetId: string, windowId: string) => apiFetch(`/checkins/comment/${sheetId}/${windowId}`),
  },
  admin: {
    getAuditLogs: (page: number, limit: number) => apiFetch(`/admin/audit-logs?page=${page}&limit=${limit}`),
    unlockGoal: (id: string) => apiFetch(`/admin/goals/${id}/unlock`, { method: 'PUT' }),
    triggerEscalationScan: () => apiFetch('/admin/escalations/scan', { method: 'POST' }),
    getEscalations: () => apiFetch('/admin/escalations'),
  },
  reports: {
    getTable: (params: string) => apiFetch(`/reports/table?${params}`),
    getCompletion: () => apiFetch('/reports/completion'),
    getHeatmap: () => apiFetch('/reports/heatmap'),
  },
  notifications: {
    getAll: () => apiFetch('/notifications'),
    markRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => apiFetch('/notifications/read-all', { method: 'PUT' }),
  }
};
