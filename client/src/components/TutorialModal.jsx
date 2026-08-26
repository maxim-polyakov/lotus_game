import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  palette,
  session,
  layoutInfo,
} from '../game/shared';
import { sceneToRoute } from './NavDropdown';
import { textureKey, resolveAssetUrl } from './CardDisplay';
import { imageTextureKey, circularAvatarKey } from './ErrorDetail';
import './TutorialModal.css';

export class BaseScene extends Phaser.Scene {
  clearScene() {
    // DOMElement HTML nodes can survive removeAll and stack on top of each other.
    [...(this.children?.list || [])].forEach((child) => {
      if (child?.type === 'DOMElement') {
        try {
          child.setVisible(false);
          child.destroy(true);
        } catch {
          // ignore already-destroyed nodes
        }
      }
    });
    this.children.removeAll(true);
    this.input.removeAllListeners();
    const domContainer = this.sys?.game?.domContainer;
    if (domContainer) {
      while (domContainer.firstChild) {
        domContainer.removeChild(domContainer.firstChild);
      }
    }
  }

  drawBackground(title) {
    const layout = layoutInfo();
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, palette.bg).setOrigin(0);
    const logoKey = this.textures.exists('lotus-logo') ? 'lotus-logo' : 'lotus-logo-fallback';
    if (this.textures.exists(logoKey)) {
      this.add.image(58, 52, logoKey).setDisplaySize(48, 48);
    } else {
      this.add.circle(58, 52, 24, palette.primaryDark).setStrokeStyle(2, palette.primary);
      this.add.text(58, 52, 'L', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    this.add.text(94, 34, title, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '28px' : '34px',
      color: palette.text,
      fontStyle: 'bold',
      wordWrap: { width: layout.portrait ? 360 : 760 },
    });
    this.addAvatar(GAME_WIDTH - 58, 53, session.user?.avatarUrl, session.user?.username || 'Guest', 42);
    this.add.text(GAME_WIDTH - 92, 42, session.user ? session.user.username : 'Guest', {
      fontFamily: 'Segoe UI, Arial',
      fontSize: layout.portrait ? '15px' : '18px',
      color: palette.muted,
    }).setOrigin(1, 0);
  }

  addButton(x, y, width, height, label, onClick, options = {}) {
    const fill = options.fill ?? palette.panel2;
    const stroke = options.stroke ?? palette.primary;
    const container = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, width, height, fill, 0.96)
      .setStrokeStyle(2, stroke)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: `${options.fontSize || 18}px`,
      color: options.color || palette.text,
      align: 'center',
    }).setOrigin(0.5);

    rect.on('pointerover', () => rect.setFillStyle(options.hoverFill ?? palette.primaryDark));
    rect.on('pointerout', () => rect.setFillStyle(fill));
    rect.on('pointerdown', () => onClick?.());
    container.add([rect, text]);
    return container;
  }

  addBackButton(target = 'MenuScene') {
    this.addButton(82, GAME_HEIGHT - 44, 120, 40, 'Назад', () => this.goto(target), { fontSize: 16 });
  }

  goto(scene, data = {}) {
    const route = sceneToRoute[scene] || '/';
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    this.scene.start(scene, data);
  }

  addPanel(x, y, width, height, alpha = 0.88) {
    return this.add.rectangle(x, y, width, height, palette.panel, alpha)
      .setStrokeStyle(1, 0x34445f)
      .setOrigin(0.5);
  }

  addMessage(message, color = palette.muted, y = GAME_HEIGHT - 86) {
    this.add.text(GAME_WIDTH / 2, y, message, {
      fontFamily: 'Segoe UI, Arial',
      fontSize: '18px',
      color,
      align: 'center',
      wordWrap: { width: 900 },
    }).setOrigin(0.5);
  }

  addDomForm(x, y, html, onSubmit) {
    const dom = this.add.dom(x, y).createFromHTML(html);
    const node = dom.node;
    const form = node.querySelector('form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      onSubmit(Object.fromEntries(data.entries()));
    });
    return dom;
  }

  loadCardTextures(cards = []) {
    const toLoad = cards.filter((c) => c.imageUrl && !this.textures.exists(textureKey(c)));
    if (!toLoad.length) return Promise.resolve();
    return new Promise((resolve) => {
      const onDone = () => {
        this.load.off('complete', onDone);
        this.load.off('loaderror', onDone);
        resolve();
      };
      toLoad.forEach((card) => {
        this.load.image({
          key: textureKey(card),
          url: resolveAssetUrl(card.imageUrl),
          crossOrigin: 'anonymous',
        });
      });
      this.load.once('complete', onDone);
      this.load.once('loaderror', onDone);
      this.load.start();
    });
  }

  loadImageUrls(urls = []) {
    const cleanUrls = [...new Set(urls.filter(Boolean).map((url) => resolveAssetUrl(url)))];
    const toLoad = cleanUrls.filter((url) => !this.textures.exists(imageTextureKey(url)));
    if (!toLoad.length) return Promise.resolve();
    return new Promise((resolve) => {
      const onDone = () => {
        this.load.off('complete', onDone);
        this.load.off('loaderror', onDone);
        resolve();
      };
      toLoad.forEach((url) => {
        this.load.image({
          key: imageTextureKey(url),
          url,
          crossOrigin: 'anonymous',
        });
      });
      this.load.once('complete', onDone);
      this.load.once('loaderror', onDone);
      this.load.start();
    });
  }

  addAvatar(x, y, url, name = '?', size = 44) {
    const radius = size / 2;
    const resolved = resolveAssetUrl(url);
    this.add.circle(x, y, radius, 0x2c3850);
    if (resolved && this.textures.exists(imageTextureKey(resolved))) {
      const key = this.ensureCircularAvatarTexture(resolved, size - 4);
      this.add.image(x, y, key).setDisplaySize(size - 4, size - 4);
      this.add.circle(x, y, radius, 0x000000, 0).setStrokeStyle(2, palette.primary);
      return;
    }
    this.add.circle(x, y, radius, 0x000000, 0).setStrokeStyle(2, palette.primary);
    this.add.text(x, y, (name || '?').slice(0, 2).toUpperCase(), {
      fontFamily: 'Segoe UI, Arial',
      fontSize: `${Math.max(14, size / 2.4)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  ensureCircularAvatarTexture(url, size) {
    const resolved = resolveAssetUrl(url);
    const outputKey = circularAvatarKey(resolved, size);
    if (this.textures.exists(outputKey)) return outputKey;

    const source = this.textures.get(imageTextureKey(resolved))?.getSourceImage();
    const texture = this.textures.createCanvas(outputKey, size, size);
    const ctx = texture.getContext();
    const sourceWidth = source?.naturalWidth || source?.width || size;
    const sourceHeight = source?.naturalHeight || source?.height || size;
    const scale = Math.max(size / sourceWidth, size / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const drawX = (size - drawWidth) / 2;
    const drawY = (size - drawHeight) / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    try {
      ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
    } catch {
      ctx.fillStyle = '#2c3850';
      ctx.fillRect(0, 0, size, size);
    }
    ctx.restore();
    texture.refresh();
    return outputKey;
  }
}

export class ListScene extends BaseScene {
  constructor(key, title, loader, formatter) {
    super(key);
    this.title = title;
    this.loader = loader;
    this.formatter = formatter;
  }

  create() {
    this.drawBackground(this.title);
    this.addBackButton();
    this.addMessage('Загрузка...', palette.text, 120);
    this.loader()
      .then((items) => this.render(items || []))
      .catch((err) => this.render([], err.response?.data?.message || err.message || 'Ошибка загрузки'));
  }

  render(items, error = '') {
    this.clearScene();
    const layout = layoutInfo();
    this.drawBackground(this.title);
    this.addBackButton();
    this.addPanel(layout.centerX, layout.portrait ? 660 : 380, layout.portrait ? 620 : 1040, layout.portrait ? 1040 : 520);
    if (error) this.addMessage(error, '#ffb3b3', layout.portrait ? 150 : 145);
    if (!items.length && !error) this.addMessage('Пока пусто', palette.muted, layout.portrait ? 170 : 160);
    items.slice(0, layout.portrait ? 26 : 18).forEach((item, index) => {
      const y = (layout.portrait ? 155 : 150) + index * (layout.portrait ? 38 : 28);
      this.add.text(layout.portrait ? 80 : 165, y, this.formatter(item, index), {
        fontFamily: 'Segoe UI, Arial',
        fontSize: layout.portrait ? '18px' : '17px',
        color: palette.text,
        wordWrap: { width: layout.portrait ? 560 : 950 },
      });
    });
  }
}
