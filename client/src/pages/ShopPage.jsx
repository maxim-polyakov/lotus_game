import api from '../api/client';
import { palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { CardGameObject, cardKey } from '../components/CardDisplay';
import { asArray } from '../components/ErrorDetail';

export class ShopScene extends ListScene {
  constructor() {
    super('ShopScene', 'Магазин', async () => [], () => '');
  }

  create() {
    this.drawBackground('Магазин');
    this.addBackButton();
    this.addMessage('Загрузка магазина...', palette.text, 120);
    Promise.all([
      api.get('/api/shop/status').then(({ data }) => data),
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/cards/collection').then(({ data }) => asArray(data)),
    ]).then(([status, cards, collection]) => this.loadCardTextures(cards).then(() => this.renderShop(status, cards, collection)))
      .catch((err) => this.renderShop(null, [], [], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  renderShop(status, cards, collection, error = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Магазин');
    this.addBackButton();
    if (error) this.addMessage(error, '#ffb3b3', 120);
    this.addPanel(layout.portrait ? layout.centerX : 255, layout.portrait ? 175 : 170, layout.portrait ? 560 : 340, 135);
    this.add.text(layout.portrait ? 130 : 110, 130, `Золото: ${status?.gold ?? 0}`, { fontFamily: 'Segoe UI, Arial', fontSize: '24px', color: '#ffe18c' });
    this.add.text(layout.portrait ? 130 : 110, 166, `Пыль: ${status?.dust ?? 0}`, { fontFamily: 'Segoe UI, Arial', fontSize: '22px', color: '#b9d6ff' });
    this.addButton(layout.portrait ? 500 : 760, layout.portrait ? 145 : 145, layout.portrait ? 260 : 260, 48, `Купить карту (${status?.randomCardPrice ?? 100})`, async () => {
      const { data } = await api.post('/api/shop/buy/random-card');
      this.renderShop({ ...status, gold: data.gold }, cards, collection);
    }, { fill: palette.primaryDark });
    this.addButton(layout.portrait ? 500 : 760, layout.portrait ? 210 : 210, layout.portrait ? 260 : 260, 48, `Купить героя (${status?.randomHeroPrice ?? 300})`, async () => {
      const { data } = await api.post('/api/shop/buy/random-hero');
      this.renderShop({ ...status, gold: data.gold }, cards, collection);
    }, { fill: palette.primaryDark });

    const owned = new Set((collection || []).map((c) => cardKey(c)));
    const columns = layout.portrait ? 3 : 8;
    cards.slice(0, layout.portrait ? 12 : 8).forEach((card, index) => {
      const x = (layout.portrait ? 160 : 185) + (index % columns) * (layout.portrait ? 200 : 125);
      const y = (layout.portrait ? 370 : 430) + Math.floor(index / columns) * 210;
      const view = new CardGameObject(this, x, y, card, { width: 100, height: 140 });
      const isOwned = owned.has(cardKey(card));
      if (!isOwned) view.setAlpha(0.55);
      this.add.text(x, y + 92, isOwned ? 'Есть' : `${status?.specificCardDustPrice ?? 120} пыли`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '14px',
        color: isOwned ? '#9cffb5' : '#ffd38a',
      }).setOrigin(0.5);
      view.on('pointerdown', async () => {
        view.playCardEffect();
        if (isOwned) return;
        try {
          const { data } = await api.post('/api/shop/buy/card', { cardType: card.cardType, cardId: card.id });
          this.renderShop({ ...status, dust: data.dust }, cards, [...collection, data.card || card], 'Карта куплена');
        } catch (err) {
          this.renderShop(status, cards, collection, err.response?.data?.message || err.message || 'Не удалось купить карту');
        }
      });
    });
  }
}

export default ShopScene;
