import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useMatchWebSocket } from '../context/MatchWebSocketContext';
import { useHeroPreference } from '../context/HeroPreferenceContext';
import GameBoard from '../components/GameBoard';
import WaitingMatch from '../components/WaitingMatch';
import CardDisplay from '../components/CardDisplay';

function enrichDeckWithCards(deck, allCards) {
  if (!deck?.cards || !allCards?.length) return deck;
  const slots = deck.cards.map((slot) => {
    const card = allCards.find((c) => c.cardType === slot.cardType && c.id === slot.cardId);
    return card ? { card, count: slot.count } : null;
  }).filter(Boolean);
  return { ...deck, cardsResolved: slots };
}

const ACTIVE_MATCH_KEY = 'lotus_active_match_id';

export default function PlayPage() {
  const { findMatch: wsFindMatch, getMatch: wsGetMatch, connected } = useMatchWebSocket();
  const { selectedHeroId, selectedHero, loading: heroesLoading } = useHeroPreference();
  const [decks, setDecks] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [matchMode, setMatchMode] = useState('RANKED');
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/decks').then(({ data }) => data),
      api.get('/api/cards').then(({ data }) => data),
    ])
      .then(([decksData, cardsData]) => {
        setDecks(decksData);
        setAllCards(cardsData);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const savedId = sessionStorage.getItem(ACTIVE_MATCH_KEY);
    if (savedId && !match) {
      if (connected) {
        wsGetMatch(Number(savedId))
          .then(setMatch)
          .catch(() => sessionStorage.removeItem(ACTIVE_MATCH_KEY));
      } else {
        api.get(`/api/matches/${savedId}`)
          .then(({ data }) => setMatch(data))
          .catch(() => sessionStorage.removeItem(ACTIVE_MATCH_KEY));
      }
    }
  }, [match, connected, wsGetMatch]);

  useEffect(() => {
    if (match?.id && ['WAITING', 'IN_PROGRESS', 'FINISHED'].includes(match.status)) {
      sessionStorage.setItem(ACTIVE_MATCH_KEY, String(match.id));
    }
  }, [match?.id, match?.status]);

  const clearActiveMatch = () => {
    setMatch(null);
    sessionStorage.removeItem(ACTIVE_MATCH_KEY);
  };

  const findMatch = async () => {
    if (!selectedDeck) {
      setError('Выберите колоду');
      return;
    }
    if (!selectedHeroId) {
      setError('Выберите героя на странице «Герои»');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await wsFindMatch(selectedDeck, matchMode, selectedHeroId);
      setMatch(data);
    } catch (err) {
      const msg = err?.message || 'Ошибка при поиске матча';
      setError(msg);
      console.error('Ошибка при поиске матча:', msg, err);
    } finally {
      setLoading(false);
    }
  };

  if (match && match.status === 'IN_PROGRESS') {
    return <GameBoard matchId={match.id} initialMatch={match} onExit={clearActiveMatch} allCards={allCards} />;
  }

  if (match && match.status === 'FINISHED') {
    return <GameBoard matchId={match.id} initialMatch={match} onExit={clearActiveMatch} allCards={allCards} />;
  }

  if (match && match.status === 'WAITING') {
    return <WaitingMatch match={match} onUpdate={setMatch} onCancel={clearActiveMatch} />;
  }

  const selectedDeckData = decks.find((d) => d.id === selectedDeck);
  const selectedDeckEnriched = selectedDeckData ? enrichDeckWithCards(selectedDeckData, allCards) : null;

  return (
    <div className="play-page">
      <div className="play-page-toolbar">
        <h1>Найти матч</h1>
        <div className="play-page-toolbar-right">
          <Link to="/" className="btn btn-secondary">Назад</Link>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="mode-selection">
        <label>Режим игры:</label>
        <div className="mode-selection-options">
          <label className="mode-option">
            <input
              type="radio"
              name="mode"
              value="RANKED"
              checked={matchMode === 'RANKED'}
              onChange={(e) => setMatchMode(e.target.value)}
            />
            <span>Ранговый</span>
            <small>Влияет на рейтинг</small>
          </label>
          <label className="mode-option">
            <input
              type="radio"
              name="mode"
              value="CASUAL"
              checked={matchMode === 'CASUAL'}
              onChange={(e) => setMatchMode(e.target.value)}
            />
            <span>Обычный</span>
            <small>Без изменения рейтинга</small>
          </label>
        </div>
      </div>
      <div className="play-page-hero-section">
        <div className="play-page-hero-label">Ваш герой</div>
        <Link
          to="/heroes"
          state={{ returnTo: '/play' }}
          className={`play-page-hero-card${heroesLoading && !selectedHero ? ' play-page-hero-card--loading' : ''}`}
        >
          <div
            className={`play-page-hero-avatar hero-card-portrait hero-card-portrait--${selectedHero?.id || 'default'}`}
            aria-hidden
          >
            {selectedHero?.portraitUrl ? (
              <img src={selectedHero.portraitUrl} alt="" />
            ) : (
              <span>{(selectedHero?.name || (heroesLoading ? '…' : '?')).charAt(0)}</span>
            )}
          </div>
          <div className="play-page-hero-info">
            {heroesLoading && !selectedHero ? (
              <span className="play-page-hero-placeholder">Загрузка героев…</span>
            ) : selectedHero ? (
              <>
                <span className="play-page-hero-name">{selectedHero.name}</span>
                {selectedHero.title ? (
                  <span className="play-page-hero-title">{selectedHero.title}</span>
                ) : null}
                <span className="play-page-hero-meta">{selectedHero.startingHealth} HP</span>
              </>
            ) : (
              <span className="play-page-hero-placeholder">Не выбран — нажмите, чтобы открыть список героев</span>
            )}
          </div>
          <span className="play-page-hero-change">Изменить</span>
        </Link>
      </div>
      <div className="deck-selection">
        <label>Выберите колоду:</label>
        <div className="decks-cards-row">
          {decks.map((d) => (
            <div
              key={d.id}
              className={`deck-card ${selectedDeck === d.id ? 'selected' : ''}`}
              onClick={() => setSelectedDeck(d.id)}
            >
              <h3>{d.name}</h3>
              <div className="deck-cards-preview">
                {(enrichDeckWithCards(d, allCards).cardsResolved || []).slice(0, 8).map(({ card, count }, i) => (
                  <CardDisplay key={`${card.cardType}-${card.id}-${i}`} card={card} count={count} size="sm" />
                ))}
              </div>
              <span className="deck-card-count">{d.cards?.reduce((s, x) => s + (x.count || 0), 0) || 0} карт</span>
            </div>
          ))}
        </div>
      </div>
      {selectedDeckEnriched?.cardsResolved && (
        <div className="selected-deck-cards">
          <h3>Карты в колоде:</h3>
          <div className="cards-grid">
            {selectedDeckEnriched.cardsResolved.map(({ card, count }, i) => (
              <CardDisplay key={`${card.cardType}-${card.id}-${i}`} card={card} count={count} size="lg" />
            ))}
          </div>
        </div>
      )}
      <div className="play-page-cta">
        <button type="button" onClick={findMatch} disabled={loading || heroesLoading || !selectedDeck || !selectedHeroId || !connected} className="btn btn-primary">
          {!connected ? 'Подключение...' : loading ? 'Поиск...' : 'Найти матч'}
        </button>
      </div>
    </div>
  );
}
