import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function DecksPage() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/decks')
      .then(({ data }) => setDecks(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="decks-page">
      <h1>Мои колоды</h1>
      <Link to="/">Назад</Link>
      <ul>
        {decks.map((d) => (
          <li key={d.id}>
            <Link to={`/decks/${d.id}`}>{d.name}</Link> — {d.cards?.length || 0} слотов
          </li>
        ))}
      </ul>
    </div>
  );
}
