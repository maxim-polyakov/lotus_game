import React from 'react';

/**
 * Отображает карту в виде карточки (для колод, выбора и т.д.)
 * @param {Object} card - { id, cardType, name, manaCost, attack?, health?, description? }
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {number} count - количество копий (показывается бейджем)
 */
export default function CardDisplay({ card, size = 'md', count }) {
  if (!card) return null;
  const isMinion = card.cardType === 'MINION';
  const sizeClass = `card-display--${size}`;
  const attack = card.attack ?? 0;
  const health = card.health ?? 0;
  const hasImage = !!card.imageUrl;

  return (
    <div
      className={`card-display ${sizeClass} ${hasImage ? 'card-display--with-image' : ''}`}
      title={card.description}
      style={hasImage ? { backgroundImage: `url(${card.imageUrl})` } : undefined}
    >
      {hasImage && <div className="card-display-image-overlay" />}
      {count != null && count > 1 && <span className="card-display-count">{count}</span>}
      <div className="card-display-mana">{card.manaCost}</div>
      {!isMinion && <div className="card-display-type">Заклинание</div>}
      <div className="card-display-name">{card.name}</div>
      {(card.taunt || card.charge || card.divineShield || card.windfury || card.stealth || card.poisonous || card.lifesteal || card.rush || card.battlecryType || card.deathrattleType) && (
        <div className="card-display-keywords">
          {card.taunt && <span className="keyword keyword-taunt">Taunt</span>}
          {card.charge && <span className="keyword keyword-charge">Charge</span>}
          {card.divineShield && <span className="keyword keyword-divine">Shield</span>}
          {card.windfury && <span className="keyword keyword-windfury">Windfury</span>}
          {card.stealth && <span className="keyword keyword-stealth">Stealth</span>}
          {card.poisonous && <span className="keyword keyword-poisonous">Poisonous</span>}
          {card.lifesteal && <span className="keyword keyword-lifesteal">Lifesteal</span>}
          {card.rush && <span className="keyword keyword-rush">Rush</span>}
          {card.battlecryType && <span className="keyword keyword-battlecry">Battlecry</span>}
          {card.deathrattleType && <span className="keyword keyword-deathrattle">Deathrattle</span>}
        </div>
      )}
      <div className="card-display-right-stats">
        <span className="card-display-attack" title="Атака">{attack}</span>
        <span className="card-display-health" title="Защита">{health}</span>
      </div>
    </div>
  );
}
