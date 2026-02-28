import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isOAuthCallback = params.get('code') && params.get('oauth') === 'google';
    if (isOAuthCallback) {
      clearTokens();
      setLoading(false);
      return;
    }

    const refresh = getRefreshToken();
    const access = getAccessToken();

    if (!refresh && !access) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (refresh) {
          const { data } = await api.post('/api/auth/refresh', { refreshToken: refresh });
          const rememberMe = localStorage.getItem('rememberMe') === 'true';
          setTokens(data.accessToken, data.refreshToken, rememberMe);
        }
        const { data } = await api.get('/api/me');
        setUser(data);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (data, rememberMe = false) => {
    if (!data?.accessToken || !data?.refreshToken) {
      throw new Error('Токены не переданы');
    }
    setTokens(data.accessToken, data.refreshToken, rememberMe);
    try {
      const { data: me } = await api.get('/api/me');
      if (!me) throw new Error('Не удалось загрузить данные пользователя');
      setUser(me);
    } catch (err) {
      clearTokens();
      throw err;
    }
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const updateUser = (data) => setUser((prev) => (prev ? { ...prev, ...data } : data));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
