import api from '../api/client';
import { palette, session, layoutInfo, GAME_WIDTH, GAME_HEIGHT } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { CardGameObject, cardKey } from '../components/CardDisplay';
import { asArray } from '../components/ErrorDetail';

const HEADER_H = 220;
const FOOTER_H = 70;

export class ShopScene extends ListScene {
  constructor() {
    super('ShopScene', 'Магазин', async () => [], () => '');
  }

  create() {
    this.events.once('shutdown', () => this.teardownScroll());
    this.drawBackground('Магазин');
    this.addBackButton();
    this.addMessage('Загрузка магазина...', palette.text, 120);
    this.lastCard = null;
    this.lastHero = null;
    this._scrollY = 0;
    Promise.all([
      api.get('/api/shop/status').then(({ data }) => data),
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/cards/collection').then(({ data }) => asArray(data)),
      api.get('/api/heroes').then(({ data }) => data || []),
    ]).then(([status, cards, collection, heroes]) => {
      this.status = status;
      this.cards = cards;
      this.collection = collection;
      this.heroes = heroes;
      return this.loadCardTextures(cards).then(() => this.renderShop());
    }).catch((err) => {
      this.status = null;
      this.cards = [];
      this.collection = [];
      this.heroes = [];
      this.renderShop(err.response?.data?.message || err.message || 'Ошибка загрузки');
    });
  }

  pin(obj) {
    if (!obj) return obj;
    obj.setScrollFactor?.(0);
    obj.setDepth?.(Math.max(obj.depth || 0, 2000));
    if (obj.list) obj.list.forEach((child) => this.pin(child));
    return obj;
  }

  teardownScroll() {
    this._scrollHandlers?.forEach((off) => {
      try { off(); } catch { /* ignore */ }
    });
    this._scrollHandlers = [];
    this._dragScroll = null;
    if (this.cameras?.main) {
      this.cameras.main.setScroll(0, 0);
    }
  }

  setupScroll(contentBottom) {
    this.teardownScroll();
    const maxScroll = Math.max(0, contentBottom - (GAME_HEIGHT - FOOTER_H));
    this._maxScroll = maxScroll;
    this._scrollY = Math.min(this._scrollY || 0, maxScroll);
    this.cameras.main.setScroll(0, this._scrollY);

    const applyScroll = (next) => {
      this._scrollY = Math.max(0, Math.min(maxScroll, next));
      this.cameras.main.setScroll(0, this._scrollY);
    };

    const onWheel = (_pointer, _over, _dx, dy) => {
      applyScroll((this._scrollY || 0) + dy * 0.55);
    };
    const onDown = (pointer) => {
      if (pointer.y < HEADER_H || pointer.y > GAME_HEIGHT - FOOTER_H) return;
      this._dragScroll = {
        startY: pointer.y,
        startScroll: this._scrollY || 0,
        moved: false,
      };
    };
    const onMove = (pointer) => {
      if (!this._dragScroll || !pointer.isDown) return;
      const dy = this._dragScroll.startY - pointer.y;
      if (Math.abs(dy) > 10) this._dragScroll.moved = true;
      applyScroll(this._dragScroll.startScroll + dy);
    };
    const onUp = () => {
      this._shopDragMoved = !!this._dragScroll?.moved;
      this._dragScroll = null;
      this.time?.delayedCall?.(80, () => { this._shopDragMoved = false; });
    };

    this.input.on('wheel', onWheel);
    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    this.input.on('pointerupoutside', onUp);

    this._scrollHandlers = [
      () => this.input?.off('wheel', onWheel),
      () => this.input?.off('pointerdown', onDown),
      () => this.input?.off('pointermove', onMove),
      () => this.input?.off('pointerup', onUp),
      () => this.input?.off('pointerupoutside', onUp),
    ];

    if (maxScroll > 0) {
      this.pin(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, '↕ прокрутка', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '13px',
        color: palette.muted,
      }).setOrigin(0.5));
    }
  }

  wasDragging() {
    return !!this._shopDragMoved || !!this._dragScroll?.moved;
  }

  renderShop(error = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras.main.setScroll(0, 0);

    const layout = layoutInfo();
    const status = this.status || {};
    const cards = this.cards || [];
    const collection = this.collection || [];
    const heroes = this.heroes || [];

    // Full-screen bg stays put.
    this.pin(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, palette.bg).setOrigin(0));

    // --- Sticky header (scrollFactor 0) ---
    this.pin(this.add.rectangle(0, 0, GAME_WIDTH, HEADER_H, palette.bg, 1).setOrigin(0));

    const logoKey = this.textures.exists('lotus-logo') ? 'lotus-logo' : 'lotus-logo-fallback';
    if (this.textures.exists(logoKey)) {
      this.pin(this.add.image(58, 52, logoKey).setDisplaySize(48, 48));
    } else {
      this.pin(this.add.circle(58, 52, 24, palette.primaryDark).setStrokeStyle(2, palette.primary));
      this.pin(this.add.text(58, 52, 'L', {
        fontFamily: 'Segoe UI, Arial', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5));
    }
    this.pin(this.add.text(94, 34, 'Магазин', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '28px' : '34px',
      color: palette.text,
      fontStyle: 'bold',
    }));
    this.pin(this.add.text(GAME_WIDTH - 92, 42, session.user ? session.user.username : 'Guest', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '15px' : '18px',
      color: palette.muted,
    }).setOrigin(1, 0));

    this.pin(this.add.rectangle(
      layout.portrait ? layout.centerX : 255,
      145,
      layout.portrait ? 560 : 340,
      100,
      palette.panel,
      0.96,
    ).setStrokeStyle(1, 0x34445f));
    this.pin(this.add.text(layout.portrait ? 130 : 110, 112, `Золото: ${status.gold ?? 0}`, {
      fontFamily: 'Segoe UI, Arial', fontSize: '22px', color: '#ffe18c',
    }));
    this.pin(this.add.text(layout.portrait ? 130 : 110, 142, `Пыль: ${status.dust ?? 0}`, {
      fontFamily: 'Segoe UI, Arial', fontSize: '20px', color: '#b9d6ff',
    }));
    this.pin(this.add.text(
      layout.portrait ? 130 : 110,
      170,
      `Неоткрыто: карт ${status.lockedCardsCount ?? 0}, героев ${status.lockedHeroesCount ?? 0}`,
      { fontFamily: 'Segoe UI, Arial', fontSize: '14px', color: palette.muted },
    ));

    this.pin(this.addButton(
      layout.portrait ? layout.centerX : 760,
      125,
      layout.portrait ? 300 : 280,
      44,
      `Случайная карта (${status.randomCardPrice ?? 100})`,
      () => this.buyRandomCard(),
      { fill: palette.primaryDark, fontSize: 15 },
    ));
    this.pin(this.addButton(
      layout.portrait ? layout.centerX : 760,
      178,
      layout.portrait ? 300 : 280,
      44,
      `Случайный герой (${status.randomHeroPrice ?? 300})`,
      () => this.buyRandomHero(),
      { fill: palette.primaryDark, fontSize: 15 },
    ));

    if (error) {
      this.pin(this.add.text(layout.centerX, 205, error, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: '#ffb3b3',
        align: 'center',
        wordWrap: { width: layout.portrait ? 640 : 900 },
      }).setOrigin(0.5));
    }

    this.pin(this.addButton(
      layout.portrait ? 100 : 82,
      layout.portrait ? GAME_HEIGHT - 90 : GAME_HEIGHT - 44,
      120,
      40,
      'Назад',
      () => this.goto('MenuScene'),
      { fontSize: 16 },
    ));

    // --- Scrollable body in world space (moves with camera.scrollY) ---
    let y = HEADER_H + 20;

    if (this.lastCard || this.lastHero) {
      const label = this.lastHero
        ? `Выпал герой: ${this.lastHero.name || this.lastHero.id}`
        : `Выпала карта: ${this.lastCard.name || 'карта'}`;
      this.add.text(layout.centerX, y, label, {
        fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: '#9cffb5',
      }).setOrigin(0.5).setDepth(5);
      y += 36;
    }

    this.add.text(layout.portrait ? 40 : 90, y, 'Пул карт (покупка за пыль)', {
      fontFamily: 'Segoe UI, Arial', fontSize: '20px', color: palette.text,
    }).setDepth(5);
    y += 24;

    const owned = new Set((collection || []).map((c) => cardKey(c)));
    const cardCols = layout.portrait ? 3 : 8;
    const cardGapX = layout.portrait ? 200 : 125;
    const cardGapY = layout.portrait ? 200 : 195;
    const cardStartX = layout.portrait ? 160 : 185;
    const cardTop = y + 80;

    cards.forEach((card, index) => {
      const x = cardStartX + (index % cardCols) * cardGapX;
      const cy = cardTop + Math.floor(index / cardCols) * cardGapY;
      const view = new CardGameObject(this, x, cy, card, { width: 100, height: 140 });
      view.setDepth(5);
      const isOwned = owned.has(cardKey(card));
      if (!isOwned) view.setAlpha(0.55);
      this.add.text(x, cy + 92, isOwned ? 'Открыта' : `${status.specificCardDustPrice ?? 120} пыли`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: isOwned ? '#9cffb5' : '#ffd38a',
      }).setOrigin(0.5).setDepth(6);
      view.on('pointerup', async () => {
        if (this.wasDragging()) return;
        if (isOwned) {
          view.playCardEffect('play', { sound: false });
          return;
        }
        try {
          const { data } = await api.post('/api/shop/buy/card', { cardType: card.cardType, cardId: card.id });
          this.status = {
            ...status,
            dust: data.dust,
            lockedCardsCount: data.lockedCardsCount ?? Math.max(0, (status.lockedCardsCount ?? 1) - 1),
            specificCardDustPrice: data.specificCardDustPrice ?? status.specificCardDustPrice,
          };
          if (session.user) session.user = { ...session.user, dust: data.dust };
          this.collection = [...collection, data.card || card];
          this.lastCard = data.card || card;
          this.lastHero = null;
          this.renderShop('Карта куплена');
        } catch (err) {
          this.renderShop(err.response?.data?.message || err.message || 'Не удалось купить карту');
        }
      });
    });

    const cardRows = Math.max(1, Math.ceil(Math.max(cards.length, 1) / cardCols));
    y = cardTop + cardRows * cardGapY + 36;

    this.add.text(layout.portrait ? 40 : 90, y, 'Пул героев', {
      fontFamily: 'Segoe UI, Arial', fontSize: '20px', color: palette.text,
    }).setDepth(5);
    y += 100;

    if (!heroes.length) {
      this.add.text(layout.portrait ? 40 : 90, y, 'Список героев пока пуст.', {
        fontFamily: 'Segoe UI, Arial', fontSize: '16px', color: palette.muted,
      }).setDepth(5);
      this.setupScroll(y + 60);
      return;
    }

    const heroCols = layout.portrait ? 2 : 4;
    const heroGapX = layout.portrait ? 300 : 270;
    const heroGapY = layout.portrait ? 170 : 160;
    const heroStartX = layout.portrait ? 210 : 230;

    heroes.forEach((hero, index) => {
      const x = heroStartX + (index % heroCols) * heroGapX;
      const hy = y + Math.floor(index / heroCols) * heroGapY;
      const unlocked = hero.unlocked !== false;
      this.add.rectangle(x, hy, layout.portrait ? 260 : 230, 140, unlocked ? palette.panel2 : 0x252a36, 0.95)
        .setStrokeStyle(2, unlocked ? palette.primary : 0x53627a)
        .setDepth(5);
      this.add.circle(x, hy - 36, 34, unlocked ? palette.primaryDark : 0x3c4964).setDepth(6);
      this.add.text(x, hy - 36, (hero.name || '?').slice(0, 1).toUpperCase(), {
        fontFamily: 'Segoe UI, Arial', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(7);
      this.add.text(x, hy + 8, hero.name || hero.id, {
        fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.text, align: 'center', wordWrap: { width: 200 },
      }).setOrigin(0.5).setDepth(7);
      this.add.text(x, hy + 42, unlocked ? `Открыт · HP ${hero.startingHealth ?? '-'}` : 'Не открыт', {
        fontFamily: 'Segoe UI, Arial', fontSize: '14px', color: unlocked ? '#9cffb5' : '#ffb3b3',
      }).setOrigin(0.5).setDepth(7);
    });

    const heroRows = Math.max(1, Math.ceil(heroes.length / heroCols));
    this.setupScroll(y + heroRows * heroGapY + 80);
  }

  async buyRandomCard() {
    try {
      const { data } = await api.post('/api/shop/buy/random-card');
      this.status = {
        ...(this.status || {}),
        gold: data.gold,
        lockedCardsCount: data.lockedCardsCount ?? this.status?.lockedCardsCount,
        randomCardPrice: data.randomCardPrice ?? this.status?.randomCardPrice,
      };
      if (session.user) session.user = { ...session.user, gold: data.gold };
      if (data.card) {
        this.lastCard = data.card;
        this.lastHero = null;
        const key = cardKey(data.card);
        if (!(this.collection || []).some((c) => cardKey(c) === key)) {
          this.collection = [...(this.collection || []), data.card];
        }
      }
      this.renderShop(data.card ? `Выпала карта: ${data.card.name}` : 'Карта куплена');
    } catch (err) {
      this.renderShop(err.response?.data?.message || err.message || 'Не удалось купить карту');
    }
  }

  async buyRandomHero() {
    try {
      const { data } = await api.post('/api/shop/buy/random-hero');
      this.status = {
        ...(this.status || {}),
        gold: data.gold,
        lockedHeroesCount: data.lockedHeroesCount ?? this.status?.lockedHeroesCount,
        randomHeroPrice: data.randomHeroPrice ?? this.status?.randomHeroPrice,
      };
      if (session.user) session.user = { ...session.user, gold: data.gold };
      if (data.hero) {
        this.lastHero = data.hero;
        this.lastCard = null;
        this.heroes = (this.heroes || []).map((h) => (
          h.id === data.hero.id ? { ...h, unlocked: true } : h
        ));
      }
      this.renderShop(data.hero ? `Выпал герой: ${data.hero.name}` : 'Герой куплен');
    } catch (err) {
      this.renderShop(err.response?.data?.message || err.message || 'Не удалось купить героя');
    }
  }
}

export default ShopScene;
