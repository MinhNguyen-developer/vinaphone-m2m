import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

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

// Redirect to /login on 401
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vinaphone-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
