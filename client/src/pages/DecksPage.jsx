import api from '../api/client';
import { palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { CardGameObject } from '../components/CardDisplay';
import { asArray, deckHeroId } from '../components/ErrorDetail';

export class DecksScene extends ListScene {
  constructor() {
    super('DecksScene', 'Колоды', async () => [], () => '');
  }

  create() {
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
      .catch((err) => this.renderDecks([], [], [], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderDecks(decks, cards, heroes = [], error = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Колоды');
    this.addBackButton();
    this.addButton(layout.portrait ? layout.centerX : 1120, layout.portrait ? 1188 : 675, layout.portrait ? 280 : 190, 40, 'Новая колода', () => {
      window.history.pushState({}, '', '/decks/new');
      this.scene.start('DeckEditorScene');
    }, { fontSize: 16, fill: palette.primaryDark });
    if (error) this.addMessage(error, '#ffb3b3', 120);
    decks.slice(0, layout.portrait ? 6 : 6).forEach((deck, index) => {
      const hero = heroes.find((h) => h.id === deckHeroId(deck));
      const x = layout.portrait ? layout.centerX : 260 + (index % 2) * 510;
      const y = layout.portrait ? 190 + index * 158 : 170 + Math.floor(index / 2) * 178;
      const panelWidth = layout.portrait ? 620 : 460;
      this.add.rectangle(x, y, panelWidth, 146, palette.panel, 0.92)
        .setStrokeStyle(2, 0x53627a)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
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
      });
    });
  }
}

export default DecksScene;
