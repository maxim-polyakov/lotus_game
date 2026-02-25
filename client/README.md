# Lotus Game — Frontend

React-приложение (Create React App, без Vite). Файлы `.jsx`.

## Запуск

```bash
cd client
npm start
```

Фронт: http://localhost:3000

## Переменные окружения

- `REACT_APP_API_URL` — URL бэкенда (по умолчанию http://localhost:8080)

## Структура

- `/` — главная
- `/login` — вход
- `/register` — регистрация
- `/verify-email` — ввод кода подтверждения
- `/decks` — колоды (защищено)
- `/play` — поиск матча и игра (защищено)

WebSocket подключается к `/ws` для обновлений матча в реальном времени.
