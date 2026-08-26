import api from '../api/client';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';
import { session } from '../game/shared';

export async function loadCurrentUser() {
  const refresh = getRefreshToken();
  const access = getAccessToken();
  if (!refresh && !access) return null;

  try {
    if (refresh) {
      const { data } = await api.post('/api/auth/refresh', { refreshToken: refresh });
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      setTokens(data.accessToken, data.refreshToken, rememberMe);
    }
    const { data } = await api.get('/api/me');
    session.user = data;
    return data;
  } catch {
    clearTokens();
    session.user = null;
    return null;
  }
}

export async function loginUser(usernameOrEmail, password, rememberMe) {
  const { data } = await api.post('/api/auth/login', { usernameOrEmail, password });
  if (data?.requiresEmailVerification) {
    throw new Error('Email не подтверждён. Откройте экран подтверждения.');
  }
  setTokens(data.accessToken, data.refreshToken, rememberMe);
  const { data: me } = await api.get('/api/me');
  session.user = me;
  return me;
}

export async function completeOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  if (params.get('oauth') === 'google' && code) {
    const { data } = await api.get(`/api/auth/oauth-tokens?code=${encodeURIComponent(code)}`);
    setTokens(data.accessToken, data.refreshToken, true);
    window.history.replaceState({}, '', '/');
    return loadCurrentUser();
  }
  if (accessToken && refreshToken) {
    setTokens(accessToken, refreshToken, true);
    window.history.replaceState({}, '', '/');
    return loadCurrentUser();
  }
  return null;
}
