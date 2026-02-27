import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const login = async (data, rememberMe = false) => {
    setTokens(data.accessToken, data.refreshToken, rememberMe);
    try {
      const { data: me } = await api.get('/api/me');
      setUser(me);
    } catch (err) {
      clearTokens();
      throw err;
    }
  };

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
