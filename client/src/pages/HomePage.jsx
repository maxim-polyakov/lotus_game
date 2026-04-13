import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import TutorialModal from '../components/TutorialModal';
import NavDropdown from '../components/NavDropdown';

export default function HomePage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { soundEnabled, toggleSound } = useSettings();
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const isAdmin =
    Array.isArray(user?.roles) && user.roles.some((r) => r === 'ROLE_ADMIN');

  return (
    <div className="home-page">
      <header>
        {user ? (
          <>
            <h1 className="header-logo">
              <Link to="/play" className="header-logo-link">
                <img src="/lotus.jpg" alt="" />
                <span className="header-logo-text">Lotus Game</span>
              </Link>
            </h1>
            <span className="header-user">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="header-avatar" />
              ) : (
                <span className="header-avatar-placeholder">{user.username?.charAt(0)?.toUpperCase() || '?'}</span>
              )}
              <span className="header-username">{user.username}</span>
            </span>
            <div className="header-actions header-actions-auth">
              <div className="header-nav-tabs">
                <NavDropdown
                  label="Герои и колоды"
                  buttonClassName="nav-tab"
                  menuAlign="left"
                  items={[
                    { to: '/heroes', label: 'Герои' },
                    { to: '/decks', label: 'Колоды' },
                  ]}
                />
                <NavDropdown
                  label="Аккаунт"
                  buttonClassName="nav-tab"
                  menuAlign="left"
                  items={[
                    { to: '/profile', label: 'Профиль' },
                    { to: '/replays', label: 'Реплеи' },
                    { to: '/leaderboard', label: 'Рейтинг' },
                    { label: 'Правила', onClick: () => setTutorialOpen(true) },
                    ...(isAdmin ? [{ to: '/admin', label: 'Админ' }] : []),
                  ]}
                />
              </div>
              <div className="header-nav-tools">
                <button type="button" onClick={toggleTheme} className="btn btn-outline btn-icon" title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} aria-label="Тема">
                  {theme === 'dark' ? '\u2600' : '\u{1F319}'}
                </button>
                <button type="button" onClick={toggleSound} className="btn btn-outline btn-icon" title={soundEnabled ? 'Выключить звук' : 'Включить звук'} aria-label="Звук">
                  {soundEnabled ? '\u{1F50A}' : '\u{1F507}'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="header-logo">
              <img src="/lotus.jpg" alt="" />
              <span className="header-logo-text">Lotus Game</span>
            </h1>
            <div className="header-actions header-actions-guest">
              <div className="header-buttons">
                <div className="header-nav-secondary">
                  <Link to="/leaderboard" className="btn btn-outline">Рейтинг</Link>
                  <button type="button" onClick={() => setTutorialOpen(true)} className="btn btn-outline">Правила</button>
                </div>
                <div className="header-nav-tools">
                  <button type="button" onClick={toggleTheme} className="btn btn-outline btn-icon" title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} aria-label="Тема">
                    {theme === 'dark' ? '\u2600' : '\u{1F319}'}
                  </button>
                  <button type="button" onClick={toggleSound} className="btn btn-outline btn-icon" title={soundEnabled ? 'Выключить звук' : 'Включить звук'} aria-label="Звук">
                    {soundEnabled ? '\u{1F50A}' : '\u{1F507}'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>
      <main>
        {user ? (
          <div className="welcome welcome-box">
            <h2>Добро пожаловать, {user.username}!</h2>
            <div className="welcome-actions">
              <Link to="/play" className="btn btn-primary btn-lg">Найти матч</Link>
              <button type="button" onClick={() => setTutorialOpen(true)} className="btn btn-outline btn-lg">Правила</button>
            </div>
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
              <button type="button" onClick={() => setTutorialOpen(true)} className="btn btn-outline btn-lg">Правила</button>
            </div>
          </div>
        )}
      </main>
      <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </div>
  );
}
