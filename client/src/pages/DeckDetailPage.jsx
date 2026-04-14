import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import CardDisplay from '../components/CardDisplay';
import { useHeroPreference } from '../context/HeroPreferenceContext';

const DECK_SIZE = 30;
const DEFAULT_DECK_HERO_ID = 'lotus_guardian';
const cardKey = (cardType, cardId) => `${cardType}:${cardId}`;

export default function DeckDetailPage() {
  const { id } = useParams();
  const { heroes, loading: heroesLoading } = useHeroPreference();
  const [deck, setDeck] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [unlockedCardKeys, setUnlockedCardKeys] = useState(new Set());
  const [name, setName] = useState('');
  const [heroId, setHeroId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDeck = useCallback(() => {
    if (!id) return;
    setError('');
    Promise.all([
      api.get(`/api/decks/${id}`).then(({ data }) => data),
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/cards/collection').then(({ data }) => data || []),
    ])
      .then(([deckData, allCardsData, unlockedCardsData]) => {
        setDeck(deckData);
        setAllCards(allCardsData || []);
        setUnlockedCardKeys(new Set((unlockedCardsData || []).map((c) => cardKey(c.cardType, c.id))));
        setName(deckData?.name || '');
        setHeroId(deckData?.heroId || DEFAULT_DECK_HERO_ID);
        setSlots((deckData?.cards || []).map((c) => ({
          cardType: c.cardType,
          cardId: c.cardId,
          count: c.count,
        })));
      })
      .catch((e) => {
        setError(e.response?.data?.message || 'Не удалось загрузить колоду');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadDeck(); }, [loadDeck]);

  const total = slots.reduce((s, x) => s + x.count, 0);

  const addCard = (card) => {
    const existing = slots.find((s) => s.cardType === card.cardType && s.cardId === card.id);
    if (existing) {
      setSlots(slots.map((s) =>
        s === existing ? { ...s, count: s.count + 1 } : s
      ));
    } else {
      setSlots([...slots, { cardType: card.cardType, cardId: card.id, count: 1 }]);
    }
  };

  const removeCard = (card) => {
    const existing = slots.find((s) => s.cardType === card.cardType && s.cardId === card.id);
    if (!existing) return;
    if (existing.count === 1) {
      setSlots(slots.filter((s) => s !== existing));
    } else {
      setSlots(slots.map((s) =>
        s === existing ? { ...s, count: s.count - 1 } : s
      ));
    }
  };

  const getCount = (card) => {
    const s = slots.find((x) => x.cardType === card.cardType && x.cardId === card.id);
    return s ? s.count : 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (total !== DECK_SIZE) {
      setError(`Колода должна содержать ровно ${DECK_SIZE} карт. Сейчас: ${total}`);
      return;
    }
    if (!name.trim()) {
      setError('Введите название колоды');
      return;
    }
    if (!heroId) {
      setError('Выберите героя');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/api/decks/${id}`, {
        name: name.trim(),
        heroId,
        cards: slots.map((s) => ({
          cardType: s.cardType,
          cardId: s.cardId,
          count: s.count,
        })),
      });
      setDeck(data);
      if (data?.heroId) setHeroId(data.heroId);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="deck-detail-page"><div className="deck-detail-header"><span>Загрузка...</span></div></div>;
  if (!deck) return <div className="deck-detail-page"><div className="deck-detail-header"><span>Колода не найдена</span><Link to="/decks" className="btn btn-secondary">Назад</Link></div></div>;

  return (
    <div className="decks-page deck-detail-page deck-edit-page">
      <h1>Редактировать колоду</h1>
      <div className="deck-create-actions">
        <Link to="/decks" className="btn btn-secondary">Назад к колодам</Link>
      </div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSave} className="deck-create-form">
        <div className="form-group">
          <label htmlFor="deck-edit-hero">Герой *</label>
          <select
            id="deck-edit-hero"
            value={heroId}
            onChange={(e) => setHeroId(e.target.value)}
            disabled={heroesLoading}
            required
          >
            {(heroes || []).length === 0 ? (
              <option value={heroId || ''}>{heroId ? 'Загрузка списка героев…' : '—'}</option>
            ) : (
              (heroes || [])
                .filter((h) => h.unlocked === true || h.id === heroId)
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.unlocked !== true ? ' (недоступен)' : ''}
                  </option>
                ))
            )}
          </select>
          <p className="form-hint-muted">В матче можно использовать колоду только с этим героем.</p>
        </div>
        <div className="form-group">
          <label>Название колоды *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Моя колода"
            maxLength={50}
          />
        </div>
        <div className="deck-total">
          Карт в колоде: {total} / {DECK_SIZE}
        </div>
        <div className="deck-edit-cards-section">
          <h3>Состав колоды</h3>
          {allCards.length === 0 ? (
            <p className="play-page-deck-hint">В коллекции пока нет карт. Сыграйте матч, чтобы открыть новые.</p>
          ) : (
            <div className="deck-edit-cards-grid">
              {allCards.map((c) => {
                const count = getCount(c);
                const isUnlocked = unlockedCardKeys.has(cardKey(c.cardType, c.id));
                return (
                  <div key={`${c.cardType}-${c.id}`} className={`deck-edit-card-item ${isUnlocked ? '' : 'deck-edit-card-item--locked'}`}>
                    <CardDisplay card={c} size="lg" count={count} />
                    {!isUnlocked && <span className="deck-edit-card-lock">Не открыта</span>}
                    <div className="deck-edit-card-controls">
                      <button type="button" onClick={() => removeCard(c)} className="btn btn-secondary btn-sm" disabled={count === 0}>−</button>
                      <span className="deck-edit-card-count">{count}</span>
                      <button
                        type="button"
                        onClick={() => addCard(c)}
                        className="btn btn-primary btn-sm"
                        disabled={!isUnlocked}
                        title={isUnlocked ? '' : 'Сначала откройте эту карту'}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving || total !== DECK_SIZE}>
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </form>
    </div>
  );
}
