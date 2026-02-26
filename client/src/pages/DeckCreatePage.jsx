import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

const DECK_SIZE = 30;

export default function DeckCreatePage() {
  const [name, setName] = useState('');
  const [cards, setCards] = useState([]);
  const [slots, setSlots] = useState([]); // { cardType, cardId, count }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadCards = useCallback(() => {
    setError('');
    api.get('/api/cards')
      .then(({ data }) => {
        setCards(data || []);
        setError('');
      })
      .catch((e) => {
        let msg = e.response?.data?.message;
        if (!msg) {
          if (e.code === 'ERR_NETWORK' || e.message?.includes('Network Error')) {
            msg = 'Сервер недоступен. Запустите backend (mvn spring-boot:run) на порту 8080.';
          } else if (e.response?.status === 401) {
            msg = 'Сессия истекла. Войдите снова.';
          } else {
            msg = e.message || 'Не удалось загрузить карты';
          }
        }
        setError(msg);
      });
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

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

  const handleSubmit = async (e) => {
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
    setLoading(true);
    try {
      await api.post('/api/decks', {
        name: name.trim(),
        cards: slots.map((s) => ({
          cardType: s.cardType,
          cardId: s.cardId,
          count: s.count,
        })),
      });
      navigate('/decks');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка создания колоды');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="decks-page deck-create-page">
      <h1>Создать колоду</h1>
      <div className="deck-create-actions">
        <Link to="/decks" className="btn btn-secondary">Назад</Link>
      </div>
      {error && (
        <div className="error">
          {error}
          <button type="button" onClick={loadCards} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
            Повторить
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="deck-create-form">
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
        <div className="cards-list">
          {cards.map((c) => (
            <div key={`${c.cardType}-${c.id}`} className="card-row">
              <span className="card-name">
                [{c.cardType}] {c.name} ({c.manaCost} маны)
              </span>
              <div className="card-controls">
                <button type="button" onClick={() => removeCard(c)} className="btn btn-secondary btn-sm" disabled={getCount(c) === 0}>
                  −
                </button>
                <span className="card-count">{getCount(c)}</span>
                <button type="button" onClick={() => addCard(c)} className="btn btn-primary btn-sm">
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || total !== DECK_SIZE}>
          {loading ? 'Создание...' : 'Создать колоду'}
        </button>
      </form>
    </div>
  );
}
