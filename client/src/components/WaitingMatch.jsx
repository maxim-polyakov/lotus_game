import React, { useEffect } from 'react';
import api from '../api/client';

export default function WaitingMatch({ match, onUpdate, onCancel }) {
  useEffect(() => {
    const id = setInterval(() => {
      api.get(`/api/matches/${match.id}`).then(({ data }) => {
        if (data.status === 'IN_PROGRESS') onUpdate(data);
      });
    }, 2000);
    return () => clearInterval(id);
  }, [match.id, onUpdate]);

  return (
    <div className="play-page">
      <h2>Ожидание соперника...</h2>
      <p>Матч #{match.id}</p>
      <button onClick={onCancel}>Отмена</button>
    </div>
  );
}
