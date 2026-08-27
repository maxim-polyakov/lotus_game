import api, { API_BASE } from '../api/client';
import { setTokens } from '../utils/tokenStorage';
import { layoutInfo } from '../game/shared';
import { BaseScene } from '../components/TutorialModal';
import { loadCurrentUser, loginUser } from '../components/FriendOnlinePopup';
import { ensureChatScene } from '../components/ChatWidget';

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

    // Form has its own card chrome — no second Phaser panel behind it (that looked crooked).
    const formY = layout.portrait ? Math.round(layout.centerY - 20) : Math.round(layout.centerY + 10);
    const dom = this.addDomForm(layout.centerX, formY, this.formHtml(layout), (values) => this.submit(values));
    this.bindModeLinks(dom);

    if (error) {
      this.addMessage(error, '#ffb3b3', layout.portrait ? formY + 340 : formY + 300);
    }
  }

  bindModeLinks(dom) {
    const root = dom?.node;
    if (!root) return;
    root.querySelectorAll('[data-auth-mode]').forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        const mode = el.getAttribute('data-auth-mode');
        if (mode) this.scene.restart({ mode });
      });
    });
  }

  modeNavHtml(layout) {
    const navClass = layout.portrait ? 'auth-mode-nav auth-mode-nav--stack' : 'auth-mode-nav auth-mode-nav--row';
    return `
      <div class="${navClass}">
        <button type="button" data-auth-mode="login">Вход</button>
        <button type="button" data-auth-mode="register">Регистрация</button>
        <button type="button" data-auth-mode="forgot">Забыли пароль</button>
      </div>`;
  }

  formHtml(layout = layoutInfo()) {
    const nav = this.modeNavHtml(layout);
    if (this.mode === 'register') {
      return `
        <form class="phaser-form auth-form">
          <input name="username" placeholder="Username" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Создать аккаунт</button>
          ${nav}
        </form>`;
    }
    if (this.mode === 'verify') {
      return `
        <form class="phaser-form auth-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="code" placeholder="Код подтверждения" required />
          <button type="submit">Подтвердить</button>
          ${nav}
        </form>`;
    }
    if (this.mode === 'forgot') {
      return `
        <form class="phaser-form auth-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="code" placeholder="Код, если уже пришёл" />
          <input name="newPassword" type="password" placeholder="Новый пароль" />
          <button type="submit">Отправить / сбросить</button>
          ${nav}
        </form>`;
    }
    return `
      <form class="phaser-form auth-form">
        <input name="usernameOrEmail" placeholder="Username или email" required />
        <input name="password" type="password" placeholder="Password" required />
        <label class="auth-remember">
          <input name="rememberMe" type="checkbox" value="yes" />
          <span>Запомнить меня</span>
        </label>
        <button type="submit">Войти</button>
        <a href="${API_BASE}/oauth2/authorization/google">Google OAuth</a>
        ${nav}
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
        ensureChatScene(this);
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
      ensureChatScene(this);
      this.goto('MenuScene');
    } catch (err) {
      this.render(err.response?.data?.message || err.message || 'Ошибка');
    }
  }
}

export default AuthScene;
