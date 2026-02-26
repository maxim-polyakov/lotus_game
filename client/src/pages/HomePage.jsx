import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="home-page">
      <header>
        <h1 className="header-logo">
          <img src="/lotus.jpg" alt="Lotus Game" />
          Lotus Game
        </h1>
        {user ? (
          <div className="header-actions">
            <span className="header-username">{user.username}</span>
            <Link to="/decks" className="btn btn-primary">Колоды</Link>
            <Link to="/play" className="btn btn-primary">Играть</Link>
            {user.roles?.includes('ROLE_ADMIN') && (
              <Link to="/admin" className="btn btn-outline">Админ</Link>
            )}
            <button onClick={logout} className="btn btn-secondary">Выйти</button>
          </div>
        ) : (
          <div className="header-actions">
            <Link to="/login" className="btn btn-primary">Вход</Link>
            <Link to="/register" className="btn btn-outline">Регистрация</Link>
          </div>
        )}
      </header>
      <main>
        {user ? (
          <div className="welcome">
            <h2>Добро пожаловать, {user.username}!</h2>
            <Link to="/play" className="btn btn-primary">Найти матч</Link>
          </div>
        ) : (
          <div className="welcome">
            <p>Войдите или зарегистрируйтесь, чтобы играть.</p>
          </div>
        )}
      </main>
    </div>
  );
}
