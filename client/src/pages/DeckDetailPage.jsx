import api from '../api/client';
import { GAME_HEIGHT, palette, session } from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { CardGameObject, cardSlotKey } from '../components/CardDisplay';
import { asArray, deckHeroId, errorMessage } from '../components/ErrorDetail';

export class DeckEditorScene extends BaseScene {
  constructor() {
    super('DeckEditorScene');
  }

  create(data = {}) {
    this.deckId = data.deckId || this.currentDeckIdFromPath();
    this.counts = new Map();
    this.deckName = '';
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
      return this.loadCardTextures(cards);
    }).then(() => this.render()).catch((err) => this.renderError(err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  currentDeckIdFromPath() {
    const match = window.location.pathname.match(/^\/decks\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  renderError(message) {
    this.clearScene();
    this.drawBackground('Редактор колоды');
    this.addBackButton('DecksScene');
    this.addMessage(message, '#ffb3b3', GAME_HEIGHT / 2);
  }

  render(message = '') {
    this.clearScene();
    this.drawBackground(this.deckId ? 'Редактор колоды' : 'Новая колода');
    this.addBackButton('DecksScene');
    const selectedCards = asArray(this.collection).filter((card) => (this.counts.get(cardSlotKey(card)) || 0) > 0);
    const total = [...this.counts.values()].reduce((sum, count) => sum + count, 0);

    this.addPanel(460, 145, 840, 92, 0.82);
    const hero = this.heroes.find((h) => h.id === this.heroId);
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
      fill: palette.primaryDark,
    });

    this.add.text(510, 94, `Карт в колоде: ${total}`, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '22px',
      color: total > 0 ? palette.text : '#ffb3b3',
    });
    if (message) this.addMessage(message, palette.text, 665);

    this.add.text(80, 245, 'Коллекция: нажмите карту, чтобы добавить', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.muted,
    });
    this.collection.slice(0, 18).forEach((card, index) => {
      const x = 95 + (index % 7) * 78;
      const y = 310 + Math.floor(index / 7) * 112;
      const view = new CardGameObject(this, x, y, card, { width: 62, height: 88 });
      const key = cardSlotKey(card);
      const count = this.counts.get(key) || 0;
      if (count > 0) {
        this.add.circle(x + 27, y - 38, 11, palette.primaryDark);
        this.add.text(x + 27, y - 38, String(count), { fontFamily: 'Segoe UI, Arial', fontSize: '12px', color: '#fff' }).setOrigin(0.5);
      }
      view.on('pointerdown', () => {
        this.counts.set(key, count + 1);
        view.playCardEffect();
        this.render();
      });
    });

    this.add.text(720, 245, 'В колоде: нажмите карту, чтобы убрать', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color: palette.muted,
    });
    const selectedVisibleCards = selectedCards.slice(0, 30);
    const selectedRows = Math.max(1, Math.ceil(selectedVisibleCards.length / 6));
    const selectedAreaTop = 285;
    const selectedAreaBottom = 655;
    const maxCellHeight = Math.floor((selectedAreaBottom - selectedAreaTop) / selectedRows);
    const selectedCardHeight = Math.max(50, Math.min(76, maxCellHeight - 22));
    const selectedCardWidth = Math.round(selectedCardHeight * 0.74);
    const selectedRowGap = selectedCardHeight + 20;
    const selectedStartY = selectedAreaTop + selectedCardHeight / 2;
    selectedVisibleCards.forEach((card, index) => {
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
        const next = (this.counts.get(key) || 0) - 1;
        if (next <= 0) this.counts.delete(key);
        else this.counts.set(key, next);
        this.render();
      });
    });
  }

  async save(values) {
    if (this.saving) return;
    this.saving = true;
    try {
      const cards = [...this.counts.entries()].flatMap(([key, count]) => {
        const [cardType, rawId] = key.split(':');
        return count > 0 ? [{ cardType, cardId: Number(rawId), count }] : [];
      });
      const payload = { name: values.name, heroId: values.heroId, cards };
      if (this.deckId) await api.put(`/api/decks/${this.deckId}`, payload);
      else {
        const { data } = await api.post('/api/decks', payload);
        this.deckId = data.id;
        window.history.pushState({}, '', `/decks/${data.id}`);
      }
      this.deckName = values.name;
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
