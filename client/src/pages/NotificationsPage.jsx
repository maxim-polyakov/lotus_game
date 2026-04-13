import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/notifications')
      .then(({ data }) => setItems(data || []))
      .catch((e) => setError(e.response?.data?.message || e.message || 'Не удалось загрузить уведомления'))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (_) {}
  };

  return (
    <div className="notifications-page decks-list-page">
      <div className="decks-page-header">
        <h1>Уведомления</h1>
        <div className="decks-page-actions">
          <Link to="/" className="btn btn-secondary">На главную</Link>
          <Link to="/profile" className="btn btn-outline">Профиль</Link>
        </div>
      </div>
      <div className="notifications-content">
        {loading && <p>Загрузка...</p>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <p className="notifications-empty">Пока уведомлений нет.</p>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="notifications-list">
            {items.map((n) => (
              <li key={n.id} className={`notification-item ${n.read ? 'notification-item--read' : ''}`}>
                <div className="notification-item-main">
                  <div className={`hero-card-portrait hero-card-portrait--${n.heroId || 'default'} notification-hero-portrait`}>
                    {n.heroPortraitUrl ? (
                      <img src={n.heroPortraitUrl} alt="" />
                    ) : (
                      <span>{(n.heroName || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="notification-text">
                    <h3>{n.title}</h3>
                    <p>{n.message}</p>
                    {n.rewardAmount != null && (
                      <p className="notification-reward-amount">+{n.rewardAmount}</p>
                    )}
                    <small>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</small>
                  </div>
                </div>
                {!n.read && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => markRead(n.id)}>
                    Прочитано
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
