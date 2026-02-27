import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ReplaysListPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api.get('/api/matches')
      .then(({ data }) => setMatches(data || []))
      .catch((e) => setError(e.response?.data?.message || e.message || 'Не удалось загрузить реплеи'))
      .finally(() => setLoading(false));
  }, []);

  const finishedMatches = matches.filter((m) => m.status === 'FINISHED');

  const getResultText = (m) => {
    if (m.winnerId === user?.id) return 'Победа';
    if (m.winnerId === null) return 'Ничья';
    return 'Поражение';
  };

  const getResultClass = (m) => {
    if (m.winnerId === user?.id) return 'replay-result-win';
    if (m.winnerId === null) return 'replay-result-draw';
    return 'replay-result-loss';
  };

  if (loading) {
    return (
      <div className="replays-list-page">
        <div className="replays-loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="replays-list-page">
      <div className="replays-page-header">
        <h1>Реплеи</h1>
        <div className="replays-page-actions">
          <Link to="/" className="btn btn-secondary">Назад</Link>
        </div>
      </div>
      {error && <div className="error" style={{ margin: '1rem 2rem' }}>{error}</div>}
      <div className="replays-content">
        {finishedMatches.length === 0 && !error && (
          <p className="replays-empty">У вас пока нет завершённых матчей с реплеями.</p>
        )}
        <div className="replays-grid">
          {finishedMatches.map((m) => (
            <Link key={m.id} to={`/replay/${m.id}`} className="replay-card">
              <div className="replay-card-header">
                <span className="replay-card-id">Матч #{m.id}</span>
                <span className={`replay-card-result ${getResultClass(m)}`}>{getResultText(m)}</span>
              </div>
              <div className="replay-card-meta">
                {m.matchMode === 'CASUAL' ? 'Обычный' : 'Ранговый'} • {m.createdAt ? new Date(m.createdAt).toLocaleDateString('ru-RU') : ''}
              </div>
              <span className="replay-card-watch">Смотреть реплей →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
