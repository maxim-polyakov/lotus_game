import React, { useEffect } from 'react';
import api from '../api/client';
import { useMatchWebSocket } from '../context/MatchWebSocketContext';

export default function WaitingMatch({ match, onUpdate, onCancel }) {
  const { subscribeToMatch, connected } = useMatchWebSocket();

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
      <button onClick={onCancel} className="btn btn-secondary">Отмена</button>
    </div>
  );
}
