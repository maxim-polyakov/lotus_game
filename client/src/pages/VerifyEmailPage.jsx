import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const email = location.state?.email || '';
  const rememberMe = location.state?.rememberMe ?? false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email не указан. Вернитесь на страницу входа.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/verify-email', { email, code });
      login(data, rememberMe);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="auth-page">
        <div className="auth-wrapper">
          <div className="auth-card">
            <p>Email не указан.</p>
            <p className="auth-footer"><Link to="/login">На страницу входа</Link></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-illustration">
          <img src="/login-illustration.svg" alt="" />
        </div>
        <div className="auth-card">
          <h1>Подтверждение почты</h1>
        <p className="auth-subtitle">Введите 6-значный код, отправленный на<br /><strong>{email}</strong></p>
        <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}
          <div className="form-group">
            <input
              className="code-input"
              type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            pattern="\d{6}"
            required
            />
          </div>
          <button type="submit" disabled={loading || code.length !== 6}>
            {loading ? 'Проверка...' : 'Подтвердить'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
