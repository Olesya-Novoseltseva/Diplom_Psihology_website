# Удалённый доступ через ngrok (без домена и VPS)

Приложение работает **на вашем ПК в Docker**. Наружу открывается только локальный порт `127.0.0.1:<TUNNEL_INGRESS_PORT>`, а публичный HTTPS‑адрес выдаёт **ngrok**.

## Архитектура

| Компонент | Роль |
|-----------|------|
| `docker-compose.prod.yml` | Postgres + vLLM + backend + **frontend**. Снаружи слушает только **`127.0.0.1:<TUNNEL_INGRESS_PORT>`** → контейнер `frontend` (nginx). |
| `frontend/nginx.conf` | SPA + **`/api/`** и **`/uploads/`** → `backend:4000` (один origin для браузера). |
| `backend` | `CORS_REFLECT_REQUEST_ORIGIN=true` — корректно для сменных URL ngrok. |

**Собственный домен, Caddy и Let’s Encrypt не используются.**

## От вас

1. Этот репозиторий, Docker Desktop (Win + NVIDIA + WSL2 при необходимости для GPU).
2. Файл **`.env.prod`** (начните с `cp .env.prod.example .env.prod`, заполните секреты).
3. Установленный **ngrok** (обязательно).

Ссылка вида `https://<name>.ngrok-free.app` публична. Передавайте только тем, кому нужен доступ. После демо закрывайте туннель (`Ctrl+C`).

## Шаги

### 0) Установить ngrok (Windows, один раз)

1. Зарегистрируйтесь на [ngrok.com](https://ngrok.com/) и скопируйте свой `authtoken` из Dashboard.
2. Установите ngrok:

```powershell
winget install ngrok.ngrok
```

3. Закройте и заново откройте PowerShell, проверьте установку:

```powershell
ngrok version
```

4. Привяжите токен:

```powershell
ngrok config add-authtoken <ВАШ_NGROK_TOKEN>
```

После этого токен сохраняется в профиле пользователя, повторять не нужно.

### 1) Поднять Docker-стек

Из корня `Diplom_Psihology_website`:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Если порт занят, в `.env.prod` задайте, например, `TUNNEL_INGRESS_PORT=8091` и в командах ниже тоже используйте `8091`.

### 2) Проверить локально (до ngrok)

```powershell
curl http://127.0.0.1:8090/api/health
```

Ожидается JSON с `"status":"ok"` и `sentimentProvider: "openai"` (режим с vLLM в compose по умолчанию).

Ожидается JSON с `"status":"ok"` и `sentimentProvider: "openai"`.

Проверьте фронтенд:

```powershell
curl http://127.0.0.1:8090/
```

Если тут ошибка, ngrok не поможет: сначала чините контейнеры.

### 3) Запуск туннеля ngrok

```powershell
ngrok http 8090
```

В выводе будет строка `Forwarding https://...ngrok-free.app -> http://localhost:8090`.
Используйте именно HTTPS‑URL из текущего запуска.

Упрощённый запуск через скрипт проекта:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-ngrok.ps1 -Port 8090
```

Проверка из этого же PowerShell:

```powershell
curl https://<ВАШ_NGROK_URL>/api/health
```

### 4) Остановить

Туннель: `Ctrl+C`. Контейнеры:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

## Частые вопросы

- **URL может меняться на бесплатном плане ngrok** — это нормально. Постоянный домен даётся платными опциями.
- **Первый старт vLLM** может долго качать модель и греть VRAM — смотрите `docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f vllm`.
- Если `backend` или `frontend` перезапускаются — **логи**:  
  `docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail 200 backend`

### Prisma `P1000` / «credentials are not valid»

Частые причины:

1. **Старый общий том PostgreSQL с dev-режимом.** Раньше в проде использовался тот же Docker-том **`wellness_pgdata`**, что и в `docker-compose.yml` (`wellness/wellness`, база `wellness_dev`). Пароль в уже созданном кластере **не меняется** из `.env.prod`. Сейчас прод-сервисы используют том **`wellness_pgdata_prod`** — отдельная чистая база под значения из **`.env.prod`**.

2. **Что сделать один раз после обновления compose:** пересоздать контейнеры (новый том подтянется сам при первом `up`):

   ```powershell
   docker compose --env-file .env.prod -f docker-compose.prod.yml down
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
   ```

   Убедитесь, что в **`.env.prod`** для `POSTGRES_*` нет случайных пробелов или кавычек по краям строки.

### Долго грузится или не открывается через ngrok

Если **`backend`** в цикле миграций, минутами нет живого `/api/health`, вкладка будет "висеть". После устранения P1000 скорость обычно возвращается (кроме холодного старта vLLM).

**Если в nginx есть `/` и `/assets/*`, но UI "белый":**
- откройте страницу в приватном окне;
- очистите `localStorage` для домена ngrok (ключ `wellness_token`);
- проверьте в DevTools вкладку Network, что `index-*.js` загружается без 404/blocked.

**Сжатие**: nginx включает `gzip` для JS/CSS — полезнее на слабом исходящем канале с вашего ПК.

### Быстрый чек-лист "не работает"

1. `docker compose --env-file .env.prod -f docker-compose.prod.yml ps` — все сервисы `Up`.
2. `curl http://127.0.0.1:8090/api/health` — локально `200`.
3. `ngrok http 8090` — в консоли есть `Forwarding https://...`.
4. `curl https://<URL>/api/health` — публично `200`.
5. Для пользователя: новая ссылка, приватное окно, отключить расширения.

## Альтернатива: локальная разработка без полного compose

Привычный `npm run dev` + Postgres/vLLM по `docker-compose.yml` см. основной **`README.md`**.
