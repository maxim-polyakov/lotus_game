import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, session, layoutInfo } from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { CardGameObject, cardSlotKey } from '../components/CardDisplay';
import { asArray, deckHeroId, errorMessage } from '../components/ErrorDetail';

export const DECK_SIZE = 30;

export class DeckEditorScene extends BaseScene {
  constructor() {
    super('DeckEditorScene');
  }

  create(data = {}) {
    this.events.once('shutdown', () => this.teardownScroll());
    this.deckId = data.deckId || this.currentDeckIdFromPath();
    this.counts = new Map();
    this.deckName = '';
    this._scrollY = 0;
    this.drawBackground(this.deckId ? 'Редактор колоды' : 'Новая колода');
    this.addBackButton('DecksScene');
    this.addMessage('Загрузка коллекции...', palette.text, 120);
    Promise.all([
      this.deckId ? api.get(`/api/decks/${this.deckId}`).then(({ data: deck }) => deck) : Promise.resolve(null),
      api.get('/api/cards').then(({ data: cards }) => cards || []),
      api.get('/api/cards/collection').then(({ data: collection }) => asArray(collection)),
      api.get('/api/heroes').then(({ data: heroes }) => asArray(heroes)),
    ]).then(([deck, cards, collection, heroes]) => {
      this.deck = deck;
      this.cards = cards;
      this.collection = asArray(collection);
      this.heroes = asArray(heroes).filter((h) => h.unlocked !== false);
      this.deckName = deck?.name || 'Новая колода';
      this.heroId = deckHeroId(deck || { heroId: session.selectedHeroId });
      (deck?.cards || []).forEach((slot) => this.counts.set(cardSlotKey(slot), slot.count || 0));
      return Promise.all([
        this.loadCardTextures(cards),
        this.loadImageUrls(this.heroes.map((h) => h.portraitUrl)),
      ]);
    }).then(() => this.render()).catch((err) => this.renderError(errorMessage(err, 'Ошибка загрузки')));
  }

  currentDeckIdFromPath() {
    const match = window.location.pathname.match(/^\/decks\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  teardownScroll() {
    this._scrollHandlers?.forEach((off) => {
      try { off(); } catch { /* ignore */ }
    });
    this._scrollHandlers = [];
    this._dragScroll = null;
    if (this.cameras?.main) this.cameras.main.setScroll(0, 0);
  }

  setupScroll(contentBottom) {
    this.teardownScroll();
    const maxScroll = Math.max(0, contentBottom - GAME_HEIGHT + 40);
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
      this._dragScroll = { startY: pointer.y, startScroll: this._scrollY || 0, moved: false };
    };
    const onMove = (pointer) => {
      if (!this._dragScroll || !pointer.isDown) return;
      const dy = this._dragScroll.startY - pointer.y;
      if (Math.abs(dy) > 10) this._dragScroll.moved = true;
      applyScroll(this._dragScroll.startScroll + dy);
    };
    const onUp = () => {
      this._deckDragMoved = !!this._dragScroll?.moved;
      this._dragScroll = null;
      this.time?.delayedCall?.(80, () => { this._deckDragMoved = false; });
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
  }

  wasDragging() {
    return !!this._deckDragMoved || !!this._dragScroll?.moved;
  }

  pin(obj, depth = 3000) {
    if (!obj) return obj;
    obj.setScrollFactor?.(0);
    if (typeof depth === 'number') obj.setDepth?.(depth);
    if (obj.list) obj.list.forEach((child) => this.pin(child, depth));
    return obj;
  }

  renderError(message) {
    this.teardownScroll();
    this.clearScene();
    this.drawBackground('Редактор колоды');
    this.addBackButton('DecksScene');
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  render(message = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);
    const layout = layoutInfo();
    this.drawBackground(this.deckId ? 'Редактор колоды' : 'Новая колода');
    const back = this.addBackButton('DecksScene');
    this.pin(back);

    const selectedCards = asArray(this.collection).filter((card) => (this.counts.get(cardSlotKey(card)) || 0) > 0);
    const total = [...this.counts.values()].reduce((sum, count) => sum + count, 0);
    const countColor = total === DECK_SIZE ? '#9cffb5' : (total > DECK_SIZE ? '#ffb3b3' : palette.text);
    const hero = this.heroes.find((h) => h.id === this.heroId);

    if (layout.portrait) {
      this.renderPortraitToolbar(hero, total, countColor, message);
      const contentBottom = this.renderPortraitCards(selectedCards);
      this.setupScroll(contentBottom);
      return;
    }

    this.addPanel(460, 145, 840, 92, 0.82);
    this.addButton(225, 145, 260, 42, `Название: ${this.deckName}`, () => {
      const nextName = window.prompt('Название колоды', this.deckName);
      if (nextName && nextName.trim()) {
        this.deckName = nextName.trim();
        this.render();
      }
    }, { fontSize: 15 });
    this.addButton(500, 145, 260, 42, hero?.name || this.heroId, () => {
      if (!this.heroes.length) return;
      const currentIndex = Math.max(0, this.heroes.findIndex((h) => h.id === this.heroId));
      this.heroId = this.heroes[(currentIndex + 1) % this.heroes.length].id;
      this.render();
    }, { fontSize: 15 });
    this.addButton(760, 145, 170, 42, 'Сохранить', () => this.save({ name: this.deckName, heroId: this.heroId }), {
      fontSize: 15,
      fill: total === DECK_SIZE ? palette.primaryDark : 0x3a4458,
    });
    this.add.text(510, 94, `Карт в колоде: ${total} / ${DECK_SIZE}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '22px',
      color: countColor,
    });
    if (message) this.addMessage(message, message.includes('должна') || message.includes('Не') ? '#ffb3b3' : palette.text, 665);

    this.add.text(80, 220, 'Коллекция: нажмите карту, чтобы добавить', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '17px',
      color: palette.muted,
    });
    const cols = 8;
    this.collection.forEach((card, index) => {
      const x = 95 + (index % cols) * 78;
      const y = 290 + Math.floor(index / cols) * 112;
      const view = new CardGameObject(this, x, y, card, { width: 62, height: 88 });
      const key = cardSlotKey(card);
      const count = this.counts.get(key) || 0;
      if (count > 0) {
        this.add.circle(x + 27, y - 38, 11, palette.primaryDark);
        this.add.text(x + 27, y - 38, String(count), { fontFamily: 'Segoe UI, Arial', fontSize: '12px', color: '#fff' }).setOrigin(0.5);
      }
      view.on('pointerdown', () => {
        if (this.wasDragging()) return;
        if (total >= DECK_SIZE) {
          this.render(`Колода уже содержит ${DECK_SIZE} карт`);
          return;
        }
        this.counts.set(key, count + 1);
        view.playCardEffect?.();
        this.render();
      });
    });

    this.add.text(720, 220, 'В колоде: нажмите карту, чтобы убрать', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '17px',
      color: palette.muted,
    });
    const selectedRows = Math.max(1, Math.ceil(selectedCards.length / 6));
    const selectedAreaTop = 270;
    const selectedCardHeight = Math.max(50, Math.min(76, Math.floor((655 - selectedAreaTop) / selectedRows) - 22));
    const selectedCardWidth = Math.round(selectedCardHeight * 0.74);
    const selectedRowGap = selectedCardHeight + 20;
    const selectedStartY = selectedAreaTop + selectedCardHeight / 2;
    selectedCards.forEach((card, index) => {
      const x = 735 + (index % 6) * 78;
      const y = selectedStartY + Math.floor(index / 6) * selectedRowGap;
      const view = new CardGameObject(this, x, y, card, { width: selectedCardWidth, height: selectedCardHeight });
      const key = cardSlotKey(card);
      this.add.text(x, y + selectedCardHeight / 2 + 10, `x${this.counts.get(key)}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '13px',
        color: palette.text,
      }).setOrigin(0.5);
      view.on('pointerdown', () => {
        if (this.wasDragging()) return;
        const next = (this.counts.get(key) || 0) - 1;
        if (next <= 0) this.counts.delete(key);
        else this.counts.set(key, next);
        this.render();
      });
    });

    const collectionRows = Math.ceil(this.collection.length / cols);
    this.setupScroll(Math.max(700, 290 + collectionRows * 112 + 40));
  }

  renderPortraitToolbar(hero, total, countColor, message) {
    const bar = this.add.rectangle(GAME_WIDTH / 2, 70, GAME_WIDTH, 120, 0x10141f, 0.96).setDepth(2500);
    this.pin(bar);
    const nameBtn = this.addButton(GAME_WIDTH / 2, 55, 420, 36, this.deckName, () => {
      const nextName = window.prompt('Название колоды', this.deckName);
      if (nextName && nextName.trim()) {
        this.deckName = nextName.trim();
        this.render();
      }
    }, { fontSize: 15 });
    this.pin(nameBtn);
    const heroBtn = this.addButton(170, 105, 200, 34, hero?.name || this.heroId, () => {
      if (!this.heroes.length) return;
      const currentIndex = Math.max(0, this.heroes.findIndex((h) => h.id === this.heroId));
      this.heroId = this.heroes[(currentIndex + 1) % this.heroes.length].id;
      this.render();
    }, { fontSize: 14 });
    this.pin(heroBtn);
    const saveBtn = this.addButton(400, 105, 150, 34, 'Сохранить', () => this.save({ name: this.deckName, heroId: this.heroId }), {
      fontSize: 14,
      fill: total === DECK_SIZE ? palette.primaryDark : 0x3a4458,
    });
    this.pin(saveBtn);
    const countText = this.add.text(580, 105, `${total}/${DECK_SIZE}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: countColor,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.pin(countText);
    if (message) {
      const msg = this.add.text(GAME_WIDTH / 2, 145, message, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: message.includes('должна') || message.includes('Не') ? '#ffb3b3' : palette.text,
        align: 'center',
        wordWrap: { width: 640 },
      }).setOrigin(0.5);
      this.pin(msg);
    }
  }

  renderPortraitCards(selectedCards) {
    let y = 190;
    this.add.text(40, y, 'Коллекция', { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.muted });
    y += 50;
    const cols = 4;
    const gapX = 160;
    const gapY = 150;
    const startX = 110;
    this.collection.forEach((card, index) => {
      const x = startX + (index % cols) * gapX;
      const cy = y + Math.floor(index / cols) * gapY;
      const view = new CardGameObject(this, x, cy, card, { width: 90, height: 126 });
      const key = cardSlotKey(card);
      const count = this.counts.get(key) || 0;
      if (count > 0) {
        this.add.circle(x + 34, cy - 52, 13, palette.primaryDark);
        this.add.text(x + 34, cy - 52, String(count), { fontFamily: 'Segoe UI, Arial', fontSize: '13px', color: '#fff' }).setOrigin(0.5);
      }
      view.on('pointerdown', () => {
        if (this.wasDragging()) return;
        const total = [...this.counts.values()].reduce((sum, c) => sum + c, 0);
        if (total >= DECK_SIZE) {
          this.render(`Колода уже содержит ${DECK_SIZE} карт`);
          return;
        }
        this.counts.set(key, count + 1);
        this.render();
      });
    });
    y += Math.max(1, Math.ceil(this.collection.length / cols)) * gapY + 30;

    this.add.text(40, y, 'В колоде', { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.muted });
    y += 50;
    if (!selectedCards.length) {
      this.add.text(40, y, 'Пока пусто — добавьте карты из коллекции', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: palette.muted,
      });
      y += 80;
    } else {
      selectedCards.forEach((card, index) => {
        const x = startX + (index % cols) * gapX;
        const cy = y + Math.floor(index / cols) * gapY;
        const view = new CardGameObject(this, x, cy, card, { width: 90, height: 126 });
        const key = cardSlotKey(card);
        this.add.text(x, cy + 74, `x${this.counts.get(key)}`, {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '14px',
          color: palette.text,
        }).setOrigin(0.5);
        view.on('pointerdown', () => {
          if (this.wasDragging()) return;
          const next = (this.counts.get(key) || 0) - 1;
          if (next <= 0) this.counts.delete(key);
          else this.counts.set(key, next);
          this.render();
        });
      });
      y += Math.ceil(selectedCards.length / cols) * gapY + 40;
    }
    return y + 60;
  }

  async save(values) {
    if (this.saving) return;
    const total = [...this.counts.values()].reduce((sum, count) => sum + count, 0);
    if (total !== DECK_SIZE) {
      this.render(`Колода должна содержать ровно ${DECK_SIZE} карт. Сейчас: ${total}`);
      return;
    }
    if (!values.name?.trim()) {
      this.render('Введите название колоды');
      return;
    }
    if (!values.heroId) {
      this.render('Выберите героя');
      return;
    }
    this.saving = true;
    try {
      const cards = [...this.counts.entries()].flatMap(([key, count]) => {
        const [cardType, rawId] = key.split(':');
        return count > 0 ? [{ cardType, cardId: Number(rawId), count }] : [];
      });
      const payload = { name: values.name.trim(), heroId: values.heroId, cards };
      if (this.deckId) await api.put(`/api/decks/${this.deckId}`, payload);
      else {
        const { data } = await api.post('/api/decks', payload);
        this.deckId = data.id;
        window.history.pushState({}, '', `/decks/${data.id}`);
      }
      this.deckName = values.name.trim();
      this.heroId = values.heroId;
      this.render('Колода сохранена');
    } catch (err) {
      this.render(errorMessage(err, 'Не удалось сохранить'));
    } finally {
      this.saving = false;
    }
  }
}

export default DeckEditorScene;
