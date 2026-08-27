import Phaser from 'phaser';
import { API_BASE } from '../api/client';
import { palette, session } from '../game/shared';
import { hashString } from './ErrorDetail';
import { playSoundFromUrl } from '../utils/sound';

export function cardKey(card) {
  return `${card?.cardType || 'CARD'}:${card?.id}`;
}

export function cardSlotKey(cardOrSlot) {
  return `${cardOrSlot?.cardType || 'CARD'}:${cardOrSlot?.cardId ?? cardOrSlot?.id}`;
}

export function resolveAssetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

/** Same-origin proxy for WebGL textures when S3 has no CORS. */
export function resolveTextureUrl(url) {
  const absolute = resolveAssetUrl(url);
  if (!absolute) return '';
  if (/^https:\/\/storage\.yandexcloud\.net\/[^/]+\//i.test(absolute)) {
    return `${API_BASE}/api/media/proxy?url=${encodeURIComponent(absolute)}`;
  }
  return absolute;
}

export function textureKey(card) {
  // Phaser treats ":" as key:frame, so never put cardType:id in texture keys.
  const type = String(card?.cardType || 'CARD').replace(/[^a-zA-Z0-9_-]/g, '_');
  const id = card?.id ?? 'x';
  return `card-art-${type}-${id}-${hashString(resolveTextureUrl(card?.imageUrl))}`;
}

export function playCardSound(card, kind = 'play') {
  if (session.soundEnabled === false) return;
  const preferred = kind === 'attack'
    ? (card?.attackSoundUrl || card?.soundUrl)
    : (card?.soundUrl || card?.attackSoundUrl);
  const url = resolveAssetUrl(preferred);
  if (url) playSoundFromUrl(url);
}

/** Short Russian labels for keywords / battlecry / deathrattle. */
export function cardEffectLabels(card) {
  if (!card) return [];
  const labels = [];
  if (card.taunt) labels.push('Провокация');
  if (card.charge) labels.push('Рывок');
  if (card.divineShield) labels.push('Щит');
  if (card.windfury) labels.push('Ветроярость');
  if (card.stealth) labels.push('Стелс');
  if (card.poisonous) labels.push('Яд');
  if (card.lifesteal) labels.push('Вампиризм');
  if (card.rush) labels.push('Натиск');
  const battlecry = String(card.battlecryType || '').toUpperCase();
  if (battlecry && battlecry !== 'NONE') labels.push('Боевой клич');
  const deathrattle = String(card.deathrattleType || '').toUpperCase();
  if (deathrattle && deathrattle !== 'NONE') labels.push('Предсмертный');
  return labels;
}

export class CardGameObject extends Phaser.GameObjects.Container {
  constructor(scene, x, y, card, options = {}) {
    super(scene, x, y);
    this.card = card;
    this.options = options;
    this.w = options.width || 105;
    this.h = options.height || 145;
    // Must be in the display list before setInteractive, or hits are unreliable.
    scene.add.existing(this);
    this.build();
  }

  build() {
    const isMinion = this.card?.cardType === 'MINION';
    const compact = this.h < 125 || this.w < 90;
    const manaRadius = compact ? 10 : 14;
    const statRadius = compact ? 10 : 14;
    const artHeight = compact ? Math.max(24, this.h - 50) : this.h - 48;
    const artY = compact ? -this.h * 0.18 : -18;
    const nameY = compact ? this.h / 2 - 30 : 33;
    const bg = this.scene.add.rectangle(0, 0, this.w, this.h, 0x26324a, 1)
      .setStrokeStyle(2, this.options.selected ? palette.primary : 0x5c6f95);
    this.bg = bg;
    this._selected = !!this.options.selected;
    this.add(bg);

    const key = textureKey(this.card);
    if (this.card?.imageUrl && this.scene.textures.exists(key)) {
      const art = this.scene.add.image(0, artY, key).setDisplaySize(this.w - 12, artHeight);
      this.add(art);
    } else {
      this.addFallbackArt(artY, artHeight, compact, isMinion);
    }

    const mana = this.scene.add.circle(-this.w / 2 + manaRadius, -this.h / 2 + manaRadius, manaRadius, 0x235bd6)
      .setStrokeStyle(2, 0xc9d6ff);
    const manaText = this.scene.add.text(mana.x, mana.y, String(this.card?.manaCost ?? 0), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: compact ? '11px' : '17px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add([mana, manaText]);

    this.add(this.scene.add.text(0, nameY, this.card?.name || 'Карта', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: compact ? '9px' : '13px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: this.w - 12 },
    }).setOrigin(0.5));

    this.addEffectLabels(compact, artY, artHeight);

    const desc = this.card?.description || '';
    if (desc && !compact) {
      this.add(this.scene.add.text(0, 62, desc, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '10px',
        color: '#d7dfef',
        align: 'center',
        wordWrap: { width: this.w - 14 },
      }).setOrigin(0.5, 0));
    }

    if (isMinion) {
      this.addStat(-this.w / 2 + statRadius + 3, this.h / 2 - statRadius - 3, this.card?.attack ?? 0, 0xb33a32, statRadius);
      this.addStat(this.w / 2 - statRadius - 3, this.h / 2 - statRadius - 3, this.card?.health ?? this.card?.currentHealth ?? 0, 0x2e9a58, statRadius);
    } else {
      this.addStat(this.w / 2 - statRadius - 3, this.h / 2 - statRadius - 3, this.card?.damage ?? 0, 0x8a47cf, statRadius);
    }

    this.setSize(this.w, this.h);
    this.installFullCardHitArea();
  }

  /** Transparent full-card pad on top so the whole card is tappable (not just center/art). */
  installFullCardHitArea() {
    if (this.bg?.input) this.bg.disableInteractive();
    if (this.input) this.removeInteractive();
    if (this.hitPad) {
      try { this.hitPad.destroy(); } catch { /* ignore */ }
      this.hitPad = null;
    }

    // Alpha 0.001 keeps a real WebGL quad for reliable hit-testing on mobile.
    this.hitPad = this.scene.add.rectangle(0, 0, this.w, this.h, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    this.add(this.hitPad);
    this.bringToTop(this.hitPad);

    // Forward pointer events so listeners on the CardGameObject still work.
    ['pointerdown', 'pointerup', 'pointerover', 'pointerout', 'pointermove'].forEach((evt) => {
      this.hitPad.on(evt, (...args) => this.emit(evt, ...args));
    });
  }

  setInputEnabled(enabled) {
    const on = !!enabled;
    if (on && !this.hitPad) this.installFullCardHitArea();
    if (this.hitPad?.input) this.hitPad.input.enabled = on;
  }

  addEffectLabels(compact, artY, artHeight) {
    const labels = cardEffectLabels(this.card);
    if (!labels.length) return;
    const max = compact ? 2 : 4;
    const shown = labels.slice(0, max);
    const fontSize = compact ? '8px' : '10px';
    const lineH = compact ? 10 : 12;
    const startY = artY + artHeight / 2 - (shown.length * lineH) / 2;
    shown.forEach((label, index) => {
      const y = startY + index * lineH;
      const w = Math.min(this.w - 10, 4 + label.length * (compact ? 5.2 : 6.2));
      const badge = this.scene.add.rectangle(0, y, w, lineH - 1, 0x1a2233, 0.9)
        .setStrokeStyle(1, palette.primary);
      const text = this.scene.add.text(0, y, label, {
        fontFamily: 'Segoe UI, Arial',
        fontSize,
        color: '#ffe9a8',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add([badge, text]);
    });
    if (labels.length > max) {
      const more = this.scene.add.text(0, startY + shown.length * lineH, `+${labels.length - max}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: compact ? '8px' : '10px',
        color: '#c9b27a',
      }).setOrigin(0.5);
      this.add(more);
    }
  }

  setSelected(selected) {
    const next = !!selected;
    if (this._selected === next) return;
    this._selected = next;
    this.options.selected = next;
    this.bg?.setStrokeStyle(2, next ? palette.primary : 0x5c6f95);
  }

  addFallbackArt(artY, artHeight, compact, isMinion) {
    const artWidth = this.w - 12;
    const fallback = this.scene.add.rectangle(0, artY, artWidth, artHeight, 0x35415a, 0.95)
      .setStrokeStyle(1, 0x66789f);
    const radius = Math.max(10, Math.min(artWidth, artHeight) * 0.26);
    const accent = isMinion ? 0xb46a38 : 0x7750c8;
    const avatar = this.scene.add.circle(0, artY - (compact ? 0 : 4), radius, accent, 0.95)
      .setStrokeStyle(2, 0xf0d890);
    const rawName = (this.card?.name || this.card?.cardType || '?').trim();
    const label = rawName.slice(0, 1).toUpperCase();
    const labelText = this.scene.add.text(avatar.x, avatar.y, label, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: compact ? '15px' : '26px',
      color: '#fff6d0',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add([fallback, avatar, labelText]);

    if (!compact) {
      this.add(this.scene.add.text(0, artY + radius + 8, isMinion ? 'MINION' : 'SPELL', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '9px',
        color: '#c6d3ee',
        letterSpacing: 1,
      }).setOrigin(0.5));
    }
  }

  addStat(x, y, value, color, radius = 14) {
    const circle = this.scene.add.circle(x, y, radius, color).setStrokeStyle(2, 0xffffff);
    const text = this.scene.add.text(x, y, String(value), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: radius <= 10 ? '10px' : '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add([circle, text]);
  }

  playCardEffect(kind = 'play', options = {}) {
    const withSound = options.sound !== false;
    if (withSound) playCardSound(this.card, kind);
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1.18, to: 1 },
      angle: { from: -4, to: 0 },
      duration: 260,
      ease: 'Back.Out',
    });
    this.spawnBurst(palette.primary);
  }

  playHitEffect() {
    this.scene.tweens.add({
      targets: this,
      x: this.x + 8,
      yoyo: true,
      repeat: 3,
      duration: 45,
      ease: 'Sine.InOut',
    });
    this.spawnBurst(palette.danger);
  }

  spawnBurst(color) {
    const particles = [];
    for (let i = 0; i < 10; i += 1) {
      const dot = this.scene.add.circle(this.x, this.y, 4, color, 0.95);
      particles.push(dot);
      this.scene.tweens.add({
        targets: dot,
        x: this.x + Phaser.Math.Between(-70, 70),
        y: this.y + Phaser.Math.Between(-70, 70),
        alpha: 0,
        scale: 0.2,
        duration: 420,
        ease: 'Cubic.Out',
        onComplete: () => dot.destroy(),
      });
    }
    return particles;
  }
}
