import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUsername(user?.username || '');
    setAvatarUrl(user?.avatarUrl || '');
  }, [user]);

  useEffect(() => {
    Promise.all([
      api.get('/api/me/stats').then(({ data }) => data).catch(() => ({ wins: 0, losses: 0, draws: 0, totalMatches: 0 })),
      api.get('/api/matches').then(({ data }) => data).catch(() => []),
    ]).then(([statsData, matchesData]) => {
      setStats(statsData);
      setMatches(matchesData || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.put('/api/me', { username: username.trim(), avatarUrl: avatarUrl.trim() || null });
      updateUser(data);
    } catch (err) {
      setError(err.response?.data?.message || '╨Ю╤И╨╕╨▒╨║╨░ ╤Б╨╛╤Е╤А╨░╨╜╨╡╨╜╨╕╤П');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setError('');
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const { data } = await api.post('/api/me/avatar', formData);
      updateUser(data);
      setAvatarUrl(data.avatarUrl || '');
      setAvatarFile(null);
    } catch (err) {
      setError(err.response?.data?.message || '╨Ю╤И╨╕╨▒╨║╨░ ╨╖╨░╨│╤А╤Г╨╖╨║╨╕ ╨░╨▓╨░╤В╨░╤А╨░');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="profile-page">
      <header>
        <h1 className="header-logo">
          <Link to="/" className="header-logo-link">
            <img src="/lotus.jpg" alt="" />
            <span className="header-logo-text">Lotus Game</span>
          </Link>
        </h1>
        <div className="header-actions">
          <Link to="/" className="btn btn-secondary">╨Э╨░ ╨│╨╗╨░╨▓╨╜╤Г╤О</Link>
          <button type="button" onClick={logout} className="btn btn-secondary">╨Т╤Л╨╣╤В╨╕</button>
        </div>
      </header>
      <main className="profile-main">
        <h2>╨Я╤А╨╛╤Д╨╕╨╗╤М</h2>
        <div className="profile-card">
          <div className="profile-avatar-wrap">
            {avatarUrl ? (
              <img src={avatarUrl} alt="╨Р╨▓╨░╤В╨░╤А" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                {username?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>╨Ш╨╝╤П ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤П</label>
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
              <label>╨Ч╨░╨│╤А╤Г╨╖╨╕╤В╤М ╨░╨▓╨░╤В╨░╤А</label>
              <div className="avatar-upload-form">
                <div className="avatar-upload-row">
                  <label className="btn btn-secondary avatar-file-label">
                    ╨Т╤Л╨▒╤А╨░╤В╤М ╤Д╨░╨╣╨╗
                    <input
                      key={avatarUrl || 'empty'}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      className="avatar-file-input"
                    />
                  </label>
                  {avatarFile && <span className="avatar-file-name">{avatarFile.name}</span>}
                  <button type="button" onClick={handleAvatarUpload} className="btn btn-primary" disabled={!avatarFile || avatarUploading}>
                    {avatarUploading ? '╨Ч╨░╨│╤А╤Г╨╖╨║╨░...' : '╨Ч╨░╨│╤А╤Г╨╖╨╕╤В╤М'}
                  </button>
                </div>
              </div>
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '╨б╨╛╤Е╤А╨░╨╜╨╡╨╜╨╕╨╡...' : '╨б╨╛╤Е╤А╨░╨╜╨╕╤В╤М'}
            </button>
          </form>
        </div>
        <div className="profile-stats">
          <h3>╨б╤В╨░╤В╨╕╤Б╤В╨╕╨║╨░</h3>
          {loading ? (
            <p>╨Ч╨░╨│╤А╤Г╨╖╨║╨░...</p>
          ) : (
            <div className="stats-grid">
              <div className="stat-item stat-rating">
                <span className="stat-value">{stats?.rating ?? 1000}</span>
                <span className="stat-label">╨а╨╡╨╣╤В╨╕╨╜╨│ (ELO)</span>
              </div>
              <div className="stat-item stat-rank">
                <span className="stat-value">{stats?.rank ?? '╨Э╨╛╨▓╨╕╤З╨╛╨║'}</span>
                <span className="stat-label">╨а╨░╨╜╨│</span>
              </div>
              <div className="stat-item stat-wins">
                <span className="stat-value">{stats?.wins ?? 0}</span>
                <span className="stat-label">╨Я╨╛╨▒╨╡╨┤</span>
              </div>
              <div className="stat-item stat-losses">
                <span className="stat-value">{stats?.losses ?? 0}</span>
                <span className="stat-label">╨Я╨╛╤А╨░╨╢╨╡╨╜╨╕╨╣</span>
              </div>
              <div className="stat-item stat-draws">
                <span className="stat-value">{stats?.draws ?? 0}</span>
                <span className="stat-label">╨Э╨╕╤З╤М╨╕╤Е</span>
              </div>
              <div className="stat-item stat-total">
                <span className="stat-value">{stats?.totalMatches ?? 0}</span>
                <span className="stat-label">╨Т╤Б╨╡╨│╨╛ ╨╝╨░╤В╤З╨╡╨╣</span>
              </div>
            </div>
          )}
        </div>
        {matches.length > 0 && (
          <div className="profile-matches">
            <h3>╨Я╨╛╤Б╨╗╨╡╨┤╨╜╨╕╨╡ ╨╝╨░╤В╤З╨╕</h3>
            <ul className="matches-list">
              {matches.slice(0, 10).map((m) => (
                <li key={m.id}>
                  ╨Ь╨░╤В╤З #{m.id} тАФ {m.status === 'FINISHED' ? (m.winnerId === user?.id ? '╨Я╨╛╨▒╨╡╨┤╨░' : m.winnerId ? '╨Я╨╛╤А╨░╨╢╨╡╨╜╨╕╨╡' : '╨Э╨╕╤З╤М╤П') : m.status}
                  {m.status === 'FINISHED' && (
                    <Link to={`/replay/${m.id}`} className="btn btn-outline btn-sm match-replay-btn">
                      ╨а╨╡╨┐╨╗╨╡╨╣
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
