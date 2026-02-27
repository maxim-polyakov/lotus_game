import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function LeaderboardPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/leaderboard')
      .then(({ data }) => setList(data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="leaderboard-page">
      <header>
        <h1 className="header-logo">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
            <img src="/lotus.jpg" alt="Lotus Game" />
            Lotus Game
          </Link>
        </h1>
        <div className="header-actions">
          <Link to="/" className="btn btn-secondary">На главную</Link>
        </div>
      </header>
      <main className="leaderboard-main">
        <h2>Таблица лидеров</h2>
        <p className="leaderboard-subtitle">Топ-10 игроков по рейтингу ELO</p>
        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <div className="leaderboard-table">
            <div className="leaderboard-header">
              <span className="lb-place">#</span>
              <span className="lb-username">Игрок</span>
              <span className="lb-rating">Рейтинг</span>
              <span className="lb-rank">Ранг</span>
            </div>
            {list.map((p, i) => (
              <div key={p.username} className="leaderboard-row">
                <span className="lb-place">{i + 1}</span>
                <span className="lb-user">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="lb-avatar" />
                  ) : (
                    <span className="lb-avatar-placeholder">{p.username?.charAt(0)?.toUpperCase() || '?'}</span>
                  )}
                  <span className="lb-username">{p.username}</span>
                </span>
                <span className="lb-rating">{p.rating}</span>
                <span className="lb-rank">{p.rank}</span>
              </div>
            ))}
            {list.length === 0 && <p className="leaderboard-empty">Пока нет данных</p>}
          </div>
        )}
      </main>
    </div>
  );
}
