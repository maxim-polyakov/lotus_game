import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="home-page">
      <header>
        <h1>Lotus Game</h1>
        {user ? (
          <div>
            <span>{user.username}</span>
            <Link to="/decks">Колоды</Link>
            <Link to="/play">Играть</Link>
            <button onClick={logout}>Выйти</button>
          </div>
        ) : (
          <div>
            <Link to="/login">Вход</Link>
            <Link to="/register">Регистрация</Link>
          </div>
        )}
      </header>
      <main>
        {user ? (
          <div className="welcome">
            <h2>Добро пожаловать, {user.username}!</h2>
            <Link to="/play" className="btn-primary">Найти матч</Link>
          </div>
        ) : (
          <p>Войдите или зарегистрируйтесь, чтобы играть.</p>
        )}
      </main>
    </div>
  );
}
