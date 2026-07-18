import axios from 'axios';

// Backend points to FastAPI server
const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT token into headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nurevo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle auth failure (401) by logging out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('nurevo_token');
      localStorage.removeItem('nurevo_user');
      localStorage.removeItem('nurevo_workspace');
      // Force reload to redirect to sign-in page if authenticated session fails
      if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);
