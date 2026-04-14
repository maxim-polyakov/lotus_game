import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import CardDisplay from '../components/CardDisplay';

export default function ShopPage() {
  const { updateUser } = useAuth();
  const [status, setStatus] = useState({ gold: 0, randomCardPrice: 100, lockedCardsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const [lastCard, setLastCard] = useState(null);

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/shop/status');
      setStatus({
        gold: data?.gold ?? 0,
        randomCardPrice: data?.randomCardPrice ?? 100,
        lockedCardsCount: data?.lockedCardsCount ?? 0,
      });
      updateUser({ gold: data?.gold ?? 0 });
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось загрузить магазин');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const buyRandomCard = async () => {
    if (buying) return;
    setBuying(true);
    setError('');
    try {
      const { data } = await api.post('/api/shop/buy/random-card');
      setStatus({
        gold: data?.gold ?? 0,
        randomCardPrice: data?.randomCardPrice ?? 100,
        lockedCardsCount: data?.lockedCardsCount ?? 0,
      });
      setLastCard(data?.card || null);
      updateUser({ gold: data?.gold ?? 0 });
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось купить карту');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="shop-page decks-list-page">
      <div className="decks-page-header">
        <h1>Магазин</h1>
        <div className="decks-page-actions">
          <Link to="/" className="btn btn-secondary">На главную</Link>
          <Link to="/decks" className="btn btn-outline">Мои колоды</Link>
        </div>
      </div>

      <div className="shop-content">
        {loading ? (
          <p>Загрузка магазина...</p>
        ) : (
          <>
            <section className="shop-block">
              <h3>Случайная карта</h3>
              <p className="shop-info-line">
                Баланс золота: <b>{status.gold}</b>
              </p>
              <p className="shop-info-line">
                Актуальная цена (из админки): <b>{status.randomCardPrice}</b>
              </p>
              <p className="shop-hint-muted">Цена настраивается администратором.</p>
              <p className="shop-info-line">
                Неоткрытых карт в пуле: <b>{status.lockedCardsCount}</b>
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={buyRandomCard}
                disabled={buying || status.lockedCardsCount <= 0}
              >
                {buying ? 'Покупка...' : 'Купить случайную карту'}
              </button>
              {status.lockedCardsCount <= 0 && (
                <p className="shop-hint-muted">Все доступные карты уже открыты.</p>
              )}
            </section>

            {error && <div className="error">{error}</div>}

            {lastCard && (
              <section className="shop-block">
                <h3>Последняя покупка</h3>
                <p className="shop-info-line">Вам выпала карта: <b>{lastCard.name}</b></p>
                <div className="shop-last-card">
                  <CardDisplay card={lastCard} size="md" />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
