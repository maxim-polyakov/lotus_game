import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
});

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
    if (err.response?.status === 401) {
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken: refresh });
          const rememberMe = localStorage.getItem('rememberMe') === 'true';
          setTokens(data.accessToken, data.refreshToken, rememberMe);
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api.request(err.config);
        } catch (_) {
          clearTokens();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_BASE };
