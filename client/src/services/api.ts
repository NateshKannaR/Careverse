const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('careverse_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async <T = any>(res: Response): Promise<T> => {
  if (!res.ok) {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      errorData = { error: text || `HTTP error ${res.status}` };
    }
    const error: any = new Error(errorData.error || `HTTP request failed with status ${res.status}`);
    error.response = { status: res.status, data: errorData };
    throw error;
  }
  return res.json().catch(() => ({}));
};

const normalizeUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api')) return url;
  return `/api${url.startsWith('/') ? url : `/${url}`}`;
};

export const api = {
  // Generic HTTP helpers compatible with axios conventions (e.g. res.data, err.response.data)
  get: async <T = any>(url: string) => {
    const res = await fetch(normalizeUrl(url), { headers: getAuthHeaders() });
    const data = await handleResponse<T>(res);
    return { data };
  },
  post: async <T = any>(url: string, body?: any) => {
    const res = await fetch(normalizeUrl(url), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await handleResponse<T>(res);
    return { data };
  },
  patch: async <T = any>(url: string, body?: any) => {
    const res = await fetch(normalizeUrl(url), {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await handleResponse<T>(res);
    return { data };
  },
  put: async <T = any>(url: string, body?: any) => {
    const res = await fetch(normalizeUrl(url), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await handleResponse<T>(res);
    return { data };
  },
  delete: async <T = any>(url: string) => {
    const res = await fetch(normalizeUrl(url), {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await handleResponse<T>(res);
    return { data };
  },

  // Auth
  auth: {
    login: (body: any) =>
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(handleResponse),
    register: (body: any) =>
      fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(handleResponse),
    demoLogin: (role: string) =>
      fetch('/api/auth/demo-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) }).then(handleResponse),
    getMe: () => fetch('/api/auth/me', { headers: getAuthHeaders() }).then(handleResponse)
  },

  // Patients
  patients: {
    getAccessible: () => fetch('/api/patients/accessible', { headers: getAuthHeaders() }).then<{ patients: any[] }>(handleResponse),
    getMe: () => fetch('/api/patients/me', { headers: getAuthHeaders() }).then<{ patient: any }>(handleResponse),
    getById: (id: string) => fetch(`/api/patients/${id}`, { headers: getAuthHeaders() }).then<{ patient: any }>(handleResponse),
    update: (id: string, body: any) =>
      fetch(`/api/patients/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse)
  },

  // Medications
  medications: {
    getAll: (patientId?: string, activeOnly?: boolean) => {
      const q = new URLSearchParams();
      if (patientId) q.append('patientId', patientId);
      if (activeOnly) q.append('active', 'true');
      return fetch(`/api/medications?${q.toString()}`, { headers: getAuthHeaders() }).then<{ medications: any[] }>(handleResponse);
    },
    create: (body: any) =>
      fetch('/api/medications', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse),
    update: (id: string, body: any) =>
      fetch(`/api/medications/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse),
    delete: (id: string) =>
      fetch(`/api/medications/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
    togglePause: (id: string) =>
      fetch(`/api/medications/${id}/pause`, { method: 'PATCH', headers: getAuthHeaders() }).then(handleResponse),
    getTodayDoses: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/medications/doses/today${q}`, { headers: getAuthHeaders() }).then<any>(handleResponse);
    },
    recordDose: (doseId: string, status: string, notes?: string) =>
      fetch(`/api/medications/doses/${doseId}/record`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, notes })
      }).then(handleResponse),
    getRefillForecast: (patientId?: string) => {
      const q = patientId ? `?patient_id=${patientId}` : '';
      return fetch(`/api/medications/refills/forecast${q}`, { headers: getAuthHeaders() }).then<any>(handleResponse);
    }
  },

  // Appointments
  appointments: {
    getAll: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/appointments${q}`, { headers: getAuthHeaders() }).then<{ appointments: any[] }>(handleResponse);
    },
    create: (body: any) =>
      fetch('/api/appointments', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse),
    update: (id: string, body: any) =>
      fetch(`/api/appointments/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse),
    delete: (id: string) =>
      fetch(`/api/appointments/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
    toggleChecklist: (id: string, taskIndex: number, completed: boolean) =>
      fetch(`/api/appointments/${id}/checklist`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ taskIndex, completed })
      }).then(handleResponse)
  },

  // Care Circle
  careCircle: {
    getMembers: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/care-circle${q}`, { headers: getAuthHeaders() }).then<{ members: any[]; invitations: any[] }>(handleResponse);
    },
    invite: (body: any) =>
      fetch('/api/care-circle/invite', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse),
    acceptInvite: (token: string) =>
      fetch('/api/care-circle/accept', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ token }) }).then(handleResponse),
    revokeMember: (memberId: string) =>
      fetch(`/api/care-circle/${memberId}`, { method: 'DELETE', headers: getAuthHeaders() }).then(handleResponse),
    updatePermissions: (memberId: string, permissions: any) =>
      fetch(`/api/care-circle/${memberId}/permissions`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(permissions) }).then(handleResponse)
  },

  // Wellbeing
  wellbeing: {
    getToday: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/wellbeing/today${q}`, { headers: getAuthHeaders() }).then<{ checkin: any }>(handleResponse);
    },
    getHistory: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/wellbeing/history${q}`, { headers: getAuthHeaders() }).then<{ checkins: any[] }>(handleResponse);
    },
    record: (body: any) =>
      fetch('/api/wellbeing', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse)
  },

  // Care Notes
  careNotes: {
    getAll: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/care-notes${q}`, { headers: getAuthHeaders() }).then<{ notes: any[] }>(handleResponse);
    },
    create: (body: any) =>
      fetch('/api/care-notes', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse)
  },

  // Notifications
  notifications: {
    getAll: () => fetch('/api/notifications', { headers: getAuthHeaders() }).then<{ notifications: any[] }>(handleResponse),
    getPreferences: () => fetch('/api/notifications/preferences', { headers: getAuthHeaders() }).then<{ preferences: any }>(handleResponse),
    updatePreferences: (body: any) =>
      fetch('/api/notifications/preferences', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse),
    getSimulatorLogs: () => fetch('/api/notifications/simulator', { headers: getAuthHeaders() }).then<any>(handleResponse),
    testSend: () => fetch('/api/notifications/test-send', { method: 'POST', headers: getAuthHeaders() }).then(handleResponse)
  },

  // CareBuddy AI Assistant
  careBuddy: {
    chat: (message: string, patientId?: string) =>
      fetch('/api/carebuddy/chat', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, patient_id: patientId })
      }).then<any>(handleResponse),
    getSummary: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/carebuddy/summary${q}`, { headers: getAuthHeaders() }).then<any>(handleResponse);
    },
    getDigest: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/carebuddy/digest${q}`, { headers: getAuthHeaders() }).then<any>(handleResponse);
    }
  },

  // Analytics
  analytics: {
    getAdherence: (days: number = 7, patientId?: string) => {
      const q = new URLSearchParams({ days: String(days) });
      if (patientId) q.append('patientId', patientId);
      return fetch(`/api/analytics/adherence?${q.toString()}`, { headers: getAuthHeaders() }).then<any>(handleResponse);
    },
    getDailyScore: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/analytics/daily-score${q}`, { headers: getAuthHeaders() }).then<any>(handleResponse);
    },
    getAdherencePatterns: (patientId?: string) => {
      const q = patientId ? `?patient_id=${patientId}` : '';
      return fetch(`/api/analytics/adherence-patterns${q}`, { headers: getAuthHeaders() }).then<any>(handleResponse);
    },
    getExportUrl: (patientId?: string) => `/api/analytics/export-csv${patientId ? `?patientId=${patientId}` : ''}`
  },

  // Emergency SOS
  emergency: {
    getContacts: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/emergency/contacts${q}`, { headers: getAuthHeaders() }).then<any>(handleResponse);
    },
    addContact: (body: any) =>
      fetch('/api/emergency/contacts', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(handleResponse),
    triggerSos: (patientId?: string) =>
      fetch('/api/emergency/sos', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ patient_id: patientId })
      }).then<any>(handleResponse),
    cancelSos: (patientId?: string) =>
      fetch('/api/emergency/cancel', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ patient_id: patientId })
      }).then<any>(handleResponse)
  },

  // Audit Logs
  audit: {
    getLogs: (patientId?: string) => {
      const q = patientId ? `?patientId=${patientId}` : '';
      return fetch(`/api/audit/logs${q}`, { headers: getAuthHeaders() }).then<{ logs: any[] }>(handleResponse);
    }
  },

  // System
  system: {
    getHealth: () => fetch('/api/system/health').then<any>(handleResponse),
    getStats: () => fetch('/api/system/stats').then<any>(handleResponse)
  }
};
