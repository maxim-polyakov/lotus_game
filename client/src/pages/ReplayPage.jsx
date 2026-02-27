import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import CardDisplay from '../components/CardDisplay';

export default function ReplayPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [steps, setSteps] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getCard = useCallback((cardType, cardId) => {
    return allCards.find((c) => c.cardType === cardType && c.id === cardId);
  }, [allCards]);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/api/matches/${matchId}`),
      api.get(`/api/matches/${matchId}/replay`),
      api.get('/api/cards'),
    ])
      .then(([matchRes, replayRes, cardsRes]) => {
        setMatch(matchRes.data);
        setSteps(replayRes.data || []);
        setAllCards(cardsRes.data || []);
        setStepIndex(0);
      })
      .catch((e) => {
        setError(e.response?.data?.message || e.message || 'Не удалось загрузить реплей');
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  const currentStep = steps[stepIndex];
  const gs = currentStep?.gameState;

  if (loading) {
    return (
      <div className="replay-page">
        <div className="replay-loading">Загрузка реплея...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="replay-page">
        <div className="replay-error">
          <p>{error}</p>
          <Link to="/play" className="btn btn-primary">Назад к игре</Link>
        </div>
      </div>
    );
  }

  if (!steps.length) {
    return (
      <div className="replay-page">
        <h1>Реплей матча #{matchId}</h1>
        <p>Реплей недоступен для этого матча.</p>
        <Link to="/play" className="btn btn-secondary">Назад</Link>
      </div>
    );
  }

  const p1 = gs?.player1;
  const p2 = gs?.player2;

  return (
    <div className="replay-page game-board">
      <header>
        <h2>Реплей матча #{matchId}</h2>
        <Link to="/play" className="btn btn-secondary">Назад</Link>
      </header>
      <div className="replay-controls">
        <button
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex <= 0}
          className="btn btn-outline"
        >
          ← Пред.
        </button>
        <span className="replay-step-info">
          Шаг {stepIndex + 1} / {steps.length}
          {currentStep?.description && ` — ${currentStep.description}`}
        </span>
        <button
          onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
          disabled={stepIndex >= steps.length - 1}
          className="btn btn-outline"
        >
          След. →
        </button>
      </div>
      <div className="replay-board">
        <div className="enemy-area">
          <div className="enemy-header">
            <div className="enemy-hero">
              Игрок 2: HP {p2?.health ?? '?'} | Мана: {p2?.mana ?? '?'}
            </div>
          </div>
          <div className="board">
            {(p2?.board || []).map((m) => {
              const card = getCard('MINION', m.cardId);
              return card ? (
                <div key={m.instanceId} className="minion enemy-minion">
                  <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth, taunt: m.taunt, divineShield: m.divineShield }} size="sm" />
                </div>
              ) : (
                <div key={m.instanceId} className="minion enemy-minion">{m.attack}/{m.currentHealth}</div>
              );
            })}
          </div>
        </div>
        <div className="my-area">
          <div className="board">
            {(p1?.board || []).map((m) => {
              const card = getCard('MINION', m.cardId);
              return card ? (
                <div key={m.instanceId} className="minion my-minion">
                  <CardDisplay card={{ ...card, attack: m.attack, health: m.currentHealth, taunt: m.taunt, divineShield: m.divineShield }} size="sm" />
                </div>
              ) : (
                <div key={m.instanceId} className="minion my-minion">{m.attack}/{m.currentHealth}</div>
              );
            })}
          </div>
          <div className="hand">
            {(p1?.hand || []).map((c) => {
              const card = getCard(c.cardType, c.cardId);
              return card ? (
                <div key={c.instanceId} className="card-in-hand">
                  <CardDisplay card={card} size="sm" />
                </div>
              ) : (
                <div key={c.instanceId} className="card-in-hand">{c.cardType} #{c.cardId}</div>
              );
            })}
          </div>
          <div>Мана: {p1?.mana ?? '?'} | HP: {p1?.health ?? '?'}</div>
        </div>
      </div>
    </div>
  );
}
