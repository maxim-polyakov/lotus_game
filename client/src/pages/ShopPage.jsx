import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import CardDisplay from '../components/CardDisplay';

const cardKey = (cardType, cardId) => `${cardType}:${cardId}`;

export default function ShopPage() {
  const { updateUser } = useAuth();
  const [status, setStatus] = useState({
    gold: 0,
    randomCardPrice: 100,
    randomHeroPrice: 300,
    lockedCardsCount: 0,
    lockedHeroesCount: 0,
  });
  const [allCards, setAllCards] = useState([]);
  const [allHeroes, setAllHeroes] = useState([]);
  const [unlockedCardKeys, setUnlockedCardKeys] = useState(new Set());
  const [unlockedHeroIds, setUnlockedHeroIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [buyingCard, setBuyingCard] = useState(false);
  const [buyingHero, setBuyingHero] = useState(false);
  const [error, setError] = useState('');
  const [lastCard, setLastCard] = useState(null);
  const [lastHero, setLastHero] = useState(null);

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const [statusRes, allCardsRes, collectionRes, heroesRes] = await Promise.all([
        api.get('/api/shop/status'),
        api.get('/api/cards'),
        api.get('/api/cards/collection'),
        api.get('/api/heroes'),
      ]);
      const data = statusRes?.data;
      setStatus({
        gold: data?.gold ?? 0,
        randomCardPrice: data?.randomCardPrice ?? 100,
        randomHeroPrice: data?.randomHeroPrice ?? 300,
        lockedCardsCount: data?.lockedCardsCount ?? 0,
        lockedHeroesCount: data?.lockedHeroesCount ?? 0,
      });
      const all = allCardsRes?.data || [];
      const unlocked = collectionRes?.data || [];
      const heroes = heroesRes?.data || [];
      setAllCards(all);
      setAllHeroes(heroes);
      setUnlockedCardKeys(new Set(unlocked.map((c) => cardKey(c.cardType, c.id))));
      setUnlockedHeroIds(new Set(heroes.filter((h) => h.unlocked === true).map((h) => h.id)));
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
    if (buyingCard) return;
    setBuyingCard(true);
    setError('');
    try {
      const { data } = await api.post('/api/shop/buy/random-card');
      setStatus((prev) => ({
        gold: data?.gold ?? 0,
        randomCardPrice: data?.randomCardPrice ?? 100,
        randomHeroPrice: prev.randomHeroPrice,
        lockedCardsCount: data?.lockedCardsCount ?? 0,
        lockedHeroesCount: prev.lockedHeroesCount,
      }));
      setLastCard(data?.card || null);
      if (data?.card) {
        setUnlockedCardKeys((prev) => {
          const next = new Set(prev);
          next.add(cardKey(data.card.cardType, data.card.id));
          return next;
        });
      }
      updateUser({ gold: data?.gold ?? 0 });
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось купить карту');
    } finally {
      setBuyingCard(false);
    }
  };

  const buyRandomHero = async () => {
    if (buyingHero) return;
    setBuyingHero(true);
    setError('');
    try {
      const { data } = await api.post('/api/shop/buy/random-hero');
      setStatus((prev) => ({
        gold: data?.gold ?? 0,
        randomCardPrice: prev.randomCardPrice,
        randomHeroPrice: data?.randomHeroPrice ?? 300,
        lockedCardsCount: prev.lockedCardsCount,
        lockedHeroesCount: data?.lockedHeroesCount ?? 0,
      }));
      setLastHero(data?.hero || null);
      if (data?.hero?.id) {
        setUnlockedHeroIds((prev) => {
          const next = new Set(prev);
          next.add(data.hero.id);
          return next;
        });
      }
      updateUser({ gold: data?.gold ?? 0 });
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось купить героя');
    } finally {
      setBuyingHero(false);
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
                disabled={buyingCard || status.lockedCardsCount <= 0}
              >
                {buyingCard ? 'Покупка...' : 'Купить случайную карту'}
              </button>
              {status.lockedCardsCount <= 0 && (
                <p className="shop-hint-muted">Все доступные карты уже открыты.</p>
              )}
            </section>

            <section className="shop-block">
              <h3>Случайный герой</h3>
              <p className="shop-info-line">
                Актуальная цена: <b>{status.randomHeroPrice}</b>
              </p>
              <p className="shop-info-line">
                Неоткрытых героев: <b>{status.lockedHeroesCount}</b>
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={buyRandomHero}
                disabled={buyingHero || status.lockedHeroesCount <= 0}
              >
                {buyingHero ? 'Покупка...' : 'Купить случайного героя'}
              </button>
              {status.lockedHeroesCount <= 0 && (
                <p className="shop-hint-muted">Все герои уже открыты.</p>
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

            {lastHero && (
              <section className="shop-block">
                <h3>Последняя покупка героя</h3>
                <p className="shop-info-line">Вам выпал герой: <b>{lastHero.name}</b></p>
                <div className="shop-last-hero">
                  <div className={`hero-portrait-sm hero-portrait-sm--${lastHero.id || 'default'}`}>
                    {lastHero.portraitUrl ? <img src={lastHero.portraitUrl} alt={lastHero.name} /> : (lastHero.name || '?').charAt(0)}
                  </div>
                  <div className="shop-last-hero-meta">
                    <b>{lastHero.name}</b>
                    <span>{lastHero.title || 'Герой'}</span>
                  </div>
                </div>
              </section>
            )}

            <section className="shop-block">
              <h3>Пул карт</h3>
              {allCards.length === 0 ? (
                <p className="shop-hint-muted">Список карт пока пуст.</p>
              ) : (
                <div className="shop-cards-grid">
                  {allCards.map((c) => {
                    const unlocked = unlockedCardKeys.has(cardKey(c.cardType, c.id));
                    return (
                      <div key={`${c.cardType}-${c.id}`} className={`shop-card-item ${unlocked ? '' : 'shop-card-item--locked'}`}>
                        <CardDisplay card={c} size="md" />
                        <span className={`shop-card-state ${unlocked ? 'shop-card-state--unlocked' : 'shop-card-state--locked'}`}>
                          {unlocked ? 'Открыта' : 'Не открыта'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="shop-block">
              <h3>Пул героев</h3>
              {allHeroes.length === 0 ? (
                <p className="shop-hint-muted">Список героев пока пуст.</p>
              ) : (
                <div className="shop-heroes-grid">
                  {allHeroes.map((h) => {
                    const unlocked = unlockedHeroIds.has(h.id);
                    return (
                      <div key={h.id} className={`shop-hero-item ${unlocked ? '' : 'shop-hero-item--locked'}`}>
                        <div className={`hero-portrait-sm hero-portrait-sm--${h.id || 'default'}`}>
                          {h.portraitUrl ? <img src={h.portraitUrl} alt={h.name} /> : (h.name || '?').charAt(0)}
                        </div>
                        <div className="shop-hero-name">{h.name}</div>
                        <span className={`shop-card-state ${unlocked ? 'shop-card-state--unlocked' : 'shop-card-state--locked'}`}>
                          {unlocked ? 'Открыт' : 'Не открыт'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
