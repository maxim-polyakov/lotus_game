import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { usernameOrEmail, password });
      if (data.requiresEmailVerification) {
        navigate('/verify-email', { state: { email: data.email, rememberMe } });
      } else {
        login(data, rememberMe);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-illustration">
          <img src="/login-illustration.svg" alt="" />
        </div>
        <div className="auth-card">
          <h1>Вход</h1>
          <form onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}
            <div className="form-group">
              <label>Username <span className="required">*</span></label>
              <input
                type="text"
                placeholder="Enter your Username"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password <span className="required">*</span></label>
              <input
                type="password"
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <label className="form-check">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Вход...' : 'Авторизоваться'}
            </button>
          </form>
          <div className="auth-links">
            <Link to="/forgot-password">Забыли пароль?</Link>
            <Link to="/register">У вас нет аккаунта?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
