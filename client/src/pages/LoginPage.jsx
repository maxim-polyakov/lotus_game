import api, { API_BASE } from '../api/client';
import { setTokens } from '../utils/tokenStorage';
import { layoutInfo } from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { loadCurrentUser, loginUser } from '../components/FriendOnlinePopup';

export class AuthScene extends BaseScene {
  constructor() {
    super('AuthScene');
  }

  create(data = {}) {
    this.mode = data.mode || 'login';
    this.render();
  }

  render(error = '') {
    this.clearScene();
    const layout = layoutInfo();
    const title = this.mode === 'register'
      ? 'Регистрация'
      : this.mode === 'forgot'
        ? 'Сброс пароля'
        : this.mode === 'verify'
          ? 'Подтверждение email'
          : 'Вход';
    this.drawBackground(title);
    const panelY = layout.portrait ? 470 : 360;
    const navY = layout.portrait ? 790 : 600;
    this.addPanel(layout.centerX, panelY, layout.portrait ? 560 : 460, layout.portrait ? 560 : 450);

    const formHtml = this.formHtml();
    this.addDomForm(layout.centerX, panelY + 10, formHtml, (values) => this.submit(values));

    if (error) this.addMessage(error, '#ffb3b3', layout.portrait ? 930 : 640);
    if (layout.portrait) {
      this.addButton(layout.centerX, navY, 300, 48, 'Вход', () => this.scene.restart({ mode: 'login' }), { fontSize: 17 });
      this.addButton(layout.centerX, navY + 62, 300, 48, 'Регистрация', () => this.scene.restart({ mode: 'register' }), { fontSize: 17 });
      this.addButton(layout.centerX, navY + 124, 300, 48, 'Забыли пароль', () => this.scene.restart({ mode: 'forgot' }), { fontSize: 17 });
    } else {
      this.addButton(468, navY, 150, 40, 'Вход', () => this.scene.restart({ mode: 'login' }), { fontSize: 16 });
      this.addButton(640, navY, 170, 40, 'Регистрация', () => this.scene.restart({ mode: 'register' }), { fontSize: 16 });
      this.addButton(830, navY, 180, 40, 'Забыли пароль', () => this.scene.restart({ mode: 'forgot' }), { fontSize: 16 });
    }
  }

  formHtml() {
    if (this.mode === 'register') {
      return `
        <form class="phaser-form">
          <input name="username" placeholder="Username" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Создать аккаунт</button>
        </form>`;
    }
    if (this.mode === 'verify') {
      return `
        <form class="phaser-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="code" placeholder="Код подтверждения" required />
          <button type="submit">Подтвердить</button>
        </form>`;
    }
    if (this.mode === 'forgot') {
      return `
        <form class="phaser-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="code" placeholder="Код, если уже пришёл" />
          <input name="newPassword" type="password" placeholder="Новый пароль" />
          <button type="submit">Отправить / сбросить</button>
        </form>`;
    }
    return `
      <form class="phaser-form">
        <input name="usernameOrEmail" placeholder="Username или email" required />
        <input name="password" type="password" placeholder="Password" required />
        <label><input name="rememberMe" type="checkbox" value="yes" /> Запомнить меня</label>
        <button type="submit">Войти</button>
        <a href="${API_BASE}/oauth2/authorization/google">Google OAuth</a>
      </form>`;
  }

  async submit(values) {
    try {
      if (this.mode === 'register') {
        await api.post('/api/auth/register', values);
        this.scene.restart({ mode: 'verify' });
        return;
      }
      if (this.mode === 'verify') {
        const { data } = await api.post('/api/auth/verify-email', values);
        setTokens(data.accessToken, data.refreshToken, true);
        await loadCurrentUser();
        this.goto('MenuScene');
        return;
      }
      if (this.mode === 'forgot') {
        if (values.code && values.newPassword) {
          await api.post('/api/auth/reset-password', values);
          this.scene.restart({ mode: 'login' });
        } else {
          await api.post('/api/auth/forgot-password', { email: values.email });
          this.render('Код отправлен на email. Введите код и новый пароль.');
        }
        return;
      }
      await loginUser(values.usernameOrEmail, values.password, values.rememberMe === 'yes');
      this.goto('MenuScene');
    } catch (err) {
      this.render(err.response?.data?.message || err.message || 'Ошибка');
    }
  }
}

export default AuthScene;
