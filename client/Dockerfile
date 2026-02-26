FROM node:24-alpine

ARG REACT_APP_API_URL=http://localhost:5497
ENV REACT_APP_API_URL=$REACT_APP_API_URL

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./
RUN npm ci

# Копируем весь код и собираем production-версию
COPY . .
RUN npm run build

# Устанавливаем serve для отдачи статики
RUN npm install -g serve

EXPOSE 3000

# Запуск production-бандла
CMD ["serve", "-s", "build", "-l", "3000"]