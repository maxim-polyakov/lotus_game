import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUsername(user?.username || '');
    setAvatarUrl(user?.avatarUrl || '');
  }, [user]);

  useEffect(() => {
    api.get('/api/me/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setStats({ wins: 0, losses: 0, draws: 0, totalMatches: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.put('/api/me', { username: username.trim(), avatarUrl: avatarUrl.trim() || null });
      updateUser(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
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
      <main className="profile-main">
        <h2>Профиль</h2>
        <div className="profile-card">
          <div className="profile-avatar-wrap">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Аватар" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                {username?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Имя пользователя</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={2}
                maxLength={50}
                required
              />
            </div>
            <div className="form-group">
              <label>URL аватара</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>
        <div className="profile-stats">
          <h3>Статистика</h3>
          {loading ? (
            <p>Загрузка...</p>
          ) : (
            <div className="stats-grid">
              <div className="stat-item stat-rating">
                <span className="stat-value">{stats?.rating ?? 1000}</span>
                <span className="stat-label">Рейтинг (ELO)</span>
              </div>
              <div className="stat-item stat-rank">
                <span className="stat-value">{stats?.rank ?? 'Новичок'}</span>
                <span className="stat-label">Ранг</span>
              </div>
              <div className="stat-item stat-wins">
                <span className="stat-value">{stats?.wins ?? 0}</span>
                <span className="stat-label">Побед</span>
              </div>
              <div className="stat-item stat-losses">
                <span className="stat-value">{stats?.losses ?? 0}</span>
                <span className="stat-label">Поражений</span>
              </div>
              <div className="stat-item stat-draws">
                <span className="stat-value">{stats?.draws ?? 0}</span>
                <span className="stat-label">Ничьих</span>
              </div>
              <div className="stat-item stat-total">
                <span className="stat-value">{stats?.totalMatches ?? 0}</span>
                <span className="stat-label">Всего матчей</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
