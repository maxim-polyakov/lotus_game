import React from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1>Восстановление пароля</h1>
          <p className="auth-subtitle">Функция в разработке</p>
          <p className="auth-footer"><Link to="/login">Назад к входу</Link></p>
        </div>
      </div>
    </div>
  );
}
