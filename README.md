# Платформа психологической поддержки студентов (MVP)

Монорепозиторий: `backend` (Express, Prisma, PostgreSQL) и `frontend` (Vite, React, TypeScript).

## Требования

- **Node.js** 20+
- **PostgreSQL** 14+ (локально или в Docker)
- **npm** (workspaces в корне)

## Быстрый старт

1. **Установка зависимостей** (из корня репозитория):

   ```bash
   npm install
   ```

2. **Переменные окружения backend**: скопируйте пример и отредактируйте значения:

   ```bash
   copy backend\.env.example backend\.env
   ```

   Минимально задайте `DATABASE_URL` и `JWT_SECRET` (не короче 32 символов). Для дневника по умолчанию используется эвристический анализ (`SENTIMENT_PROVIDER=heuristic`); при необходимости включите LLM — см. комментарии в `backend/.env.example`.

3. **Миграции и демо-данные кампуса** (корпуса ЛЭТИ в сидах):

   Сначала убедитесь, что **PostgreSQL запущен** и доступен по адресу из `DATABASE_URL` (по умолчанию `localhost:5432`). Если базы ещё нет — самый простой вариант с Docker из **корня** репозитория:

   ```bash
   docker compose up -d
   ```

   Затем:

   ```bash
   npm run db:migrate --workspace=backend
   npm exec --workspace=backend -- prisma db seed
   ```

4. **Запуск в режиме разработки** — два терминала из корня:

   ```bash
   npm run dev:backend
   ```

   ```bash
   npm run dev:frontend
   ```

   API: `http://localhost:4000`, веб-интерфейс: `http://localhost:5173` (Vite проксирует `/api` на backend).

5. **Сборка** (проверка типов и бандла):

   ```bash
   npm run build
   ```

6. **Тесты backend**:

   ```bash
   npm test
   ```

## Логи API (диагностика падений)

В процесс backend выводятся **однострочные JSON-события** (`ts`, `level`, `scope`, `event`, при необходимости — вложенный `meta`). Типичные события:

- `http_listen` — сервер поднял порт.
- `http_response` — завершён запрос (в `meta` есть `reqId`, `method`, `path`, `status`, `ms`).
- `validation_failed` / `http_client_error` — ожидаемые 4xx.
- `unhandled_exception` / `http_server_error` — ошибки со стеком в `meta.errStack`.

У каждого ответа выставляется заголовок **`X-Request-Id`** — его можно искать в логах рядом с событием ошибки.

## Если ошибка «Can't reach database server» / P1001

- PostgreSQL не запущен или порт не **5432**, или в `backend/.env` неверный `DATABASE_URL`.
- Проверьте: `docker compose ps` (если используете прилагаемый `docker-compose.yml`) или службу PostgreSQL в Windows.
- После старта БД снова выполните `npm run db:migrate --workspace=backend` и при необходимости seed.

**Примечание:** виртуальное окружение Python (`.venv`) для этого Node-проекта не нужно; достаточно `npm` и PostgreSQL.

## Структура

- `backend/` — REST API, домен, Prisma.
- `frontend/` — SPA: дневник, опросники, самопомощь, карта кампуса.

Материалы раздела самопомощи и сценарии опросников **не являются** клинической диагностикой; в интерфейсе даны дисклеймеры.
