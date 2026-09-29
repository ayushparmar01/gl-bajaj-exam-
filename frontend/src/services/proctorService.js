import api from './api';

export const proctorService = {
  // Student Session Lifecycle API
  initSession: async (attemptId) => {
    return api.post(`/proctor/sessions/${attemptId}/init`);
  },

  sendHeartbeat: async (attemptId, data = {}) => {
    return api.post(`/proctor/sessions/${attemptId}/heartbeat`, data);
  },

  recordEvent: async (attemptId, eventType, metadata = {}) => {
    return api.post(`/proctor/sessions/${attemptId}/events`, { eventType, metadata });
  },

  getWarnings: async (attemptId) => {
    return api.get(`/proctor/sessions/${attemptId}/warnings`);
  },

  actionWarning: async (warningId, action) => {
    return api.post(`/proctor/warnings/${warningId}/action`, { action });
  },

  endSession: async (attemptId, data = {}) => {
    return api.post(`/proctor/sessions/${attemptId}/end`, data);
  },

  getSession: async (attemptId) => {
    return api.get(`/proctor/sessions/${attemptId}`);
  },

  // Admin Live Monitoring & Interventions API
  getLiveSessions: async (examId = 'ALL') => {
    const params = examId && examId !== 'ALL' ? { examId } : {};
    return api.get('/proctor/live-sessions', { params });
  },

  disqualifySession: async (attemptId, reason) => {
    return api.post(`/proctor/sessions/${attemptId}/disqualify`, { reason });
  },

  grantExtraTime: async (attemptId, minutes) => {
    return api.post(`/proctor/sessions/${attemptId}/grant-time`, { minutes });
  },

  resetWarnings: async (attemptId) => {
    return api.post(`/proctor/sessions/${attemptId}/reset-warnings`);
  },

  sendProctorMessage: async (attemptId, message) => {
    return api.post(`/proctor/sessions/${attemptId}/send-message`, { message });
  }
};

export default proctorService;
