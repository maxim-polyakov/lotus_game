import api from '../api/client';
import { palette, session, layoutInfo, GAME_WIDTH, GAME_HEIGHT } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { CardGameObject, cardKey } from '../components/CardDisplay';
import { asArray } from '../components/ErrorDetail';

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

  teardownScroll() {
    this._scrollHandlers?.forEach((off) => {
      try { off(); } catch { /* ignore */ }
    });
    this._scrollHandlers = [];
    this._dragScroll = null;
  }

  setupScroll(contentBottom) {
    this.teardownScroll();
    const maxScroll = Math.max(0, contentBottom - GAME_HEIGHT + 120);
    this._maxScroll = maxScroll;
    this._scrollY = Math.min(this._scrollY || 0, maxScroll);
    if (this.content) this.content.y = -this._scrollY;

    const applyScroll = (next) => {
      this._scrollY = Math.max(0, Math.min(maxScroll, next));
      if (this.content) this.content.y = -this._scrollY;
    };

    const onWheel = (_pointer, _currentlyOver, _dx, dy) => {
      applyScroll((this._scrollY || 0) + dy * 0.55);
    };
    this.input.on('wheel', onWheel);

    const onDown = (pointer) => {
      if (pointer.y < 100) return;
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
      this.time?.delayedCall?.(80, () => {
        this._shopDragMoved = false;
      });
    };
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
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, '↕ прокрутка', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '13px',
        color: palette.muted,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    }
  }

  wasDragging() {
    return !!this._shopDragMoved || !!this._dragScroll?.moved;
  }

  renderShop(error = '') {
    this.teardownScroll();
    this.clearScene();
    const layout = layoutInfo();
    const status = this.status || {};
    const cards = this.cards || [];
    const collection = this.collection || [];
    const heroes = this.heroes || [];

    // Fixed chrome
    this.drawBackground('Магазин');
    this.children.list.forEach((child) => child.setScrollFactor?.(0));
    this.addBackButton();
    this.children.list[this.children.list.length - 1]?.setDepth?.(2000);
    this.children.list[this.children.list.length - 1]?.setScrollFactor?.(0);

    this.addPanel(layout.portrait ? layout.centerX : 255, layout.portrait ? 150 : 150, layout.portrait ? 560 : 340, 110)
      .setScrollFactor(0)
      .setDepth(50);
    this.add.text(layout.portrait ? 130 : 110, 118, `Золото: ${status.gold ?? 0}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '22px',
      color: '#ffe18c',
    }).setScrollFactor(0).setDepth(51);
    this.add.text(layout.portrait ? 130 : 110, 150, `Пыль: ${status.dust ?? 0}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '20px',
      color: '#b9d6ff',
    }).setScrollFactor(0).setDepth(51);
    this.add.text(layout.portrait ? 130 : 110, 178, `Неоткрыто: карт ${status.lockedCardsCount ?? 0}, героев ${status.lockedHeroesCount ?? 0}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '14px',
      color: palette.muted,
    }).setScrollFactor(0).setDepth(51);

    const buyCardBtn = this.addButton(
      layout.portrait ? layout.centerX : 760,
      layout.portrait ? 130 : 130,
      layout.portrait ? 300 : 280,
      44,
      `Случайная карта (${status.randomCardPrice ?? 100})`,
      () => this.buyRandomCard(),
      { fill: palette.primaryDark, fontSize: 15 },
    );
    buyCardBtn.setScrollFactor(0).setDepth(52);
    const buyHeroBtn = this.addButton(
      layout.portrait ? layout.centerX : 760,
      layout.portrait ? 185 : 185,
      layout.portrait ? 300 : 280,
      44,
      `Случайный герой (${status.randomHeroPrice ?? 300})`,
      () => this.buyRandomHero(),
      { fill: palette.primaryDark, fontSize: 15 },
    );
    buyHeroBtn.setScrollFactor(0).setDepth(52);

    if (error) {
      this.add.text(layout.centerX, 228, error, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '16px',
        color: '#ffb3b3',
        align: 'center',
        wordWrap: { width: layout.portrait ? 640 : 900 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(53);
    }

    // Scrollable body
    this.content = this.add.container(0, 0).setDepth(1);
    let yCursor = layout.portrait ? 270 : 250;

    if (this.lastCard || this.lastHero) {
      const label = this.lastHero
        ? `Выпал герой: ${this.lastHero.name || this.lastHero.id}`
        : `Выпала карта: ${this.lastCard.name || 'карта'}`;
      const t = this.add.text(layout.centerX, yCursor, label, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '18px',
        color: '#9cffb5',
      }).setOrigin(0.5);
      this.content.add(t);
      yCursor += 36;
    }

    const cardsTitle = this.add.text(layout.portrait ? 40 : 90, yCursor, 'Пул карт (покупка за пыль)', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '20px',
      color: palette.text,
    });
    this.content.add(cardsTitle);
    yCursor += 28;

    const owned = new Set((collection || []).map((c) => cardKey(c)));
    const cardCols = layout.portrait ? 3 : 8;
    const cardGapX = layout.portrait ? 200 : 125;
    const cardGapY = layout.portrait ? 200 : 195;
    const cardStartX = layout.portrait ? 160 : 185;
    cards.forEach((card, index) => {
      const x = cardStartX + (index % cardCols) * cardGapX;
      const y = yCursor + 80 + Math.floor(index / cardCols) * cardGapY;
      const view = new CardGameObject(this, x, y, card, { width: 100, height: 140 });
      const isOwned = owned.has(cardKey(card));
      if (!isOwned) view.setAlpha(0.55);
      const stateText = this.add.text(x, y + 92, isOwned ? 'Открыта' : `${status.specificCardDustPrice ?? 120} пыли`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: isOwned ? '#9cffb5' : '#ffd38a',
      }).setOrigin(0.5);
      this.content.add([view, stateText]);
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
    yCursor += 80 + cardRows * cardGapY + 24;

    const heroesTitle = this.add.text(layout.portrait ? 40 : 90, yCursor, 'Пул героев', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '20px',
      color: palette.text,
    });
    this.content.add(heroesTitle);
    yCursor += 40;

    if (!heroes.length) {
      const empty = this.add.text(layout.portrait ? 40 : 90, yCursor + 20, 'Список героев пока пуст.', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '16px',
        color: palette.muted,
      });
      this.content.add(empty);
      this.setupScroll(yCursor + 80);
      return;
    }

    const heroCols = layout.portrait ? 2 : 4;
    const heroGapX = layout.portrait ? 300 : 270;
    const heroGapY = layout.portrait ? 170 : 160;
    const heroStartX = layout.portrait ? 210 : 230;
    heroes.forEach((hero, index) => {
      const x = heroStartX + (index % heroCols) * heroGapX;
      const y = yCursor + Math.floor(index / heroCols) * heroGapY;
      const unlocked = hero.unlocked !== false;
      const panel = this.add.rectangle(x, y, layout.portrait ? 260 : 230, 140, unlocked ? palette.panel2 : 0x252a36, 0.95)
        .setStrokeStyle(2, unlocked ? palette.primary : 0x53627a);
      const avatarY = y - 36;
      const avatar = this.add.circle(x, avatarY, 34, unlocked ? palette.primaryDark : 0x3c4964);
      const letter = this.add.text(x, avatarY, (hero.name || '?').slice(0, 1).toUpperCase(), {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const name = this.add.text(x, y + 8, hero.name || hero.id, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '18px',
        color: palette.text,
        align: 'center',
        wordWrap: { width: 200 },
      }).setOrigin(0.5);
      const state = this.add.text(x, y + 42, unlocked ? `Открыт · HP ${hero.startingHealth ?? '-'}` : 'Не открыт', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: unlocked ? '#9cffb5' : '#ffb3b3',
      }).setOrigin(0.5);
      this.content.add([panel, avatar, letter, name, state]);
    });

    const heroRows = Math.max(1, Math.ceil(heroes.length / heroCols));
    const contentBottom = yCursor + heroRows * heroGapY + 100;
    this.setupScroll(contentBottom);
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
