import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api, { WS_URL } from '../api/client';
import { getAccessToken } from '../utils/tokenStorage';
import { useAuth } from '../context/AuthContext';

function privateKey(a, b) {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  return x <= y ? `private:${x}:${y}` : `private:${y}:${x}`;
}

function resolvePrivatePeer(myUsername, channelKey) {
  if (!channelKey || !channelKey.startsWith('private:')) return null;
  const parts = channelKey.split(':');
  if (parts.length !== 3) return null;
  const me = (myUsername || '').trim().toLowerCase();
  if (parts[1] === me) return parts[2];
  if (parts[2] === me) return parts[1];
  return null;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initials(username) {
  const value = (username || '').trim();
  if (!value) return '?';
  return value.slice(0, 2).toUpperCase();
}

function parseTimestamp(iso) {
  if (!iso) return null;
  const ts = Date.parse(iso);
  return Number.isNaN(ts) ? null : ts;
}

const MESSAGE_GROUP_WINDOW_MS = 3 * 60 * 1000;

export default function ChatWidget() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('GENERAL');
  const [privateInput, setPrivateInput] = useState('');
  const [privatePeer, setPrivatePeer] = useState('');
  const [privateDialogs, setPrivateDialogs] = useState([]);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [messagesByKey, setMessagesByKey] = useState({});
  const [unreadByKey, setUnreadByKey] = useState({});
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const clientRef = useRef(null);
  const matchSubRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const currentChannelKey = useMemo(() => {
    if (activeTab === 'GENERAL') return 'general';
    if (activeTab === 'PRIVATE' && privatePeer) return privateKey(user?.username, privatePeer);
    if (activeTab === 'MATCH' && activeMatchId) return `match:${activeMatchId}`;
    return null;
  }, [activeTab, privatePeer, activeMatchId, user?.username]);

  const currentMessages = currentChannelKey ? (messagesByKey[currentChannelKey] || []) : [];
  const renderedMessages = useMemo(() => currentMessages.map((message, index) => {
    const prev = index > 0 ? currentMessages[index - 1] : null;
    const sameAuthor = !!prev && prev.fromUsername === message.fromUsername;
    const prevTs = parseTimestamp(prev?.createdAt);
    const curTs = parseTimestamp(message?.createdAt);
    const closeInTime = prevTs != null && curTs != null && Math.abs(curTs - prevTs) <= MESSAGE_GROUP_WINDOW_MS;
    return {
      message,
      hideMeta: sameAuthor && closeInTime,
    };
  }), [currentMessages]);

  const appendMessage = (msg) => {
    const key = msg?.channelKey;
    if (!key) return;
    setMessagesByKey((prev) => {
      const list = prev[key] || [];
      if (msg.id && list.some((m) => m.id === msg.id)) return prev;
      const next = [...list, msg].slice(-200);
      return { ...prev, [key]: next };
    });
    if (msg.channelType === 'PRIVATE') {
      setPrivateDialogs((prev) => {
        const peer = resolvePrivatePeer(user?.username, msg.channelKey);
        if (!peer) return prev;
        const existing = prev.filter((d) => d.channelKey !== msg.channelKey);
        const prevDialog = prev.find((d) => d.channelKey === msg.channelKey);
        return [{
          username: peer,
          channelKey: msg.channelKey,
          lastMessage: msg.text,
          lastCreatedAt: msg.createdAt,
          avatarUrl: prevDialog?.avatarUrl || (msg.fromUsername?.toLowerCase() === peer ? msg.fromAvatarUrl : null),
        }, ...existing].slice(0, 50);
      });
    }
    if (key !== currentChannelKey && msg.fromUsername !== user?.username) {
      setUnreadByKey((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    }
  };

  useEffect(() => {
    if (!user?.id) return undefined;
    const token = getAccessToken();
    if (!token) return undefined;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { token },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/topic/chat/general', (msg) => appendMessage(JSON.parse(msg.body)));
        client.subscribe('/user/queue/chat/private', (msg) => appendMessage(JSON.parse(msg.body)));
        client.subscribe('/user/queue/chat/errors', (msg) => {
          try {
            const err = JSON.parse(msg.body);
            setError(err?.error || 'Ошибка чата');
          } catch {
            setError('Ошибка чата');
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });
    clientRef.current = client;
    client.activate();
    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    api.get('/api/chat/history/general')
      .then(({ data }) => setMessagesByKey((prev) => ({ ...prev, general: data || [] })))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    api.get('/api/chat/private-dialogs')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setPrivateDialogs(list);
        setUnreadByKey((prev) => {
          const next = { ...prev };
          list.forEach((d) => {
            const key = d.channelKey || privateKey(user?.username, d.username);
            next[key] = d.unreadCount || 0;
          });
          return next;
        });
      })
      .catch(() => setPrivateDialogs([]));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    api.get('/api/chat/unread')
      .then(({ data }) => {
        const fromServer = data?.countsByChannelKey || {};
        setUnreadByKey((prev) => ({ ...prev, ...fromServer }));
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const loadActiveMatch = () => {
      api.get('/api/chat/active-match')
        .then(({ data }) => setActiveMatchId(data?.matchId || null))
        .catch(() => setActiveMatchId(null));
    };
    loadActiveMatch();
    const t = setInterval(loadActiveMatch, 10000);
    return () => clearInterval(t);
  }, [user?.id]);

  useEffect(() => {
    if (!clientRef.current?.connected) return;
    if (matchSubRef.current) {
      matchSubRef.current.unsubscribe();
      matchSubRef.current = null;
    }
    if (!activeMatchId) return;
    matchSubRef.current = clientRef.current.subscribe(`/topic/chat/match/${activeMatchId}`, (msg) => appendMessage(JSON.parse(msg.body)));
  }, [activeMatchId, connected]);

  useEffect(() => {
    if (!activeMatchId || messagesByKey[`match:${activeMatchId}`]) return;
    api.get(`/api/chat/history/match/${activeMatchId}`)
      .then(({ data }) => setMessagesByKey((prev) => ({ ...prev, [`match:${activeMatchId}`]: data || [] })))
      .catch(() => {});
  }, [activeMatchId, messagesByKey]);

  const openPrivate = () => {
    const peer = privateInput.trim();
    if (!peer) return;
    setPrivatePeer(peer);
    setActiveTab('PRIVATE');
    const key = privateKey(user?.username, peer);
    setUnreadByKey((prev) => ({ ...prev, [key]: 0 }));
    api.post(`/api/chat/read/private/${encodeURIComponent(peer)}`).catch(() => {});
    if (!messagesByKey[key]) {
      api.get(`/api/chat/history/private/${encodeURIComponent(peer)}`)
        .then(({ data }) => setMessagesByKey((prev) => ({ ...prev, [key]: data || [] })))
        .catch((e) => setError(e.response?.data?.message || 'Не удалось открыть приват'));
    }
  };

  const openDialog = (dlg) => {
    const peer = dlg?.username;
    if (!peer) return;
    setPrivatePeer(peer);
    setPrivateInput(peer);
    setActiveTab('PRIVATE');
    const key = privateKey(user?.username, peer);
    setUnreadByKey((prev) => ({ ...prev, [key]: 0 }));
    api.post(`/api/chat/read/private/${encodeURIComponent(peer)}`).catch(() => {});
    if (!messagesByKey[key]) {
      api.get(`/api/chat/history/private/${encodeURIComponent(peer)}`)
        .then(({ data }) => setMessagesByKey((prev) => ({ ...prev, [key]: data || [] })))
        .catch((e) => setError(e.response?.data?.message || 'Не удалось открыть приват'));
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const client = clientRef.current;
    const body = text.trim();
    if (!body) return;
    if (!client?.connected) {
      setError('Чат временно офлайн');
      return;
    }
    setError('');
    try {
      if (activeTab === 'GENERAL') {
        client.publish({
          destination: '/app/chat/send/general',
          body: JSON.stringify({ text: body }),
        });
      } else if (activeTab === 'PRIVATE') {
        if (!privatePeer) {
          setError('Сначала выберите username для привата');
          return;
        }
        client.publish({
          destination: '/app/chat/send/private',
          body: JSON.stringify({ username: privatePeer, text: body }),
        });
      } else if (activeTab === 'MATCH') {
        if (!activeMatchId) {
          setError('Сейчас нет активного матча');
          return;
        }
        client.publish({
          destination: `/app/chat/send/match/${activeMatchId}`,
          body: JSON.stringify({ text: body }),
        });
      }
      setText('');
    } catch (err) {
      setError(err?.message || 'Не удалось отправить сообщение');
    }
  };

  useEffect(() => {
    if (!currentChannelKey) return;
    setUnreadByKey((prev) => ({ ...prev, [currentChannelKey]: 0 }));
    if (activeTab === 'GENERAL') {
      api.post('/api/chat/read/general').catch(() => {});
    } else if (activeTab === 'PRIVATE' && privatePeer) {
      api.post(`/api/chat/read/private/${encodeURIComponent(privatePeer)}`).catch(() => {});
    } else if (activeTab === 'MATCH' && activeMatchId) {
      api.post(`/api/chat/read/match/${activeMatchId}`).catch(() => {});
    }
  }, [currentChannelKey]);

  useLayoutEffect(() => {
    if (collapsed) return;
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [currentMessages, currentChannelKey, collapsed]);

  const generalUnread = unreadByKey.general || 0;
  const privateUnread = Object.entries(unreadByKey)
    .filter(([k]) => k.startsWith('private:'))
    .reduce((sum, [, v]) => sum + (v || 0), 0);
  const matchUnread = activeMatchId ? (unreadByKey[`match:${activeMatchId}`] || 0) : 0;

  if (!user) return null;

  return (
    <div className={`chat-widget chat-widget--theme-${activeTab.toLowerCase()} ${collapsed ? 'chat-widget--collapsed' : ''}`}>
      <div className="chat-widget-head">
        <div className="chat-widget-title-wrap">
          <span className="chat-widget-title">Lotus Chat</span>
          <span className={`chat-widget-conn ${connected ? 'chat-widget-conn--online' : 'chat-widget-conn--offline'}`}>
            {connected ? 'online' : 'offline'}
          </span>
        </div>
        <button type="button" className="chat-widget-toggle btn btn-outline btn-sm" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? 'Открыть' : 'Свернуть'}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="chat-widget-tabs">
            <button type="button" className={`btn btn-sm ${activeTab === 'GENERAL' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('GENERAL')}>
              Общий{generalUnread > 0 ? ` (${generalUnread})` : ''}
            </button>
            <button type="button" className={`btn btn-sm ${activeTab === 'PRIVATE' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('PRIVATE')}>
              Приват{privateUnread > 0 ? ` (${privateUnread})` : ''}
            </button>
            <button type="button" className={`btn btn-sm ${activeTab === 'MATCH' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('MATCH')} disabled={!activeMatchId}>
              Матч{matchUnread > 0 ? ` (${matchUnread})` : ''}
            </button>
          </div>

          {activeTab === 'PRIVATE' && (
            <>
              <div className="chat-widget-private-open">
                <input
                  type="text"
                  value={privateInput}
                  onChange={(e) => setPrivateInput(e.target.value)}
                  placeholder="username"
                  maxLength={50}
                />
                <button type="button" className="btn btn-outline btn-sm" onClick={openPrivate}>Открыть</button>
              </div>
              {privateDialogs.length > 0 && (
                <div className="chat-widget-dialogs">
                  {privateDialogs.map((d) => {
                    const key = d.channelKey || privateKey(user?.username, d.username);
                    const unread = unreadByKey[key] || 0;
                    return (
                      <button key={key} type="button" className={`chat-dialog ${privatePeer === d.username ? 'chat-dialog--active' : ''}`} onClick={() => openDialog(d)}>
                        {d.avatarUrl ? (
                          <img className="chat-dialog-avatar" src={d.avatarUrl} alt={d.username} />
                        ) : (
                          <span className="chat-dialog-avatar chat-dialog-avatar--fallback">{initials(d.username)}</span>
                        )}
                        <span className="chat-dialog-name">{d.username}</span>
                        <span className="chat-dialog-last">{d.lastMessage || '...'}</span>
                        {unread > 0 && <span className="chat-dialog-unread">{unread}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div className="chat-widget-status">
            {activeTab === 'PRIVATE' && privatePeer ? `Приват: ${privatePeer}` : ''}
            {activeTab === 'MATCH' && activeMatchId ? `Канал матча #${activeMatchId}` : ''}
          </div>

          <div className="chat-widget-messages" ref={messagesContainerRef}>
            {renderedMessages.map(({ message: m, hideMeta }, i) => (
              <div
                key={`${m.createdAt}-${m.fromUsername}-${i}`}
                className={`chat-msg ${m.fromUsername === user.username ? 'chat-msg--me' : ''} ${hideMeta ? 'chat-msg--compact' : ''}`}
              >
                {!hideMeta && (m.fromAvatarUrl ? (
                  <img className="chat-msg-avatar" src={m.fromAvatarUrl} alt={m.fromUsername} />
                ) : (
                  <span className="chat-msg-avatar chat-msg-avatar--fallback">{initials(m.fromUsername)}</span>
                ))}
                <div className="chat-msg-body">
                  {!hideMeta && <span className="chat-msg-author">{m.fromUsername}</span>}
                  <span className="chat-msg-time">{formatTime(m.createdAt)}</span>
                  <span className="chat-msg-text">{m.text}</span>
                </div>
              </div>
            ))}
            {currentMessages.length === 0 && <div className="chat-empty">Сообщений пока нет.</div>}
          </div>

          {error && <div className="chat-error">{error}</div>}
          <form className="chat-widget-send" onSubmit={send}>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Напишите сообщение..."
              maxLength={1000}
            />
            <button type="submit" className="btn btn-primary btn-sm">Отправить</button>
          </form>
        </>
      )}
    </div>
  );
}
