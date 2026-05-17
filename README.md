# Lotus Game

Онлайн-карточная PvP-игра в духе Hearthstone: колоды, герои, матчи в реальном времени, рейтинг, магазин и социальные функции.

Монорепозиторий: **React** (клиент) + **Spring Boot** (сервер).

## Возможности

- Регистрация, вход, подтверждение email, восстановление пароля
- OAuth2 (Google)
- Сборка колод, выбор героев, заклинания
- PvP-матчи с обновлениями по WebSocket (STOMP)
- Реплеи, таблица лидеров
- Друзья, уведомления, чат
- Внутриигровой магазин
- Админ-панель (карты, герои, настройки)
- Светлая и тёмная тема

## Стек

| Часть | Технологии |
|-------|------------|
| Frontend | React 19, React Router, Axios, SockJS + STOMP |
| Backend | Java 17, Spring Boot 3, Spring Security, JWT, JPA |
| БД | PostgreSQL |
| Кэш | Redis |
| Хранилище | Yandex Object Storage (S3-совместимое API) |
| API docs | SpringDoc OpenAPI (`/swagger-ui.html`) |

## Структура репозитория

```
lotus_game/
├── client/          # React-приложение (Create React App)
├── server/          # Spring Boot API и WebSocket
├── docker-compose.yml
└── README.md
```

Подробнее по частям: [client/README.md](client/README.md), [server/README.md](server/README.md).

## Быстрый старт (Docker)

**Требования:** Docker и Docker Compose.

1. Создайте файлы окружения (секреты не коммитятся):
   - `client/.env` — см. [client/.env.example](client/.env.example)
   - `server/.env` — переменные для БД, JWT, OAuth, почты и хранилища

2. Запуск:

```bash
docker compose up --build
```

| Сервис | URL (по умолчанию в compose) |
|--------|------------------------------|
| Клиент | http://localhost:3165 |
| API | http://localhost:5497 |
| Redis | localhost:6383 |
| MailDev (SMTP/UI) | http://localhost:8185 |

Для сборки клиента в Docker задайте `REACT_APP_API_URL` в `client/.env` (URL бэкенда, доступный из браузера).

## Локальная разработка

### Backend

**Требования:** JDK 17+, Maven 3.9+, PostgreSQL, Redis.

```bash
cd server
mvn spring-boot:run
```

Сервер: http://localhost:8080  
Swagger UI: http://localhost:8080/swagger-ui.html

Настройки — `server/src/main/resources/application.properties` и/или `server/.env` (переменные окружения Spring). Для Redis локально укажите `spring.data.redis.host=localhost` (в Docker используется имя сервиса `lotus-redis`).

### Frontend

**Требования:** Node.js 18+ (в Docker-образе — Node 24).

```bash
cd client
cp .env.example .env   # при необходимости
npm install
npm start
```

Клиент: http://localhost:3000

| Переменная | Описание |
|------------|----------|
| `REACT_APP_API_URL` | URL API (по умолчанию `http://localhost:8080`) |
| `REACT_APP_WS_URL` | URL WebSocket (опционально; иначе выводится из API) |

## Маршруты клиента

| Путь | Описание |
|------|----------|
| `/` | Главная |
| `/login`, `/register`, `/verify-email`, `/forgot-password` | Авторизация |
| `/heroes`, `/decks`, `/decks/new`, `/decks/:id` | Герои и колоды |
| `/play` | Поиск матча и игра |
| `/profile`, `/leaderboard` | Профиль и рейтинг |
| `/replays`, `/replay/:matchId` | Реплеи |
| `/friends`, `/notifications`, `/shop` | Социальное и магазин |
| `/admin` | Админ-кабинет (`ROLE_ADMIN`) |

## API и WebSocket

- REST: префикс `/api/` (авторизация, колоды, матчи, магазин и т.д.)
- JWT: access + refresh; заголовок `Authorization: Bearer <token>`
- WebSocket: `ws` или SockJS на `/ws`, STOMP-топики матчей `/topic/match/{matchId}`

Примеры запросов авторизации — в [server/README.md](server/README.md).

## Сборка production

```bash
# Клиент
cd client && npm run build

# Сервер
cd server && mvn clean package -DskipTests
```

JAR: `server/target/*.jar`. Клиент в Docker отдаётся через `serve` из `client/build`.

## Безопасность

- В продакшене задайте свой `JWT_SECRET` (не короче 32 символов).
- Не коммитьте `.env`, пароли БД, OAuth client secret и ключи облачного хранилища.
- Проверьте `app.frontend.url` и redirect URI для OAuth на ваш домен.

## Лицензия

Уточните лицензию в репозитории при публикации.
