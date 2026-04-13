import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/** WebSocket URL. В production с nginx: /ws на том же домене. Локально: API_BASE/ws */
const WS_URL = process.env.REACT_APP_WS_URL || (() => {
  if (typeof window === 'undefined') return `${API_BASE}/ws`;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalhost ? `${API_BASE}/ws` : `${window.location.origin}/ws`;
})();

const api = axios.create({
  baseURL: API_BASE,
});

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');
    refreshPromise = axios
      .post(`${API_BASE}/api/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        setTokens(data.accessToken, data.refreshToken, rememberMe);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
    delete config.headers['Content-Length'];
    delete config.headers['content-length'];
  } else {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const originalRequest = err.config || {};
    const status = err.response?.status;

    if (!err.response && originalRequest.method?.toLowerCase() === 'get' && !originalRequest._networkRetry) {
      originalRequest._networkRetry = true;
      await new Promise((resolve) => setTimeout(resolve, 250));
      return api.request(originalRequest);
    }

    if ((status === 401 || status === 403) && !originalRequest._retry && !String(originalRequest.url || '').includes('/api/auth/refresh')) {
      const refresh = getRefreshToken();
      if (!refresh) {
        clearTokens();
        window.location.href = '/login?auth_error=session_expired';
        return Promise.reject(err);
      }

      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(originalRequest);
      } catch (_) {
        clearTokens();
        window.location.href = '/login?auth_error=session_expired';
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_BASE, WS_URL };
