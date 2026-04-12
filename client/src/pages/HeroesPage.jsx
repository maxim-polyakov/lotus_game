import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useHeroPreference } from '../context/HeroPreferenceContext';

/** Только внутренние пути (без open-redirect). */
function safeReturnPath(state) {
  const p = state?.returnTo;
  if (typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//') || p.includes('://')) {
    return null;
  }
  return p;
}

export default function HeroesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = safeReturnPath(location.state);
  const { heroes, loading, selectedHeroId, setSelectedHeroId } = useHeroPreference();

  if (loading && heroes.length === 0) {
    return <div className="decks-page">Загрузка...</div>;
  }

  return (
    <div className="decks-page decks-list-page">
      <div className="decks-page-header">
        <h1>Герои</h1>
        <div className="decks-page-actions">
          <Link to="/decks" className="btn btn-outline">Колоды</Link>
          <Link to="/play" className="btn btn-primary">Играть</Link>
          <Link to="/" className="btn btn-secondary">Назад</Link>
          <Link to="/profile" className="btn btn-outline">Профиль</Link>
        </div>
      </div>
      <div className="decks-grid-full">
        <div className="hero-selection heroes-page-selection">
          <p className="heroes-page-intro">
            Выберите героя для поиска матча. Новые герои открываются по мере завершённых игр.
          </p>
          {heroes.length === 0 ? (
            <p className="heroes-page-empty">Нет доступных героев.</p>
          ) : (
            <div className="hero-selection-grid heroes-page-grid">
              {heroes.map((h) => {
                const locked = h.unlocked !== true;
                const hint =
                  locked && h.gamesUntilUnlock != null && h.gamesUntilUnlock > 0
                    ? `Ещё ${h.gamesUntilUnlock} завершённых матчей`
                    : locked
                      ? 'Сыграйте матчи, чтобы разблокировать'
                      : '';
                return (
                  <button
                    key={h.id}
                    type="button"
                    title={hint}
                    disabled={locked}
                    className={`hero-card ${h.id === selectedHeroId ? 'selected' : ''} ${locked ? 'hero-card--locked' : ''}`}
                    onClick={() => {
                      if (locked) return;
                      setSelectedHeroId(h.id);
                      if (returnTo) navigate(returnTo, { replace: true });
                    }}
                  >
                    <div className={`hero-card-portrait hero-card-portrait--${h.id}`}>
                      {h.portraitUrl ? (
                        <img src={h.portraitUrl} alt="" />
                      ) : (
                        <span>{(h.name || '?').charAt(0)}</span>
                      )}
                    </div>
                    <span className="hero-card-name">
                      {h.name}
                      {locked && <span className="hero-card-lock-badge" aria-hidden>{String.fromCodePoint(0x1f512)}</span>}
                    </span>
                    <span className="hero-card-hp">
                      {locked
                        ? h.gamesUntilUnlock != null && h.gamesUntilUnlock > 0
                          ? `Через ${h.gamesUntilUnlock} матч.`
                          : 'Заблокировано'
                        : `${h.startingHealth} HP`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
