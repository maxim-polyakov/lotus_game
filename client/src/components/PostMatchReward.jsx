import React from 'react';
import { Link } from 'react-router-dom';

function rewardIcon(type) {
  if (type === 'REWARD_GOLD') return '💰';
  if (type === 'REWARD_DUST') return '✨';
  if (type === 'HERO_UNLOCK') return '🎖️';
  return '🎁';
}

export default function PostMatchReward({ reward, onClose }) {
  if (!reward) return null;

  const isHero = reward.type === 'HERO_UNLOCK';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content hero-drop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Награда за матч</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>×</button>
        </div>
        <div className="modal-body hero-drop-body">
          <div className="hero-drop-card">
            {isHero ? (
              <div className={`hero-card-portrait hero-card-portrait--${reward.heroId || 'default'} hero-drop-portrait`}>
                {reward.heroPortraitUrl ? (
                  <img src={reward.heroPortraitUrl} alt="" />
                ) : (
                  <span>{(reward.heroName || '?').charAt(0)}</span>
                )}
              </div>
            ) : (
              <div className="post-match-reward-icon" aria-hidden>
                {rewardIcon(reward.type)}
              </div>
            )}
            <div className="hero-drop-info">
              <h3>{reward.title || 'Награда'}</h3>
              <p>{reward.message || ''}</p>
              {!isHero && reward.rewardAmount != null && (
                <p className="post-match-reward-amount">+{reward.rewardAmount}</p>
              )}
            </div>
          </div>
          <div className="hero-drop-actions">
            <Link to="/notifications" className="btn btn-outline" onClick={onClose}>Уведомления</Link>
            {isHero && <Link to="/heroes" className="btn btn-primary" onClick={onClose}>К героям</Link>}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  );
}
