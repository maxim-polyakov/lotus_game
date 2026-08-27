import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import TutorialModal from '../components/TutorialModal';
import NavDropdown from '../components/NavDropdown';
import ChatWidget from '../components/ChatWidget';

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
                  label="╨У╨╡╤А╨╛╨╕ ╨╕ ╨║╨╛╨╗╨╛╨┤╤Л"
                  buttonClassName="nav-tab"
                  menuAlign="left"
                  items={[
                    { to: '/heroes', label: '╨У╨╡╤А╨╛╨╕' },
                    { to: '/decks', label: '╨Ъ╨╛╨╗╨╛╨┤╤Л' },
                  ]}
                />
                <NavDropdown
                  label="╨Р╨║╨║╨░╤Г╨╜╤В"
                  buttonClassName="nav-tab"
                  menuAlign="left"
                  items={[
                    { to: '/profile', label: '╨Я╤А╨╛╤Д╨╕╨╗╤М' },
                    { to: '/shop', label: '╨Ь╨░╨│╨░╨╖╨╕╨╜' },
                    { to: '/friends', label: '╨Ф╤А╤Г╨╖╤М╤П' },
                    { to: '/notifications', label: '╨г╨▓╨╡╨┤╨╛╨╝╨╗╨╡╨╜╨╕╤П' },
                    { to: '/replays', label: '╨а╨╡╨┐╨╗╨╡╨╕' },
                    { to: '/leaderboard', label: '╨а╨╡╨╣╤В╨╕╨╜╨│' },
                    { label: '╨Я╤А╨░╨▓╨╕╨╗╨░', onClick: () => setTutorialOpen(true) },
                    ...(isAdmin ? [{ to: '/admin', label: '╨Р╨┤╨╝╨╕╨╜' }] : []),
                  ]}
                />
              </div>
              <div className="header-nav-tools">
                <button type="button" onClick={toggleTheme} className="btn btn-outline btn-icon" title={theme === 'dark' ? '╨б╨▓╨╡╤В╨╗╨░╤П ╤В╨╡╨╝╨░' : '╨в╤С╨╝╨╜╨░╤П ╤В╨╡╨╝╨░'} aria-label="╨в╨╡╨╝╨░">
                  {theme === 'dark' ? '\u2600' : '\u{1F319}'}
                </button>
                <button type="button" onClick={toggleSound} className="btn btn-outline btn-icon" title={soundEnabled ? '╨Т╤Л╨║╨╗╤О╤З╨╕╤В╤М ╨╖╨▓╤Г╨║' : '╨Т╨║╨╗╤О╤З╨╕╤В╤М ╨╖╨▓╤Г╨║'} aria-label="╨Ч╨▓╤Г╨║">
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
                  <Link to="/leaderboard" className="btn btn-outline">╨а╨╡╨╣╤В╨╕╨╜╨│</Link>
                  <button type="button" onClick={() => setTutorialOpen(true)} className="btn btn-outline">╨Я╤А╨░╨▓╨╕╨╗╨░</button>
                </div>
                <div className="header-nav-tools">
                  <button type="button" onClick={toggleTheme} className="btn btn-outline btn-icon" title={theme === 'dark' ? '╨б╨▓╨╡╤В╨╗╨░╤П ╤В╨╡╨╝╨░' : '╨в╤С╨╝╨╜╨░╤П ╤В╨╡╨╝╨░'} aria-label="╨в╨╡╨╝╨░">
                    {theme === 'dark' ? '\u2600' : '\u{1F319}'}
                  </button>
                  <button type="button" onClick={toggleSound} className="btn btn-outline btn-icon" title={soundEnabled ? '╨Т╤Л╨║╨╗╤О╤З╨╕╤В╤М ╨╖╨▓╤Г╨║' : '╨Т╨║╨╗╤О╤З╨╕╤В╤М ╨╖╨▓╤Г╨║'} aria-label="╨Ч╨▓╤Г╨║">
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
            <h2>╨Ф╨╛╨▒╤А╨╛ ╨┐╨╛╨╢╨░╨╗╨╛╨▓╨░╤В╤М, {user.username}!</h2>
            <div className="welcome-actions">
              <Link to="/play" className="btn btn-primary btn-lg">╨Э╨░╨╣╤В╨╕ ╨╝╨░╤В╤З</Link>
              <button type="button" onClick={() => setTutorialOpen(true)} className="btn btn-outline btn-lg">╨Я╤А╨░╨▓╨╕╨╗╨░</button>
            </div>
          </div>
        ) : (
          <div className="welcome welcome-box">
            <h1 className="welcome-logo">
              <img src="/lotus.jpg" alt="Lotus Game" />
              Lotus Game
            </h1>
            <p>╨Т╨╛╨╣╨┤╨╕╤В╨╡ ╨╕╨╗╨╕ ╨╖╨░╤А╨╡╨│╨╕╤Б╤В╤А╨╕╤А╤Г╨╣╤В╨╡╤Б╤М, ╤З╤В╨╛╨▒╤Л ╨╕╨│╤А╨░╤В╤М.</p>
            <div className="welcome-buttons">
              <Link to="/login" className="btn btn-primary btn-lg">╨Т╤Е╨╛╨┤</Link>
              <Link to="/register" className="btn btn-outline btn-lg">╨а╨╡╨│╨╕╤Б╤В╤А╨░╤Ж╨╕╤П</Link>
              <button type="button" onClick={() => setTutorialOpen(true)} className="btn btn-outline btn-lg">╨Я╤А╨░╨▓╨╕╨╗╨░</button>
            </div>
          </div>
        )}
      </main>
      {user && <ChatWidget />}
      <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </div>
  );
}
