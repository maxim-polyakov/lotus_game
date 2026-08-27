import React from 'react';
import { Link } from 'react-router-dom';

function rewardIcon(type) {
  if (type === 'REWARD_GOLD') return 'ЁЯТ░';
  if (type === 'REWARD_DUST') return 'тЬи';
  if (type === 'CARD_UNLOCK') return 'ЁЯГП';
  if (type === 'HERO_UNLOCK') return 'ЁЯОЦя╕П';
  return 'ЁЯОБ';
}

export default function PostMatchReward({ reward, onClose }) {
  if (!reward) return null;

  const isHero = reward.type === 'HERO_UNLOCK';
  const isCard = reward.type === 'CARD_UNLOCK';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content hero-drop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>╨Э╨░╨│╤А╨░╨┤╨░ ╨╖╨░ ╨╝╨░╤В╤З</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>├Ч</button>
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
              <h3>{reward.title || '╨Э╨░╨│╤А╨░╨┤╨░'}</h3>
              <p>{reward.message || ''}</p>
              {isCard && reward.cardName && (
                <p className="post-match-reward-amount">{reward.cardName}</p>
              )}
              {!isHero && reward.rewardAmount != null && (
                <p className="post-match-reward-amount">+{reward.rewardAmount}</p>
              )}
            </div>
          </div>
          <div className="hero-drop-actions">
            <Link to="/notifications" className="btn btn-outline" onClick={onClose}>╨г╨▓╨╡╨┤╨╛╨╝╨╗╨╡╨╜╨╕╤П</Link>
            {isHero && <Link to="/heroes" className="btn btn-primary" onClick={onClose}>╨Ъ ╨│╨╡╤А╨╛╤П╨╝</Link>}
            {isCard && <Link to="/decks/new" className="btn btn-primary" onClick={onClose}>╨б╨╛╨▒╤А╨░╤В╤М ╨║╨╛╨╗╨╛╨┤╤Г</Link>}
            <button type="button" className="btn btn-secondary" onClick={onClose}>╨Ч╨░╨║╤А╤Л╤В╤М</button>
          </div>
        </div>
      </div>
    </div>
  );
}
