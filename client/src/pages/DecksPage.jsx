import api from '../api/client';
import { GAME_WIDTH, GAME_HEIGHT, palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { CardGameObject } from '../components/CardDisplay';
import { asArray, deckHeroId, errorMessage } from '../components/ErrorDetail';

export class DecksScene extends ListScene {
  constructor() {
    super('DecksScene', 'Колоды', async () => [], () => '');
  }

  create() {
    this.events.once('shutdown', () => this.teardownScroll());
    this._scrollY = 0;
    this.drawBackground('Колоды');
    this.addBackButton();
    this.addMessage('Загрузка колод...', palette.text, 120);
    Promise.all([
      api.get('/api/decks').then(({ data }) => data || []),
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/heroes').then(({ data }) => asArray(data)),
    ]).then(([decks, cards, heroes]) => Promise.all([
      this.loadCardTextures(cards),
      this.loadImageUrls(heroes.map((h) => h.portraitUrl)),
    ]).then(() => this.renderDecks(decks, cards, heroes)))
      .catch((err) => this.renderDecks([], [], [], errorMessage(err, 'Ошибка загрузки')));
  }

  renderDecks(decks, cards, heroes = [], error = '') {
    this.teardownScroll();
    this.clearScene();
    this.cameras?.main?.setScroll(0, 0);

    const layout = layoutInfo();
    const pageH = Math.max(GAME_HEIGHT * 2, 1200 + (decks.length || 1) * 180);
    this.add.rectangle(0, 0, GAME_WIDTH, pageH, palette.bg).setOrigin(0).setDepth(0);
    this.drawStickyHeader('Колоды');
    const back = this.addBackButton();
    this.pin(back);

    const newBtn = this.addButton(
      layout.portrait ? layout.centerX : GAME_WIDTH - 120,
      layout.portrait ? GAME_HEIGHT - 90 : GAME_HEIGHT - 44,
      layout.portrait ? 280 : 190,
      40,
      'Новая колода',
      () => {
        window.history.pushState({}, '', '/decks/new');
        this.scene.start('DeckEditorScene');
      },
      { fontSize: 16, fill: palette.primaryDark },
    );
    this.pin(newBtn);

    if (error) {
      this.add.text(GAME_WIDTH / 2, 120, error, {
        fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: '#ffb3b3', align: 'center', wordWrap: { width: 900 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);
    }
    if (!decks.length && !error) {
      this.addMessage('Колод пока нет — создайте новую', palette.muted, GAME_HEIGHT / 2);
      this.setupScroll(GAME_HEIGHT);
      return;
    }

    const startY = layout.portrait ? 190 : 170;
    const rowGap = layout.portrait ? 158 : 178;
    let contentBottom = startY;

    decks.forEach((deck, index) => {
      const hero = heroes.find((h) => h.id === deckHeroId(deck));
      const x = layout.portrait ? layout.centerX : 260 + (index % 2) * 510;
      const y = layout.portrait
        ? startY + index * rowGap
        : startY + Math.floor(index / 2) * rowGap;
      contentBottom = Math.max(contentBottom, y + 90);
      const panelWidth = layout.portrait ? 620 : 460;
      const panel = this.add.rectangle(x, y, panelWidth, 146, palette.panel, 0.92)
        .setStrokeStyle(2, 0x53627a)
        .setInteractive({ useHandCursor: true });
      panel.on('pointerup', () => {
        if (this.wasDragging()) return;
        window.history.pushState({}, '', `/decks/${deck.id}`);
        this.scene.start('DeckEditorScene', { deckId: deck.id });
      });
      this.add.text(x - panelWidth / 2 + 20, y - 52, deck.name, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '22px',
        color: palette.text,
      });
      this.addAvatar(x - panelWidth / 2 + 35, y - 16, hero?.portraitUrl, hero?.name || deckHeroId(deck), 28);
      this.add.text(x - panelWidth / 2 + 56, y - 26, `${hero?.name || deckHeroId(deck)}  |  Карт: ${(deck.cards || []).reduce((sum, c) => sum + (c.count || 0), 0)}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '15px',
        color: palette.muted,
      });
      (deck.cards || []).slice(0, layout.portrait ? 5 : 4).forEach((slot, cardIndex) => {
        const card = cards.find((c) => c.cardType === slot.cardType && c.id === slot.cardId);
        if (!card) return;
        const view = new CardGameObject(this, x - (layout.portrait ? 190 : 116) + cardIndex * 72, y + 24, card, { width: 58, height: 80 });
        view.setScale(0.9);
        view.setInputEnabled(false);
      });
    });

    this.setupScroll(contentBottom + 100);
  }
}

export default DecksScene;
