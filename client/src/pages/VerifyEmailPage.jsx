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
      login(data);
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
        <p>Email не указан.</p>
        <Link to="/login">На страницу входа</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Подтверждение почты</h1>
      <p>Введите 6-значный код, отправленный на {email}</p>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          pattern="\d{6}"
          required
        />
        <button type="submit" disabled={loading || code.length !== 6}>
          {loading ? '...' : 'Подтвердить'}
        </button>
      </form>
    </div>
  );
}
