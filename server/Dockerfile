# Стадия сборки
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Финальная стадия
FROM alpine:3.20
RUN apk add --no-cache openjdk17-jdk bash

WORKDIR /app

# Копируем JAR из стадии сборки
COPY --from=builder /app/target/*.jar app.jar

# Создаем директорию с полными правами
RUN mkdir -p /app/uploads/images && chmod -R 777 /app/uploads

# Запускаем от root (по умолчанию)
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]