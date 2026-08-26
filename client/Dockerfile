FROM node:24-alpine


WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./
RUN npm ci

# Копируем весь код и собираем production-версию
COPY . .
ARG REACT_APP_API_URL=http://localhost:5497
ARG REACT_APP_WS_URL=http://localhost:5497/ws
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
RUN npm run build

# Устанавливаем serve для отдачи статики
RUN npm install -g serve

EXPOSE 3000

# Запуск production-бандла
CMD ["serve", "-s", "build", "-l", "3000"]