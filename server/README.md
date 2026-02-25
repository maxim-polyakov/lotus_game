# Lotus Game — Backend

Бэкенд для карточной игры в стиле Hearthstone. Реализована авторизация по JWT и базовый API.

## Стек

- **Java 21**
- **Spring Boot 3.2**
- **Spring Security** + JWT (jjwt)
- **Spring Data JPA**
- **H2** (in-memory, для разработки; можно заменить на PostgreSQL)

## Запуск

```bash
cd server
./mvnw spring-boot:run
```

С профилем для разработки (логирование SQL):

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Сервер поднимается на **http://localhost:8080**.

## API авторизации

### Регистрация

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@example.com",
  "password": "secret123"
}
```

Ответ: `AuthResponse` с полями `accessToken`, `refreshToken`, `expiresInSeconds`, `userId`, `username`, `roles`.

### Вход

```http
POST /api/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "player1",
  "password": "secret123"
}
```

Ответ: тот же `AuthResponse`.

### Обновление токена

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

### Текущий пользователь (защищённый эндпоинт)

```http
GET /api/me
Authorization: Bearer <access_token>
```

Ответ: `{ "id", "username", "email", "roles" }`.

## Безопасность

- Пароли хранятся в виде BCrypt-хеша.
- Access token: 15 минут (настраивается в `app.jwt.access-token-expiration-seconds`).
- Refresh token: 7 дней (`app.jwt.refresh-token-expiration-seconds`).
- Секрет JWT задаётся в `app.jwt.secret` или переменной окружения `JWT_SECRET` (в продакшене обязательно свой секрет не короче 32 символов).

## Конфигурация

- `src/main/resources/application.yml` — основные настройки и JWT.
- `application-dev.yml` — профиль `dev` (логи SQL, отладочные логи).

Для продакшена рекомендуется:

- Подключить PostgreSQL (или другую БД) через `spring.datasource.*`.
- Установить `JWT_SECRET` из переменных окружения.
- Отключить H2 Console: `spring.h2.console.enabled: false`.

## WebSocket (обновления матча в реальном времени)

Подключение: **ws://localhost:8080/ws** (SockJS + STOMP).

**Подключение с JWT:**
```javascript
const socket = new SockJS('http://localhost:8080/ws');
const client = Stomp.over(socket);
client.connect({ token: accessToken }, () => {
  client.subscribe('/topic/match/' + matchId, (msg) => {
    const match = JSON.parse(msg.body);
    // обновить UI
  });
});
```

- При каждом действии (play, attack, end-turn) оба игрока получают обновлённый `MatchDto` в топике `/topic/match/{matchId}`.
- Подписаться на топик могут только участники матча (player1 или player2).
