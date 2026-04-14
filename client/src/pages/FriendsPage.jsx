import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function FriendsPage() {
  const [data, setData] = useState({ friends: [], incoming: [], outgoing: [] });
  const [inviteUsername, setInviteUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/api/friends')
      .then(({ data: payload }) => {
        setData({
          friends: payload?.friends || [],
          incoming: payload?.incoming || [],
          outgoing: payload?.outgoing || [],
        });
      })
      .catch((e) => setError(e.response?.data?.message || 'Не удалось загрузить друзей'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.post('/api/friends/requests', { username: inviteUsername.trim() });
      setInviteUsername('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось отправить приглашение');
    } finally {
      setSending(false);
    }
  };

  const respondInvite = async (id, action) => {
    setError('');
    try {
      await api.post(`/api/friends/requests/${id}/${action}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось обработать приглашение');
    }
  };

  return (
    <div className="friends-page decks-list-page">
      <div className="decks-page-header">
        <h1>Друзья</h1>
        <div className="decks-page-actions">
          <Link to="/" className="btn btn-secondary">На главную</Link>
          <Link to="/profile" className="btn btn-outline">Профиль</Link>
        </div>
      </div>

      <div className="friends-content">
        <section className="friends-block">
          <h3>Добавить в друзья</h3>
          <form className="friends-invite-form" onSubmit={sendInvite}>
            <input
              type="text"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="username игрока"
              maxLength={50}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !inviteUsername.trim()}>
              {sending ? 'Отправка...' : 'Отправить приглашение'}
            </button>
          </form>
        </section>

        {error && <div className="error">{error}</div>}
        {loading && <p>Загрузка...</p>}

        {!loading && (
          <>
            <section className="friends-block">
              <h3>Входящие приглашения</h3>
              {data.incoming.length === 0 ? (
                <p className="friends-empty">Нет входящих приглашений.</p>
              ) : (
                <ul className="friends-list">
                  {data.incoming.map((r) => (
                    <li key={r.requestId} className="friends-item">
                      <FriendMiniCard user={r.user} />
                      <div className="friends-item-actions">
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => respondInvite(r.requestId, 'accept')}>
                          Принять
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => respondInvite(r.requestId, 'decline')}>
                          Отклонить
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="friends-block">
              <h3>Исходящие приглашения</h3>
              {data.outgoing.length === 0 ? (
                <p className="friends-empty">Нет исходящих приглашений.</p>
              ) : (
                <ul className="friends-list">
                  {data.outgoing.map((r) => (
                    <li key={r.requestId} className="friends-item">
                      <FriendMiniCard user={r.user} />
                      <span className="friends-pending-label">Ожидает ответа</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="friends-block">
              <h3>Мои друзья</h3>
              {data.friends.length === 0 ? (
                <p className="friends-empty">Пока друзей нет.</p>
              ) : (
                <ul className="friends-list">
                  {data.friends.map((f) => (
                    <li key={f.id} className="friends-item">
                      <FriendMiniCard user={f} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function FriendMiniCard({ user }) {
  return (
    <div className="friends-mini-user">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="friends-mini-avatar" />
      ) : (
        <span className="friends-mini-avatar friends-mini-avatar--placeholder">
          {(user?.username || '?').charAt(0).toUpperCase()}
        </span>
      )}
      <div className="friends-mini-meta">
        <span className="friends-mini-name">{user?.username || 'Игрок'}</span>
        <span className="friends-mini-rating">Рейтинг: {user?.rating ?? 1000}</span>
      </div>
    </div>
  );
}
