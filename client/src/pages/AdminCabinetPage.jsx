import api from '../api/client';
import { palette, layoutInfo } from '../game/shared';
import { ListScene } from '../components/TutorialModal';
import { CardGameObject } from '../components/CardDisplay';
import { escapeAttr } from '../components/ErrorDetail';
import './AdminCabinetPage.css';

export class AdminScene extends ListScene {
  constructor() {
    super('AdminScene', 'Админка', async () => [], () => '');
  }

  create() {
    this.selected = null;
    this.selectedHero = null;
    this.formMode = 'edit';
    this.panelCollapsed = false;
    this.loadAdmin();
  }

  loadAdmin(message = '') {
    this.clearScene();
    this.drawBackground('Админка');
    this.addBackButton();
    this.addMessage('Загрузка админки...', palette.text, 120);
    Promise.all([
      api.get('/api/cards').then(({ data }) => data || []),
      api.get('/api/heroes').then(({ data }) => data || []),
    ]).then(([cards, heroes]) => this.loadCardTextures(cards).then(() => {
      this.cards = cards;
      this.heroes = heroes;
      if (this.selected) {
        this.selected = cards.find((card) => card.id === this.selected.id && card.cardType === this.selected.cardType) || null;
      }
      if (this.selectedHero) {
        this.selectedHero = heroes.find((h) => h.id === this.selectedHero.id) || null;
      }
      this.renderAdmin(message);
    })).catch((err) => this.renderAdmin(err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  setPanelCollapsed(collapsed) {
    this.panelCollapsed = Boolean(collapsed);
    this.renderAdmin();
  }

  renderAdmin(message = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground('Админка');
    this.addBackButton();
    if (message) this.addMessage(message, message.includes('Ошибка') || message.includes('Не') ? '#ffb3b3' : palette.text, layout.portrait ? 1225 : 670);

    this.add.text(80, 95, this.formMode === 'heroes' || this.formMode === 'create-hero'
      ? 'Герои: клик для редактирования'
      : 'Карты: клик для редактирования', { fontFamily: 'Segoe UI, Arial', fontSize: '18px', color: palette.muted });

    const actionY = layout.portrait ? 145 : 130;
    this.addButton(layout.portrait ? 160 : 150, actionY, 150, 34, 'Новая карта', () => {
      this.formMode = 'create-card';
      this.selectedHero = null;
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 360 : 320, actionY, 150, 34, 'Новый герой', () => {
      this.formMode = 'create-hero';
      this.selected = null;
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 560 : 490, actionY, 130, 34, 'Карты', () => {
      this.formMode = 'edit';
      this.selectedHero = null;
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 160 : 640, layout.portrait ? actionY + 42 : actionY, 130, 34, 'Герои', () => {
      this.formMode = 'heroes';
      this.selected = null;
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 320 : 790, layout.portrait ? actionY + 42 : actionY, 150, 34, 'Пользователи', () => {
      this.formMode = 'users';
      this.selected = null;
      this.selectedHero = null;
      this.panelCollapsed = false;
      this.renderAdmin();
    }, { fontSize: 15 });
    this.addButton(layout.portrait ? 520 : 960, layout.portrait ? actionY + 42 : actionY, 150, 34, 'Настройки', () => {
      this.formMode = 'settings';
      this.selected = null;
      this.selectedHero = null;
      this.panelCollapsed = false;
      this.loadSettings().then(() => this.renderAdmin());
    }, { fontSize: 15 });

    if (this.formMode === 'heroes' || this.formMode === 'create-hero') {
      this.renderHeroGrid(layout);
    } else if (this.formMode !== 'users' && this.formMode !== 'settings') {
      this.renderCardGrid(layout);
    }
    if (this.panelCollapsed) {
      const expandLabel = this.selectedHero
        ? `Развернуть: ${String(this.selectedHero.name || 'герой').slice(0, 18)}`
        : this.selected
          ? `Развернуть: ${String(this.selected.name || 'карта').slice(0, 18)}`
          : this.formMode === 'create-card'
            ? 'Развернуть: новая карта'
            : this.formMode === 'create-hero'
              ? 'Развернуть: новый герой'
              : this.formMode === 'heroes'
                ? 'Развернуть: герои'
                : this.formMode === 'users'
                  ? 'Развернуть: пользователи'
                  : this.formMode === 'settings'
                    ? 'Развернуть: настройки'
                    : 'Развернуть панель';
      this.addButton(
        layout.centerX,
        layout.portrait ? 1185 : 680,
        layout.portrait ? 360 : 280,
        42,
        expandLabel,
        () => this.setPanelCollapsed(false),
        { fontSize: 16 },
      );
      return;
    }

    if (this.formMode === 'settings') {
      this.renderSettingsPanel(layout);
      return;
    }

    const panelX = layout.portrait ? layout.centerX : 1000;
    const panelW = layout.portrait ? 620 : 420;
    const panelH = layout.portrait ? 640 : 560;
    const panelY = layout.portrait ? 880 : 390;
    this._adminPanel = { x: panelX, y: panelY, w: panelW, h: panelH };
    this.addPanel(panelX, panelY, panelW, panelH);

    const modeLabel = this.formMode === 'create-card'
      ? 'Режим: создание карты'
      : this.formMode === 'create-hero'
        ? 'Режим: создание героя'
        : this.formMode === 'heroes'
          ? 'Режим: редактирование героя'
          : this.formMode === 'users'
            ? 'Режим: пользователи'
            : 'Режим: редактирование карты';
    this.add.text(panelX, panelY - panelH / 2 - 14, modeLabel, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '15px',
      color: palette.muted,
    }).setOrigin(0.5);

    const collapseY = layout.portrait
      ? panelY - panelH / 2 + 28
      : panelY - panelH / 2 + 24;
    this.addButton(panelX, collapseY, 160, 32, 'Свернуть', () => this.setPanelCollapsed(true), { fontSize: 14 });

    if (this.formMode === 'create-card') {
      this.renderCreateCardForm(panelX, panelY + (layout.portrait ? 18 : 12));
    } else if (this.formMode === 'create-hero') {
      this.renderCreateHeroForm(panelX, panelY + (layout.portrait ? 18 : 12));
    } else if (this.formMode === 'users') {
      this.renderUsersForm(panelX, panelY + (layout.portrait ? 18 : 12));
    } else if (this.formMode === 'heroes') {
      if (this.selectedHero) {
        this.renderSelectedHeroForm(this.selectedHero, panelX, panelY + (layout.portrait ? 18 : 12));
      } else {
        this.add.text(panelX, panelY, 'Выберите героя слева', {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '20px',
          color: palette.text,
        }).setOrigin(0.5);
      }
    } else if (this.selected) {
      this.renderSelectedCardForm(this.selected, panelX, panelY + (layout.portrait ? 18 : 12));
    } else {
      this.add.text(panelX, panelY, 'Выберите карту слева', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '20px',
        color: palette.text,
      }).setOrigin(0.5);
    }
  }

  async loadSettings() {
    const defaults = {
      weightGold: 40,
      weightDust: 30,
      weightCard: 20,
      weightHero: 10,
      goldMin: 10,
      goldMax: 50,
      dustMin: 5,
      dustMax: 25,
    };
    try {
      const [sounds, drop, pool, shop] = await Promise.all([
        api.get('/api/settings/game-sounds').then(({ data }) => data || {}).catch(() => ({})),
        api.get('/api/admin/settings/post-match-drop').then(({ data }) => data || defaults).catch(() => defaults),
        api.get('/api/admin/settings/post-match-drop/cards').then(({ data }) => data?.enabledCardKeys || []).catch(() => []),
        api.get('/api/admin/settings/shop').then(({ data }) => data || { randomCardPrice: 100, specificCardDustPrice: 50 }).catch(() => ({ randomCardPrice: 100, specificCardDustPrice: 50 })),
      ]);
      this.gameSounds = sounds;
      this.postMatchDrop = { ...defaults, ...drop };
      this.dropCardPoolKeys = Array.isArray(pool) ? pool : [];
      this.shopSettings = shop;
    } catch {
      this.gameSounds = this.gameSounds || {};
      this.postMatchDrop = this.postMatchDrop || defaults;
      this.dropCardPoolKeys = this.dropCardPoolKeys || [];
      this.shopSettings = this.shopSettings || { randomCardPrice: 100, specificCardDustPrice: 50 };
    }
  }

  renderSettingsPanel(layout) {
    const drop = this.postMatchDrop || {};
    const shop = this.shopSettings || {};
    const sounds = this.gameSounds || {};
    const poolKeys = new Set(this.dropCardPoolKeys || []);
    const cards = this.cards || [];
    const cardChecks = cards.map((c) => {
      const key = `${c.cardType}:${c.id}`;
      const checked = poolKeys.has(key) ? 'checked' : '';
      return `<label class="admin-pool-item"><input type="checkbox" name="pool" value="${escapeAttr(key)}" ${checked} /> ${escapeAttr(c.name || key)}</label>`;
    }).join('');

    const soundRow = (label, key, endpoint) => {
      const url = sounds[key];
      return `
        <div class="admin-sound-row" data-sound-key="${key}" data-sound-endpoint="${endpoint}">
          <strong>${label}</strong>
          ${url ? `<audio controls src="${escapeAttr(url)}" style="width:100%;max-width:220px"></audio>
            <button type="button" data-delete-sound>Удалить</button>` : '<em>Стандартный звук</em>'}
          <label class="admin-upload-field">
            <span class="admin-file-picker">
              <input name="sound_${key}" type="file" accept="audio/*"
                style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0;" />
              <span class="admin-file-btn">Выбрать</span>
              <span class="admin-file-name" data-file-name>Файл не выбран</span>
            </span>
          </label>
          <button type="button" data-upload-sound>Загрузить</button>
        </div>`;
    };

    const panelX = layout.centerX;
    const panelY = layout.portrait ? 720 : 420;
    const panelW = layout.portrait ? 660 : 980;
    const panelH = layout.portrait ? 900 : 560;
    this.addPanel(panelX, panelY, panelW, panelH, 0.94);
    this.add.text(panelX, panelY - panelH / 2 - 16, 'Настройки игры', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '16px',
      color: palette.muted,
    }).setOrigin(0.5);

    const dom = this.addDomForm(panelX, panelY, `
      <form class="phaser-form admin-phaser-form admin-settings-form" style="max-height:${panelH - 40}px;width:${Math.min(panelW - 40, layout.portrait ? 600 : 900)}px">
        <strong>Звуки конца матча</strong>
        ${soundRow('Победа', 'victorySoundUrl', '/api/admin/settings/victory-sound')}
        ${soundRow('Поражение', 'defeatSoundUrl', '/api/admin/settings/defeat-sound')}
        ${soundRow('Ничья', 'drawSoundUrl', '/api/admin/settings/draw-sound')}

        <strong>Награда после матча (веса и диапазоны)</strong>
        <div class="admin-settings-grid">
          <label>Вес золото <input name="weightGold" type="number" min="0" value="${drop.weightGold ?? 0}" /></label>
          <label>Вес пыль <input name="weightDust" type="number" min="0" value="${drop.weightDust ?? 0}" /></label>
          <label>Вес карта <input name="weightCard" type="number" min="0" value="${drop.weightCard ?? 0}" /></label>
          <label>Вес герой <input name="weightHero" type="number" min="0" value="${drop.weightHero ?? 0}" /></label>
          <label>Золото мин <input name="goldMin" type="number" min="0" value="${drop.goldMin ?? 0}" /></label>
          <label>Золото макс <input name="goldMax" type="number" min="0" value="${drop.goldMax ?? 0}" /></label>
          <label>Пыль мин <input name="dustMin" type="number" min="0" value="${drop.dustMin ?? 0}" /></label>
          <label>Пыль макс <input name="dustMax" type="number" min="0" value="${drop.dustMax ?? 0}" /></label>
        </div>
        <button type="button" data-save-drop>Сохранить дроп</button>

        <strong>Цены магазина</strong>
        <div class="admin-settings-grid">
          <label>Случайная карта (золото) <input name="randomCardPrice" type="number" min="1" value="${shop.randomCardPrice ?? 100}" /></label>
          <label>Конкретная карта (пыль) <input name="specificCardDustPrice" type="number" min="1" value="${shop.specificCardDustPrice ?? 50}" /></label>
        </div>
        <button type="button" data-save-shop>Сохранить цены</button>

        <strong>Пул карт для дропа</strong>
        <p class="admin-hint">Пустой выбор = весь пул. Сейчас отмечено: ${(this.dropCardPoolKeys || []).length || 'все'}</p>
        <div class="admin-pool-actions">
          <button type="button" data-pool-all>Выбрать все</button>
          <button type="button" data-pool-none>Сбросить (весь пул)</button>
        </div>
        <div class="admin-pool-list">${cardChecks || '<em>Нет карт</em>'}</div>
        <button type="button" data-save-pool>Сохранить пул карт</button>
      </form>
    `, () => {});

    const form = dom?.node?.querySelector('form');
    if (!form) return;

    form.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        const nameNode = input.parentElement?.querySelector('[data-file-name]');
        if (nameNode) nameNode.textContent = input.files?.[0]?.name || 'Файл не выбран';
      });
    });

    form.querySelectorAll('[data-sound-key]').forEach((row) => {
      const key = row.getAttribute('data-sound-key');
      const endpoint = row.getAttribute('data-sound-endpoint');
      row.querySelector('[data-upload-sound]')?.addEventListener('click', async () => {
        const file = form.elements[`sound_${key}`]?.files?.[0];
        if (!file) {
          this.renderAdmin('Выберите аудиофайл');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          this.renderAdmin('Звук не более 5 МБ');
          return;
        }
        try {
          const fd = new FormData();
          fd.append('sound', file);
          const { data } = await api.post(endpoint, fd);
          this.gameSounds = { ...(this.gameSounds || {}), [key]: data[key] };
          this.renderAdmin('Звук загружен');
        } catch (err) {
          this.renderAdmin(err.response?.data?.message || err.message || 'Ошибка загрузки звука');
        }
      });
      row.querySelector('[data-delete-sound]')?.addEventListener('click', async () => {
        try {
          await api.delete(endpoint);
          this.gameSounds = { ...(this.gameSounds || {}), [key]: null };
          this.renderAdmin('Звук удалён');
        } catch (err) {
          this.renderAdmin(err.response?.data?.message || err.message || 'Ошибка удаления звука');
        }
      });
    });

    form.querySelector('[data-save-drop]')?.addEventListener('click', async () => {
      try {
        const payload = {
          weightGold: Number(form.weightGold.value) || 0,
          weightDust: Number(form.weightDust.value) || 0,
          weightCard: Number(form.weightCard.value) || 0,
          weightHero: Number(form.weightHero.value) || 0,
          goldMin: Number(form.goldMin.value) || 0,
          goldMax: Number(form.goldMax.value) || 0,
          dustMin: Number(form.dustMin.value) || 0,
          dustMax: Number(form.dustMax.value) || 0,
        };
        const { data } = await api.put('/api/admin/settings/post-match-drop', payload);
        this.postMatchDrop = data;
        this.renderAdmin('Настройки дропа сохранены');
      } catch (err) {
        this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось сохранить дроп');
      }
    });

    form.querySelector('[data-save-shop]')?.addEventListener('click', async () => {
      try {
        const payload = {
          randomCardPrice: Number(form.randomCardPrice.value) || 1,
          specificCardDustPrice: Number(form.specificCardDustPrice.value) || 1,
        };
        const { data } = await api.put('/api/admin/settings/shop', payload);
        this.shopSettings = data;
        this.renderAdmin('Цены магазина сохранены');
      } catch (err) {
        this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось сохранить цены');
      }
    });

    form.querySelector('[data-pool-all]')?.addEventListener('click', () => {
      form.querySelectorAll('input[name="pool"]').forEach((cb) => { cb.checked = true; });
    });
    form.querySelector('[data-pool-none]')?.addEventListener('click', () => {
      form.querySelectorAll('input[name="pool"]').forEach((cb) => { cb.checked = false; });
    });
    form.querySelector('[data-save-pool]')?.addEventListener('click', async () => {
      try {
        const enabledCardKeys = [...form.querySelectorAll('input[name="pool"]:checked')].map((cb) => cb.value);
        const { data } = await api.put('/api/admin/settings/post-match-drop/cards', { enabledCardKeys });
        this.dropCardPoolKeys = Array.isArray(data?.enabledCardKeys) ? data.enabledCardKeys : enabledCardKeys;
        this.renderAdmin('Пул карт сохранён');
      } catch (err) {
        this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось сохранить пул');
      }
    });
  }

  renderCardGrid(layout) {
    const columns = layout.portrait ? 4 : 6;
    const cardLimit = layout.portrait ? 12 : 18;
    const startX = layout.portrait ? 105 : 88;
    const startY = layout.portrait ? 280 : 210;
    const gapX = layout.portrait ? 168 : 100;
    const gapY = layout.portrait ? 120 : 125;
    (this.cards || []).slice(0, cardLimit).forEach((card, index) => {
      const x = startX + (index % columns) * gapX;
      const y = startY + Math.floor(index / columns) * gapY;
      const view = new CardGameObject(this, x, y, card, {
        width: 70,
        height: 98,
        selected: this.selected && this.selected.id === card.id && this.selected.cardType === card.cardType,
      });
      view.on('pointerdown', () => {
        this.selected = card;
        this.selectedHero = null;
        this.formMode = 'edit';
        this.panelCollapsed = false;
        this.renderAdmin();
      });
    });
  }

  renderHeroGrid(layout) {
    const columns = layout.portrait ? 2 : 3;
    const startX = layout.portrait ? 190 : 180;
    const startY = layout.portrait ? 280 : 230;
    const gapX = layout.portrait ? 300 : 250;
    const gapY = layout.portrait ? 150 : 140;
    (this.heroes || []).forEach((hero, index) => {
      const x = startX + (index % columns) * gapX;
      const y = startY + Math.floor(index / columns) * gapY;
      const selected = this.selectedHero?.id === hero.id;
      const panel = this.add.rectangle(x, y, layout.portrait ? 260 : 220, 120, selected ? 0x513a22 : palette.panel2, 0.95)
        .setStrokeStyle(2, selected ? palette.primary : 0x53627a)
        .setInteractive({ useHandCursor: true });
      this.add.circle(x, y - 28, 28, palette.primaryDark);
      this.add.text(x, y - 28, (hero.name || '?').slice(0, 1).toUpperCase(), {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(x, y + 12, hero.name || hero.id, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '16px',
        color: palette.text,
        align: 'center',
        wordWrap: { width: 200 },
      }).setOrigin(0.5);
      this.add.text(x, y + 40, `HP ${hero.startingHealth ?? '-'}`, {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '13px',
        color: palette.muted,
      }).setOrigin(0.5);
      panel.on('pointerdown', () => {
        this.selectedHero = hero;
        this.selected = null;
        this.formMode = 'heroes';
        this.panelCollapsed = false;
        this.renderAdmin();
      });
    });
  }

  renderSelectedCardForm(card, panelX, panelY) {
    const isMinion = card.cardType === 'MINION';
    const layout = layoutInfo();
    const assets = this.assetStatus(card);
    const panelH = this._adminPanel?.h || (layout.portrait ? 640 : 560);
    const formMaxH = Math.max(240, panelH - 70);

    const editDom = this.addDomForm(panelX, panelY, `
      <form class="phaser-form admin-phaser-form" style="max-height:${formMaxH}px">
        <div class="admin-form-head">
          <strong>${escapeAttr(card.cardType)} #${card.id}</strong>
          <button type="button" data-collapse-panel class="admin-collapse-btn">Свернуть</button>
        </div>
        <input name="name" placeholder="Название" value="${escapeAttr(card.name)}" required />
        <input name="manaCost" type="number" placeholder="Мана" value="${escapeAttr(card.manaCost)}" />
        ${isMinion ? `
          <input name="attack" type="number" placeholder="Атака" value="${escapeAttr(card.attack)}" />
          <input name="health" type="number" placeholder="Здоровье" value="${escapeAttr(card.health)}" />
        ` : `
          <input name="damage" type="number" placeholder="Урон" value="${escapeAttr(card.damage)}" />
        `}
        <input name="description" placeholder="Описание" value="${escapeAttr(card.description)}" />
        ${isMinion ? this.minionEffectsFieldsHtml(card) : ''}
        <button type="submit">Сохранить карту</button>

        <div class="admin-upload-block">
          <strong class="admin-upload-title">Загрузка файлов</strong>
          ${this.uploadFieldHtml('image', 'Картинка на карте', 'image/png,image/jpeg,image/webp,image/gif', assets.image)}
          ${this.uploadFieldHtml('sound', 'Звук розыгрыша', 'audio/*', assets.sound)}
          ${isMinion ? this.uploadFieldHtml('attackSound', 'Звук атаки', 'audio/*', assets.attackSound) : ''}
          ${this.uploadFieldHtml('effect', 'GIF розыгрыша', 'image/gif,video/webm,video/mp4,image/png,image/webp', assets.playGif)}
          ${isMinion ? this.uploadFieldHtml('attackEffect', 'GIF атаки', 'image/gif,video/webm,video/mp4,image/png,image/webp', assets.attackGif) : ''}
          <button type="button" data-upload-assets>Загрузить выбранные файлы</button>
        </div>
      </form>
    `, (values) => this.saveCard(card, values));

    const form = editDom.node?.querySelector('form');
    form?.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        const nameNode = input.parentElement?.querySelector('[data-file-name]');
        if (nameNode) nameNode.textContent = input.files?.[0]?.name || 'Файл не выбран';
      });
    });
    form?.querySelector('[data-upload-assets]')?.addEventListener('click', () => this.uploadCardAssets(card, form));
    form?.querySelector('[data-collapse-panel]')?.addEventListener('click', () => this.setPanelCollapsed(true));

    const deleteY = layout.portrait
      ? panelY + panelH / 2 + 10
      : Math.min(690, panelY + panelH / 2 + 10);
    this.addButton(panelX, deleteY, 190, 34, 'Удалить карту', () => this.deleteCard(card), {
      fill: 0x52303a,
      stroke: palette.danger,
      fontSize: 15,
    });
  }

  keywordCheckbox(name, label, checked) {
    return `<label class="admin-check"><input type="checkbox" name="${name}" value="true" ${checked ? 'checked' : ''}/> ${label}</label>`;
  }

  selectOption(value, label, current) {
    const selected = String(current || '') === String(value) ? 'selected' : '';
    return `<option value="${escapeAttr(value)}" ${selected}>${escapeAttr(label)}</option>`;
  }

  minionSummonOptions(selectedId) {
    const minions = (this.cards || []).filter((c) => c.cardType === 'MINION');
    const options = [this.selectOption('0', '— нет —', selectedId || 0)];
    minions.forEach((m) => {
      options.push(this.selectOption(String(m.id), `${m.name} (#${m.id})`, selectedId));
    });
    return options.join('');
  }

  minionEffectsFieldsHtml(card = {}) {
    return `
      <div class="admin-effects">
        <strong class="admin-upload-title">Ключевые слова</strong>
        <div class="admin-check-grid">
          ${this.keywordCheckbox('taunt', 'Провокация', card.taunt)}
          ${this.keywordCheckbox('charge', 'Рывок', card.charge)}
          ${this.keywordCheckbox('divineShield', 'Бож. щит', card.divineShield)}
          ${this.keywordCheckbox('windfury', 'Ветроярость', card.windfury)}
          ${this.keywordCheckbox('stealth', 'Стелс', card.stealth)}
          ${this.keywordCheckbox('poisonous', 'Яд', card.poisonous)}
          ${this.keywordCheckbox('lifesteal', 'Вампиризм', card.lifesteal)}
          ${this.keywordCheckbox('rush', 'Натиск', card.rush)}
        </div>
        <strong class="admin-upload-title">Боевой клич</strong>
        <select name="battlecryType">
          ${this.selectOption('', 'Нет', card.battlecryType)}
          ${this.selectOption('DEAL_DAMAGE', 'Урон', card.battlecryType)}
          ${this.selectOption('HEAL', 'Лечение', card.battlecryType)}
          ${this.selectOption('BUFF_ALLY', 'Баф союзника', card.battlecryType)}
          ${this.selectOption('SUMMON', 'Призыв', card.battlecryType)}
        </select>
        <input name="battlecryValue" type="number" placeholder="Значение клича" value="${escapeAttr(card.battlecryValue ?? '')}" />
        <select name="battlecryTarget">
          ${this.selectOption('', 'Цель: авто', card.battlecryTarget)}
          ${this.selectOption('ANY', 'Любая', card.battlecryTarget)}
          ${this.selectOption('ENEMY', 'Враг', card.battlecryTarget)}
          ${this.selectOption('FRIENDLY', 'Союзник', card.battlecryTarget)}
        </select>
        <select name="battlecrySummonCardId">
          ${this.minionSummonOptions(card.battlecrySummonCardId)}
        </select>
        <strong class="admin-upload-title">Предсмертный хрип</strong>
        <select name="deathrattleType">
          ${this.selectOption('', 'Нет', card.deathrattleType)}
          ${this.selectOption('DEAL_DAMAGE', 'Урон', card.deathrattleType)}
          ${this.selectOption('SUMMON', 'Призыв', card.deathrattleType)}
        </select>
        <input name="deathrattleValue" type="number" placeholder="Значение хрипа" value="${escapeAttr(card.deathrattleValue ?? '')}" />
        <select name="deathrattleSummonCardId">
          ${this.minionSummonOptions(card.deathrattleSummonCardId)}
        </select>
      </div>
    `;
  }

  flagValue(values, key) {
    const v = values?.[key];
    return v === true || v === 'true' || v === 'on' || v === '1';
  }

  minionEffectsPayload(values) {
    const battlecryType = String(values.battlecryType || '').trim();
    const deathrattleType = String(values.deathrattleType || '').trim();
    return {
      taunt: this.flagValue(values, 'taunt'),
      charge: this.flagValue(values, 'charge'),
      divineShield: this.flagValue(values, 'divineShield'),
      windfury: this.flagValue(values, 'windfury'),
      stealth: this.flagValue(values, 'stealth'),
      poisonous: this.flagValue(values, 'poisonous'),
      lifesteal: this.flagValue(values, 'lifesteal'),
      rush: this.flagValue(values, 'rush'),
      battlecryType: battlecryType || '',
      battlecryValue: values.battlecryValue === '' || values.battlecryValue == null
        ? 0
        : Number(values.battlecryValue) || 0,
      battlecryTarget: String(values.battlecryTarget || '').trim(),
      battlecrySummonCardId: Number(values.battlecrySummonCardId) || 0,
      deathrattleType: deathrattleType || '',
      deathrattleValue: values.deathrattleValue === '' || values.deathrattleValue == null
        ? 0
        : Number(values.deathrattleValue) || 0,
      deathrattleSummonCardId: Number(values.deathrattleSummonCardId) || 0,
    };
  }

  uploadFieldHtml(name, label, accept, exists) {
    return `
      <label class="admin-upload-field">
        <span class="admin-upload-label">${label} <em class="${exists ? 'on' : 'off'}">${exists ? 'уже есть' : 'нет'}</em></span>
        <span class="admin-file-picker">
          <input name="${name}" type="file" accept="${accept}"
            style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0;" />
          <span class="admin-file-btn" aria-hidden="true">Выбрать файл</span>
          <span class="admin-file-name" data-file-name>Файл не выбран</span>
        </span>
      </label>
    `;
  }

  assetStatus(card) {
    return {
      image: Boolean(card?.imageUrl),
      sound: Boolean(card?.soundUrl),
      attackSound: Boolean(card?.attackSoundUrl),
      playGif: Boolean(card?.playEffectUrl),
      attackGif: Boolean(card?.attackEffectUrl),
      gif: Boolean(card?.playEffectUrl || card?.attackEffectUrl),
    };
  }

  renderCreateCardForm(panelX, panelY) {
    this.addDomForm(panelX, panelY, `
      <form class="phaser-form admin-create-form admin-phaser-form" style="max-height:520px">
        <strong>Создать карту</strong>
        <select name="cardType"><option value="MINION">Миньон</option><option value="SPELL">Заклинание</option></select>
        <input name="name" placeholder="Название" required />
        <input name="manaCost" type="number" placeholder="Мана" value="1" />
        <input name="attack" type="number" placeholder="Атака миньона" value="1" />
        <input name="health" type="number" placeholder="HP миньона" value="1" />
        <input name="damage" type="number" placeholder="Урон заклинания" value="1" />
        <input name="description" placeholder="Описание" />
        ${this.minionEffectsFieldsHtml({})}
        <button type="submit">Создать</button>
      </form>
    `, (values) => this.createCard(values));
  }

  renderCreateHeroForm(panelX, panelY) {
    this.addDomForm(panelX, panelY, `
      <form class="phaser-form admin-create-form">
        <strong>Создать героя</strong>
        <input name="name" placeholder="Имя" required />
        <input name="title" placeholder="Титул" />
        <input name="startingHealth" type="number" placeholder="HP" value="30" />
        <button type="submit">Создать героя</button>
      </form>
    `, (values) => this.createHero(values));
  }

  renderSelectedHeroForm(hero, panelX, panelY) {
    const layout = layoutInfo();
    const panelH = this._adminPanel?.h || (layout.portrait ? 640 : 560);
    const formMaxH = Math.max(240, panelH - 70);
    const hasPortrait = Boolean(hero?.portraitUrl);

    const editDom = this.addDomForm(panelX, panelY, `
      <form class="phaser-form admin-phaser-form" style="max-height:${formMaxH}px">
        <div class="admin-form-head">
          <strong>Герой: ${escapeAttr(hero.id)}</strong>
          <button type="button" data-collapse-panel class="admin-collapse-btn">Свернуть</button>
        </div>
        <input name="name" placeholder="Имя" value="${escapeAttr(hero.name || '')}" required />
        <input name="title" placeholder="Титул" value="${escapeAttr(hero.title || '')}" />
        <input name="startingHealth" type="number" placeholder="HP" value="${escapeAttr(hero.startingHealth ?? 30)}" min="1" max="100" required />
        <button type="submit">Сохранить героя</button>

        <div class="admin-upload-block">
          <strong class="admin-upload-title">Портрет</strong>
          ${this.uploadFieldHtml('portrait', 'Картинка героя', 'image/png,image/jpeg,image/webp,image/gif', hasPortrait)}
          <button type="button" data-upload-portrait>Загрузить портрет</button>
          ${hasPortrait ? '<button type="button" data-delete-portrait class="admin-danger-btn">Удалить портрет</button>' : ''}
        </div>
      </form>
    `, (values) => this.saveHero(hero, values));

    const form = editDom.node?.querySelector('form');
    form?.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        const nameNode = input.parentElement?.querySelector('[data-file-name]');
        if (nameNode) nameNode.textContent = input.files?.[0]?.name || 'Файл не выбран';
      });
    });
    form?.querySelector('[data-collapse-panel]')?.addEventListener('click', () => this.setPanelCollapsed(true));
    form?.querySelector('[data-upload-portrait]')?.addEventListener('click', () => this.uploadHeroPortrait(hero, form));
    form?.querySelector('[data-delete-portrait]')?.addEventListener('click', () => this.deleteHeroPortrait(hero));
  }

  renderUsersForm(panelX, panelY) {
    this.addDomForm(panelX, panelY - 90, `
      <form class="phaser-form admin-create-form" data-admin-promote>
        <strong>Сделать админом</strong>
        <input name="emailOrUsername" placeholder="Email или username" required />
        <button type="submit">Выдать ROLE_ADMIN</button>
      </form>
    `, (values) => this.promoteAdmin(values));

    this.addDomForm(panelX, panelY + 110, `
      <form class="phaser-form admin-create-form" data-admin-gold>
        <strong>Выдать золото</strong>
        <input name="emailOrUsername" placeholder="Email или username" required />
        <input name="amount" type="number" placeholder="Количество" value="100" min="1" required />
        <button type="submit">Начислить золото</button>
      </form>
    `, (values) => this.grantGold(values));
  }

  async promoteAdmin(values) {
    try {
      await api.post('/api/admin/users/promote-admin', {
        emailOrUsername: values.emailOrUsername.trim(),
      });
      this.renderAdmin(`Пользователь ${values.emailOrUsername.trim()} теперь админ`);
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось выдать админку');
    }
  }

  async grantGold(values) {
    try {
      const { data } = await api.post('/api/admin/users/grant-gold', {
        emailOrUsername: values.emailOrUsername.trim(),
        amount: Number(values.amount) || 0,
      });
      this.renderAdmin(`Выдано ${data.grantedGold} золота пользователю ${data.username}. Итого: ${data.totalGold}`);
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось выдать золото');
    }
  }

  async saveCard(card, values) {
    try {
      const isMinion = card.cardType === 'MINION';
      const payload = isMinion
        ? {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            attack: Number(values.attack) || 0,
            health: Number(values.health) || 1,
            description: values.description || '',
            ...this.minionEffectsPayload(values),
          }
        : {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            damage: Number(values.damage) || 0,
            description: values.description || '',
          };
      const path = isMinion ? `/api/admin/cards/minions/${card.id}` : `/api/admin/cards/spells/${card.id}`;
      const { data } = await api.put(path, payload);
      this.cards = this.cards.map((c) => (c.id === data.id && c.cardType === data.cardType ? data : c));
      this.selected = data;
      this.renderAdmin('Карта сохранена');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось сохранить карту');
    }
  }

  async createCard(values) {
    try {
      const isMinion = values.cardType === 'MINION';
      const payload = isMinion
        ? {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            attack: Number(values.attack) || 0,
            health: Number(values.health) || 1,
            description: values.description || '',
            ...this.minionEffectsPayload(values),
          }
        : {
            name: values.name,
            manaCost: Number(values.manaCost) || 0,
            damage: Number(values.damage) || 0,
            description: values.description || '',
          };
      const { data } = await api.post(isMinion ? '/api/admin/cards/minions' : '/api/admin/cards/spells', payload);
      this.cards = [...this.cards, data];
      this.selected = data;
      this.formMode = 'edit';
      await this.loadCardTextures([data]);
      this.renderAdmin('Карта создана');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось создать карту');
    }
  }

  async createHero(values) {
    try {
      const { data } = await api.post('/api/admin/heroes', {
        name: values.name.trim(),
        title: values.title?.trim() || '',
        startingHealth: Number(values.startingHealth) || 30,
      });
      this.heroes = [...(this.heroes || []), data];
      this.selectedHero = data;
      this.selected = null;
      this.formMode = 'heroes';
      this.renderAdmin(`Герой создан (id: ${data?.id || 'ok'})`);
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось создать героя');
    }
  }

  async saveHero(hero, values) {
    try {
      const { data } = await api.put(`/api/admin/heroes/${encodeURIComponent(hero.id)}`, {
        name: values.name.trim(),
        title: values.title?.trim() || '',
        startingHealth: Number(values.startingHealth) || 30,
      });
      this.heroes = (this.heroes || []).map((h) => (h.id === data.id
        ? { ...h, ...data, portraitUrl: h.portraitUrl || data.portraitUrl || '' }
        : h));
      this.selectedHero = {
        ...(this.selectedHero || {}),
        ...data,
        portraitUrl: this.selectedHero?.portraitUrl || data.portraitUrl || '',
      };
      this.renderAdmin('Герой сохранён');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось сохранить героя');
    }
  }

  async uploadHeroPortrait(hero, form) {
    try {
      const file = form?.elements?.portrait?.files?.[0];
      if (!file) {
        this.renderAdmin('Выберите файл портрета');
        return;
      }
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post(`/api/admin/heroes/${encodeURIComponent(hero.id)}/portrait`, fd);
      const portraitUrl = data?.portraitUrl || '';
      this.heroes = (this.heroes || []).map((h) => (
        h.id === hero.id ? { ...h, portraitUrl } : h
      ));
      this.selectedHero = { ...(this.selectedHero || hero), portraitUrl };
      this.renderAdmin('Портрет загружен');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось загрузить портрет');
    }
  }

  async deleteHeroPortrait(hero) {
    try {
      await api.delete(`/api/admin/heroes/${encodeURIComponent(hero.id)}/portrait`);
      this.heroes = (this.heroes || []).map((h) => (
        h.id === hero.id ? { ...h, portraitUrl: '' } : h
      ));
      this.selectedHero = { ...(this.selectedHero || hero), portraitUrl: '' };
      this.renderAdmin('Портрет удалён');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось удалить портрет');
    }
  }

  async deleteCard(card) {
    try {
      const isMinion = card.cardType === 'MINION';
      await api.delete(isMinion ? `/api/admin/cards/minions/${card.id}` : `/api/admin/cards/spells/${card.id}`);
      this.cards = this.cards.filter((c) => !(c.id === card.id && c.cardType === card.cardType));
      this.selected = null;
      this.renderAdmin('Карта удалена');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось удалить карту');
    }
  }

  async uploadCardAssets(card, form) {
    try {
      const isMinion = card.cardType === 'MINION';
      const uploads = [
        ['image', form.elements.image?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/image` : `/api/cards/spells/${card.id}/image`, 'image'],
        ['sound', form.elements.sound?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/sound` : `/api/cards/spells/${card.id}/sound`, 'sound'],
        ['attackSound', form.elements.attackSound?.files?.[0], `/api/cards/minions/${card.id}/attack-sound`, 'sound'],
        ['effect', form.elements.effect?.files?.[0], isMinion ? `/api/cards/minions/${card.id}/play-effect` : `/api/cards/spells/${card.id}/play-effect`, 'effect'],
        ['attackEffect', form.elements.attackEffect?.files?.[0], `/api/cards/minions/${card.id}/attack-effect`, 'effect'],
      ].filter(([, file]) => file);
      for (const [, file, endpoint, field] of uploads) {
        const fd = new FormData();
        fd.append(field, file);
        await api.post(endpoint, fd);
      }
      this.loadAdmin('Ассеты загружены');
    } catch (err) {
      this.renderAdmin(err.response?.data?.message || err.message || 'Не удалось загрузить ассеты');
    }
  }
}

export default AdminScene;
