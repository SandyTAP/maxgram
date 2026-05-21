# MaxGram Telegram OTP

Production-ready Python 3.12 проект, где FastAPI-сайт и aiogram 3 Telegram-бот работают как единая система авторизации через Telegram OTP вместо SMS.

## Что реализовано

- FastAPI backend с Swagger (`/docs`), healthcheck (`/health/live`, `/health/ready`) и Prometheus metrics (`/metrics`).
- Jinja2 + TailwindCSS frontend: главная, login/register, OTP verify, dashboard, admin panel.
- aiogram 3 bot: `/start`, `/cabinet`, `/history`, inline-меню, выбор страны, выдача и освобождение номера.
- PostgreSQL + SQLAlchemy 2.0 async + Alembic migration.
- Redis OTP: одноразовый 6-значный код, TTL 2 минуты, cooldown resend, brute-force лимит.
- JWT в HttpOnly cookies, CSRF token для форм, bcrypt hashing, Redis rate limiting.
- VirtualNumber со статусами `free`, `busy`, `banned`, `expired` и атомарной выдачей через `SELECT FOR UPDATE SKIP LOCKED`.
- Celery worker/beat для очистки старых OTP, сессий и освобождения истекших номеров.
- Docker Compose: web, bot, celery worker, celery beat, PostgreSQL, Redis, Nginx.
- Admin panel для просмотра пользователей и управления номерами.

## Быстрый запуск

```bash
cp .env.example .env
# Обязательно замените SECRET_KEY, JWT_SECRET_KEY, TELEGRAM_BOT_TOKEN, ADMIN_PASSWORD.
docker compose up --build
```

После запуска:

- сайт: http://localhost
- Swagger: http://localhost/docs
- admin panel: http://localhost/admin
- healthcheck: http://localhost/health/ready

## Сценарий авторизации

1. Пользователь пишет боту `/start` и получает свой Telegram ID.
2. На сайте открывает `/login`, вводит email, username и Telegram ID.
3. Backend создает или обновляет пользователя, генерирует OTP и кладет код в Redis на 120 секунд.
4. Backend отправляет OTP в Telegram через бота.
5. Пользователь вводит код на `/verify`.
6. Backend проверяет Redis, удаляет код после успешной проверки и выдает JWT cookie.
7. Пользователь попадает в `/dashboard`, а бот получает уведомление о входе.

## Виртуальные номера

1. В Telegram-боте пользователь нажимает `Получить номер`.
2. Выбирает страну: США (`US`, +1), Россия (`RU`, +7), Великобритания (`GB`, +44).
3. Бот случайно выбирает свободный номер и блокирует строку в PostgreSQL через `FOR UPDATE SKIP LOCKED`.
4. Номер получает статус `busy`, `assigned_to`, `assigned_at`, `expires_at`.
5. До завершения аренды другой пользователь не сможет получить этот номер.
6. Пользователь может освободить номер кнопкой, либо Celery beat освободит его после истечения срока.

## Структура

```text
app/
  api/              FastAPI routes and dependencies
  bot/              aiogram bot handlers and keyboards
  core/             config, security, logging, rate limiting
  db/               async SQLAlchemy session and Redis client
  models/           SQLAlchemy models and enums
  repositories/     repository pattern for persistence
  services/         OTP, Telegram sending, auth sessions, seed data
  web/              Jinja2 templates and static assets
  worker/           Celery app and cleanup tasks
alembic/            migrations
docker-compose.yml  full runtime stack
nginx/              reverse proxy config
```

## Production notes

- Set `COOKIE_SECURE=true` behind HTTPS.
- Put real TLS certs into `nginx/certs` or terminate TLS at an external load balancer.
- Rotate `SECRET_KEY` and `JWT_SECRET_KEY` before first production run.
- Use a real Telegram bot token from BotFather.
- Add production numbers through `/admin`; demo seed numbers are created only when the table is empty.
- PostgreSQL protects SQL injection through SQLAlchemy parameters; OTP and rate-limit state live in Redis.
