import React, { useState, useEffect, useRef } from 'react';
import { useHeroPreference } from '../context/HeroPreferenceContext';

export default function NavBarHeroSelect() {
  const { heroes, selectedHeroId, setSelectedHeroId, selectedHero, loading } = useHeroPreference();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!loading && heroes.length === 0) return null;

  return (
    <div className="navbar-hero-select" ref={rootRef}>
      <button
        type="button"
        className="navbar-hero-select-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={loading && heroes.length === 0}
      >
        <div className={`hero-portrait-sm hero-portrait-sm--${selectedHero?.id || 'default'}`}>
          {selectedHero?.portraitUrl ? (
            <img src={selectedHero.portraitUrl} alt="" />
          ) : (
            <span>{(selectedHero?.name || (loading ? '…' : '?')).charAt(0)}</span>
          )}
        </div>
        <span className="navbar-hero-select-label">{selectedHero?.name || (loading ? '…' : 'Герой')}</span>
        <span className="navbar-hero-select-caret" aria-hidden>{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && heroes.length > 0 && (
        <ul className="navbar-hero-select-menu" role="listbox">
          {heroes.map((h) => {
            const locked = h.unlocked === false;
            const hint =
              locked && h.gamesUntilUnlock != null && h.gamesUntilUnlock > 0
                ? `Ещё ${h.gamesUntilUnlock} завершённых матчей`
                : locked
                  ? 'Сыграйте матчи, чтобы разблокировать'
                  : '';
            return (
              <li key={h.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={h.id === selectedHeroId}
                  disabled={locked}
                  title={hint}
                  className={`navbar-hero-select-option ${h.id === selectedHeroId ? 'selected' : ''} ${locked ? 'navbar-hero-select-option--locked' : ''}`}
                  onClick={() => {
                    if (locked) return;
                    setSelectedHeroId(h.id);
                    setOpen(false);
                  }}
                >
                  <div className={`hero-portrait-sm hero-portrait-sm--${h.id}`}>
                    {h.portraitUrl ? <img src={h.portraitUrl} alt="" /> : <span>{(h.name || '?').charAt(0)}</span>}
                  </div>
                  <span className="navbar-hero-option-text">
                    <span className="navbar-hero-option-name">
                      {h.name}
                      {locked && (
                        <span className="navbar-hero-lock-badge" aria-hidden>{String.fromCodePoint(0x1f512)}</span>
                      )}
                    </span>
                    <span className="navbar-hero-option-meta">
                      {locked
                        ? h.gamesUntilUnlock != null && h.gamesUntilUnlock > 0
                          ? `Через ${h.gamesUntilUnlock} матч.`
                          : 'Заблокировано'
                        : `${h.startingHealth} HP`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
