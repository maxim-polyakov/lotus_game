import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import TutorialModal from '../components/TutorialModal';

export default function HomePage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound } = useSettings();
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <div className="home-page">
      <header>
        {user ? (
          <>
            <h1 className="header-logo">
              <img src="/lotus.jpg" alt="Lotus Game" />
              Lotus Game
            </h1>
            <div className="header-actions">
              <span className="header-username">{user.username}</span>
            <Link to="/decks" className="btn btn-primary">Колоды</Link>
            <Link to="/play" className="btn btn-primary">Играть</Link>
            <Link to="/profile" className="btn btn-outline">Профиль</Link>
            {user.roles?.includes('ROLE_ADMIN') && (
              <Link to="/admin" className="btn btn-outline">Админ</Link>
            )}
            <button onClick={() => setTutorialOpen(true)} className="btn btn-outline">Правила</button>
            <button onClick={toggleTheme} className="btn btn-outline btn-sm" title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} aria-label="Тема">
              {theme === 'dark' ? '☀' : '🌙'}
            </button>
            <button onClick={toggleSound} className="btn btn-outline btn-sm" title={soundEnabled ? 'Выключить звук' : 'Включить звук'} aria-label="Звук">
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button onClick={logout} className="btn btn-secondary">Выйти</button>
          </div>
          </>
        ) : (
          <>
            <h1 className="header-logo">
              <img src="/lotus.jpg" alt="Lotus Game" />
              Lotus Game
            </h1>
            <div className="header-actions">
              <button onClick={() => setTutorialOpen(true)} className="btn btn-outline">Правила</button>
              <button onClick={toggleTheme} className="btn btn-outline btn-sm" title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} aria-label="Тема">
                {theme === 'dark' ? '☀' : '🌙'}
              </button>
              <button onClick={toggleSound} className="btn btn-outline btn-sm" title={soundEnabled ? 'Выключить звук' : 'Включить звук'} aria-label="Звук">
                {soundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
          </>
        )}
      </header>
      <main>
        {user ? (
          <div className="welcome welcome-box">
            <h2>Добро пожаловать, {user.username}!</h2>
            <Link to="/play" className="btn btn-primary btn-lg">Найти матч</Link>
            <button onClick={() => setTutorialOpen(true)} className="btn btn-outline btn-lg">Правила</button>
          </div>
        ) : (
          <div className="welcome welcome-box">
            <h1 className="welcome-logo">
              <img src="/lotus.jpg" alt="Lotus Game" />
              Lotus Game
            </h1>
            <p>Войдите или зарегистрируйтесь, чтобы играть.</p>
            <div className="welcome-buttons">
              <Link to="/login" className="btn btn-primary btn-lg">Вход</Link>
              <Link to="/register" className="btn btn-outline btn-lg">Регистрация</Link>
              <button onClick={() => setTutorialOpen(true)} className="btn btn-outline btn-lg">Правила</button>
            </div>
          </div>
        )}
      </main>
      <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </div>
  );
}
