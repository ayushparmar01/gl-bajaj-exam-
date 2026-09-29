import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return '/api';
    }
  }
  return envUrl || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('exampro_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for global error formatting
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    let message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please check your network connection.';

    // If the error response is a Blob (e.g. from a failed file download), parse it to JSON
    if (error.response?.data instanceof Blob && (error.response.data.type?.includes('json') || error.response.data.type === '')) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        if (json.message) message = json.message;
      } catch (e) {
        // keep default message
      }
    }

    if (error.response?.status === 401) {
      // Clear token if invalid or expired
      if (localStorage.getItem('exampro_token')) {
        localStorage.removeItem('exampro_token');
        localStorage.removeItem('exampro_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject({
      status: error.response?.status,
      message,
      data: error.response?.data
    });
  }
);

export const getFullImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  let baseUrl = import.meta.env.VITE_API_URL || '';
  if (import.meta.env.PROD && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || !baseUrl)) {
    baseUrl = '';
  } else if (!import.meta.env.PROD && !baseUrl) {
    baseUrl = 'http://localhost:5000';
  }
  baseUrl = baseUrl.replace(/\/api\/?$/, '');
  return `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

export default api;
