import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import CardDisplay from '../components/CardDisplay';

function enrichDeckWithCards(deck, allCards) {
  if (!deck?.cards || !allCards?.length) return deck;
  const cards = deck.cards.flatMap((slot) => {
    const card = allCards.find((c) => c.cardType === slot.cardType && c.id === slot.cardId);
    return card ? Array(slot.count).fill(card) : [];
  });
  return { ...deck, cardsResolved: cards };
}

export default function DeckDetailPage() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/api/decks/${id}`).then(({ data }) => data),
      api.get('/api/cards').then(({ data }) => data),
    ])
      .then(([deckData, cardsData]) => {
        setDeck(deckData);
        setAllCards(cardsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="deck-detail-page"><div className="deck-detail-header"><span>Загрузка...</span></div></div>;
  if (!deck) return <div className="deck-detail-page"><div className="deck-detail-header"><span>Колода не найдена</span><Link to="/decks" className="btn btn-secondary">Назад</Link></div></div>;

  const enriched = enrichDeckWithCards(deck, allCards);

  return (
    <div className="deck-detail-page">
      <div className="deck-detail-header">
        <h1>{deck.name}</h1>
        <Link to="/decks" className="btn btn-secondary">Назад к колодам</Link>
      </div>
      <div className="deck-detail-cards">
        <div className="cards-grid">
          {(enriched.cardsResolved || []).map((c, i) => (
            <CardDisplay key={`${c.id}-${i}`} card={c} size="lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
