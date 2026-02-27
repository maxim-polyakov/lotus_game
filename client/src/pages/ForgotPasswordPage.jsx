import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      setSuccess(data.message || 'Если email зарегистрирован, на него отправлен код.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Не удалось отправить код.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/reset-password', {
        email,
        code,
        newPassword,
      });
      setSuccess(data.message || 'Пароль успешно изменён.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Не удалось сменить пароль.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1>Восстановление пароля</h1>
          {step === 1 ? (
            <>
              <p className="auth-subtitle">Введите email, на который зарегистрирован аккаунт</p>
              <form onSubmit={handleRequestCode}>
                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}
                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Отправка...' : 'Отправить код'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="auth-subtitle">
                Введите код из письма и новый пароль
              </p>
              <form onSubmit={handleResetPassword}>
                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} readOnly disabled className="readonly" />
                </div>
                <div className="form-group">
                  <label>Код из письма <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Новый пароль <span className="required">*</span></label>
                  <input
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label>Повторите пароль <span className="required">*</span></label>
                  <input
                    type="password"
                    placeholder="Повторите новый пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Сохранение...' : 'Сменить пароль'}
                </button>
              </form>
              <p className="auth-footer" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setStep(1);
                    setCode('');
                    setError('');
                    setSuccess('');
                  }}
                >
                  Запросить новый код
                </button>
              </p>
            </>
          )}
          <p className="auth-footer">
            <Link to="/login">Назад к входу</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
