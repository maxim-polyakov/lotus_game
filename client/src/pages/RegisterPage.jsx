import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api/client';

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
          <div className="auth-google-section">
            <a href={`${API_BASE}/oauth2/authorization/google`} className="btn btn-google" type="button">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 6.168-2.172l-2.908-2.258c-.806.54-1.837.86-3.26.86-2.513 0-4.646-1.697-5.696-4.03H.276v2.33C1.98 15.983 5.316 18 9 18z"/>
                <path fill="#FBBC05" d="M3.304 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V6.29H.276C-.23 7.174-.5 8.068-.5 9c0 .932.27 1.826.744 2.62l2.56-1.97z"/>
                <path fill="#EA4335" d="M9 3.58c1.414 0 2.69.486 3.696 1.418l2.76-2.764C13.463.696 11.426 0 9 0 5.316 0 1.98 2.017.276 4.83L3.304 7.1C4.354 4.767 6.487 3.07 9 3.07z"/>
              </svg>
              Зарегистрироваться через Google
            </a>
          </div>
          <div className="auth-divider">или</div>
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
