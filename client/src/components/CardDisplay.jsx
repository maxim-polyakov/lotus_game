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
  const hasAnimation = !!card.animationUrl;
  const hasImage = !!card.imageUrl;
  const hasVisual = hasAnimation || hasImage;
  const isGif = hasAnimation && card.animationUrl.toLowerCase().endsWith('.gif');

  return (
    <div
      className={`card-display ${sizeClass} ${hasVisual ? 'card-display--with-image' : ''}`}
      title={card.description}
      style={!hasAnimation && hasImage ? { backgroundImage: `url(${card.imageUrl})` } : undefined}
    >
      {hasAnimation && (
        <div className="card-display-animation">
          {isGif ? (
            <img src={card.animationUrl} alt="" />
          ) : (
            <video src={card.animationUrl} autoPlay loop muted playsInline />
          )}
        </div>
      )}
      {hasVisual && <div className="card-display-image-overlay" />}
      {count != null && count > 1 && <span className="card-display-count">{count}</span>}
      <div className="card-display-mana">{card.manaCost}</div>
      {!isMinion && <div className="card-display-type">Заклинание</div>}
      <div className="card-display-name">{card.name}</div>
      <div className="card-display-right-stats">
        <span className="card-display-attack" title="Атака">{attack}</span>
        <span className="card-display-health" title="Защита">{health}</span>
      </div>
    </div>
  );
}
