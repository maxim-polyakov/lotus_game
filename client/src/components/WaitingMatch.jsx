import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useMatchWebSocket } from '../context/MatchWebSocketContext';

export default function WaitingMatch({ match, onUpdate, onCancel }) {
  const { subscribeToMatch, connected } = useMatchWebSocket();
  const [myHeroName, setMyHeroName] = useState('');

  useEffect(() => {
    if (!match?.hero1Id) return;
    api.get('/api/heroes')
      .then(({ data }) => {
        const h = (data || []).find((x) => x.id === match.hero1Id);
        if (h?.name) setMyHeroName(h.name);
      })
      .catch(() => {});
  }, [match?.hero1Id]);

  useEffect(() => {
    if (connected) {
      const unsubscribe = subscribeToMatch(match.id, (data) => {
        if (data.status === 'IN_PROGRESS') onUpdate(data);
      });
      return unsubscribe;
    }
    const id = setInterval(() => {
      api.get(`/api/matches/${match.id}`).then(({ data }) => {
        if (data.status === 'IN_PROGRESS') onUpdate(data);
      });
    }, 2000);
    return () => clearInterval(id);
  }, [match.id, onUpdate, subscribeToMatch, connected]);

  return (
    <div className="play-page">
      <h2>Ожидание соперника...</h2>
      <p>Матч #{match.id}</p>
      {myHeroName && (
        <p className="waiting-hero-picked">Ваш герой: <strong>{myHeroName}</strong></p>
      )}
      <button type="button" onClick={onCancel} className="btn btn-secondary">Отмена</button>
    </div>
  );
}
