import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
// Ensure the URL always has a protocol (guards against missing https:// in env vars)
const BASE_URL = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach JWT token from persisted auth store
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('vinaphone-auth');
    if (raw) {
      const token = (JSON.parse(raw) as { state?: { token?: string } }).state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore JSON parse errors
  }
  return config;
});

// Redirect to /login on 401, but NOT when the login endpoint itself fails
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('vinaphone-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
