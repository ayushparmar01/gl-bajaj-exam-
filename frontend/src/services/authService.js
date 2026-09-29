import api from './api';

export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  login: (credentials) => api.post('/auth/login', credentials),
  googleLogin: (data) => api.post('/auth/google', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  getStudents: () => api.get('/auth/students')
};
