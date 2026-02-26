import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', { username, email, password });
      navigate('/verify-email', { state: { email: data.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
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
          <h1>Регистрация</h1>
          <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}
          <div className="form-group">
            <label>Username <span className="required">*</span></label>
            <input
              type="text"
              placeholder="Enter your Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={2}
              required
            />
          </div>
          <div className="form-group">
            <label>Email <span className="required">*</span></label>
            <input
              type="email"
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              minLength={6}
              required
            />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Отправка...' : 'Зарегистрироваться'}</button>
        </form>
        <p className="auth-footer">
          У вас уже есть аккаунт? <Link to="/login">Вход</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
