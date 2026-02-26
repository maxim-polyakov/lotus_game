import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import CardDisplay from '../components/CardDisplay';

function enrichDeckWithCards(deck, allCards) {
  if (!deck?.cards) return { ...deck, cardsResolved: [] };
  const cards = (allCards || []).length
    ? deck.cards.flatMap((slot) => {
        const card = allCards.find((c) => c.cardType === slot.cardType && c.id === slot.cardId);
        return card ? Array(slot.count).fill(card) : [];
      })
    : [];
  return { ...deck, cardsResolved: cards };
}

export default function DecksPage() {
  const [decks, setDecks] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    Promise.all([
      api.get('/api/decks').then(({ data }) => data),
      api.get('/api/cards').then(({ data }) => data),
    ])
      .then(([decksData, cardsData]) => {
        setDecks(decksData || []);
        setAllCards(cardsData || []);
      })
      .catch((e) => {
        setError(e.response?.data?.message || e.message || 'Не удалось загрузить данные');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="decks-page">Загрузка...</div>;

  return (
    <div className="decks-page decks-list-page">
      <div className="decks-page-header">
        <h1>Мои колоды</h1>
        <div className="decks-page-actions">
          <Link to="/" className="btn btn-secondary">Назад</Link>
          <Link to="/decks/new" className="btn btn-primary">Создать колоду</Link>
        </div>
      </div>
      {error && <div className="error" style={{ margin: '1rem 2rem' }}>{error}</div>}
      <div className="decks-grid decks-grid-full">
        {decks.length === 0 && !error && (
          <p style={{ padding: '2rem', color: '#666' }}>У вас пока нет колод. Создайте первую!</p>
        )}
        {decks.map((d) => {
          const enriched = enrichDeckWithCards(d, allCards);
          const cardsToShow = (enriched.cardsResolved || []).slice(0, 10);
          return (
            <Link key={d.id} to={`/decks/${d.id}`} className="deck-card deck-card-link">
              <h3>{d.name}</h3>
              <div className="deck-cards-preview">
                {cardsToShow.map((c, i) => (
                  <CardDisplay key={`${c.id}-${i}`} card={c} size="sm" />
                ))}
              </div>
              <span className="deck-card-count">
                {d.cards?.reduce((s, x) => s + (x.count || 0), 0) || 0} карт
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
