import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
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
  const [decks, setDecks] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
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
      api.get(`/api/matches/${savedId}`)
        .then(({ data }) => setMatch(data))
        .catch(() => sessionStorage.removeItem(ACTIVE_MATCH_KEY));
    }
  }, [match]);

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
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/api/matches/find?deckId=${selectedDeck}`);
      setMatch(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (match && match.status === 'IN_PROGRESS') {
    return <GameBoard matchId={match.id} onExit={clearActiveMatch} />;
  }

  if (match && match.status === 'FINISHED') {
    return <GameBoard matchId={match.id} onExit={clearActiveMatch} />;
  }

  if (match && match.status === 'WAITING') {
    return <WaitingMatch match={match} onUpdate={setMatch} onCancel={clearActiveMatch} />;
  }

  const selectedDeckData = decks.find((d) => d.id === selectedDeck);
  const selectedDeckEnriched = selectedDeckData ? enrichDeckWithCards(selectedDeckData, allCards) : null;

  return (
    <div className="play-page">
      <h1>Найти матч</h1>
      <Link to="/" className="btn btn-secondary">Назад</Link>
      {error && <div className="error">{error}</div>}
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
      <button onClick={findMatch} disabled={loading || !selectedDeck} className="btn btn-primary">
        {loading ? 'Поиск...' : 'Найти матч'}
      </button>
    </div>
  );
}
