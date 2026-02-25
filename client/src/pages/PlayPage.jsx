import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import GameBoard from '../components/GameBoard';
import WaitingMatch from '../components/WaitingMatch';

export default function PlayPage() {
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/decks')
      .then(({ data }) => setDecks(data))
      .catch(console.error);
  }, []);

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
    return <GameBoard matchId={match.id} onExit={() => setMatch(null)} />;
  }

  if (match && match.status === 'WAITING') {
    return <WaitingMatch match={match} onUpdate={setMatch} onCancel={() => setMatch(null)} />;
  }

  return (
    <div className="play-page">
      <h1>Найти матч</h1>
      <Link to="/">Назад</Link>
      {error && <div className="error">{error}</div>}
      <div>
        <label>Колода:</label>
        <select value={selectedDeck || ''} onChange={(e) => setSelectedDeck(Number(e.target.value) || null)}>
          <option value="">— Выберите —</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <button onClick={findMatch} disabled={loading || !selectedDeck}>
        {loading ? 'Поиск...' : 'Найти матч'}
      </button>
    </div>
  );
}
