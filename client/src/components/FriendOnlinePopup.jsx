import React, { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../api/client';
import { WS_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../utils/tokenStorage';

export default function FriendOnlinePopup() {
  const { user } = useAuth();
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [notification, setNotification] = useState(null);
  const clientRef = useRef(null);
  const currentNotificationIdRef = useRef(null);

  useEffect(() => {
    currentNotificationIdRef.current = notification?.id ?? null;
  }, [notification?.id]);

  useEffect(() => {
    if (!user?.id) {
      setNotification(null);
      return undefined;
    }
    const token = getAccessToken();
    if (!token) return undefined;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { token },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        client.subscribe('/user/queue/friends-online', async (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            setNotificationQueue((prev) => {
              if (!payload?.id) return prev;
              const existsCurrent = currentNotificationIdRef.current === payload.id;
              const existsInQueue = prev.some((n) => n?.id === payload.id);
              if (existsCurrent || existsInQueue) return prev;
              return [...prev, payload];
            });
            if (payload?.id) {
              await api.post(`/api/notifications/${payload.id}/read`);
            }
          } catch (_) {}
        });
      },
    });
    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    if (notification || notificationQueue.length === 0) return;
    setNotification(notificationQueue[0]);
    setNotificationQueue((prev) => prev.slice(1));
  }, [notification, notificationQueue]);

  if (!notification) return null;

  return (
    <div className="modal-overlay" onClick={() => setNotification(null)}>
      <div className="modal-content friend-online-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{notification.title || 'Друг в сети'}</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNotification(null)}>×</button>
        </div>
        <div className="modal-body">
          <p>{notification.message || 'Ваш друг вошёл в игру'}</p>
          <div className="hero-drop-actions">
            <button type="button" className="btn btn-primary" onClick={() => setNotification(null)}>Ок</button>
          </div>
        </div>
      </div>
    </div>
  );
}
