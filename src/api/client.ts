import axios from "axios";
import qs from "qs";

const rawUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";
// Ensure the URL always has a protocol (guards against missing https:// in env vars)
const BASE_URL = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
  // Serialize arrays as repeated params: groupId=x&groupId=y (no brackets)
  paramsSerializer: (params) =>
    qs.stringify(params, { arrayFormat: "repeat", skipNulls: true }),
});

export function getAccessToken() {
  try {
    const raw = localStorage.getItem("vinaphone-auth");
    return raw
      ? (JSON.parse(raw) as { state?: { token?: string } }).state?.token
      : undefined;
  } catch {
    return undefined;
  }
}

// Attach JWT token from persisted auth store
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to /login on 401, but NOT when the login endpoint itself fails
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("vinaphone-auth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
