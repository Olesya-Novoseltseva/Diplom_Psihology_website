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

## Полный стек в Docker + доступ для руководителя через ngrok (без VPS и домена)

Внешнее HTTPS даёт **[ngrok](https://ngrok.com/)** на вашей машине. Сервис поднимается локально, руководитель открывает выданную ссылку из интернета.

**Пошаговый разбор команд — в [`TUNNEL_DEMO.md`](./TUNNEL_DEMO.md).**

### Из чего состоит `docker-compose.prod.yml`

- **postgres**, **vllm**, **backend**, **frontend** (без Caddy и без Let’s Encrypt).
- **nginx** во `frontend`: статика приложения и прокси **`/api/`**, **`/uploads/`** → backend (единый адрес для браузера под туннелем).
- Наружу на хост пробрасывается только **`127.0.0.1:${TUNNEL_INGRESS_PORT:-8080}:80`**.
- **backend/Dockerfile** и **`backend/scripts/docker-entrypoint.sh`** — сборка API, автоматические миграции при старте, опциональный `RUN_DB_SEED`.
- По умолчанию **`CORS_REFLECT_REQUEST_ORIGIN=true`** в compose — нужно для сменных поддоменов туннеля.

Шаблон переменных: **`.env.prod.example`** → скопировать в **`.env.prod`**.

Поднять:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Проверка до туннеля (подставьте порт из `TUNNEL_INGRESS_PORT` в `.env.prod`):

```powershell
curl http://127.0.0.1:8090/api/health
```

Дальше: `ngrok http 8090` (или ваш порт из `.env.prod`), либо скрипт `powershell -ExecutionPolicy Bypass -File .\scripts\start-ngrok.ps1 -Port 8090` — см. **`TUNNEL_DEMO.md`**.

### Если `backend` в цикле Restarting

Смотрите `docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail 200 backend`. При **Prisma P1000** (ошибка авторизации в PostgreSQL) читайте раздел в **`TUNNEL_DEMO.md`**: прод-сервисы пишут данные в том **`wellness_pgdata_prod`** (отдельно от **`wellness_pgdata`** у `docker-compose.yml`).

### Замечания по vLLM

- Из backend: `http://vllm:8000/v1`, модель: `VLLM_MODEL`.
- Если не хватает VRAM — уменьняйте `VLLM_GPU_MEMORY_UTIL`, `VLLM_MAX_MODEL_LEN` или модель (см. раздел ниже про локальный vLLM).

## Локальный LLM для дневника (vLLM + Qwen)

Сайт на Node.js **не встраивает** vLLM: сервер с моделью поднимается **отдельно**. В `backend/.env` задаётся только HTTP-клиент к OpenAI-совместимому API (`/v1/chat/completions`).

### vLLM в Docker (удобно под Windows + NVIDIA)

Образ — официальный [`vllm/vllm-openai`](https://docs.vllm.ai/en/latest/deployment/docker.html) (Linux внутри контейнера; на хосте нужны **Docker Desktop**, **WSL2** и поддержка **GPU** в настройках Docker).

**Пошагово:**

1. Установите [NVIDIA драйвер](https://www.nvidia.com/Download/index.aspx) и Docker Desktop. В Docker: *Settings → Resources → WSL integration* и включение GPU, если есть такой пункт (см. [документацию Docker GPU](https://docs.docker.com/desktop/features/gpu/)).
2. В каталоге `Diplom_Psihology_website` (рядом с `docker-compose.yml`) при необходимости создайте файл `.env` для подстановки в Compose:
   - `VLLM_MODEL=Qwen/Qwen2.5-3B-Instruct` (на **4 ГБ VRAM** часто нужна **`Qwen/Qwen2.5-1.5B-Instruct`** и/или ниже лимиты ниже);
   - `VLLM_PORT=8000` (если порт занят — смените и **тот же порт** в `SENTIMENT_OPENAI_BASE_URL` в `backend/.env`, например `http://127.0.0.1:8006/v1`);
   - **`VLLM_MAX_MODEL_LEN`** — в compose по умолчанию `4096`; при ошибках старта уменьшите до **`2048`**;
   - **`VLLM_GPU_MEMORY_UTIL`** — в compose по умолчанию **`0.6`**. Если в **полных логах** после `EngineCore failed` есть текст вроде **`Free memory on device ... is less than desired GPU memory utilization`** — уменьшайте (**`0.55`**, **`0.5`**) и закройте другие программы, использующие GPU (игры, браузер с WebGPU, второй Docker и т.д.);
   - `HF_TOKEN=...` — для лимитов Hugging Face и закрытых моделей.

   **Диагностика «EngineCore failed to start»:** в выводе `docker compose --profile vllm logs vllm` пролистайте traceback до **последней** строки `ValueError` / `CUDA out of memory` — обрыв на `otel.py` это только обёртка, не причина.
3. Запустите только vLLM (PostgreSQL при этом не обязателен):

   ```bash
   docker compose --profile vllm up -d vllm
   ```

   Первый старт долго качает образ и веса модели в том `vllm_hf_cache`. Логи: `docker compose --profile vllm logs -f vllm`.
4. Скопируйте `backend/.env.example` → `backend/.env` (если ещё нет), выставьте:
   - `SENTIMENT_PROVIDER=openai`
   - `SENTIMENT_OPENAI_BASE_URL=http://127.0.0.1:8000/v1`
   - `SENTIMENT_OPENAI_MODEL` — **байт в байт то же имя**, что у запущенной модели на vLLM (как в `VLLM_MODEL` / `served_model_name` в логах; проверка: `GET /v1/models`). Иначе будет **404 The model `...` does not exist**.
   - при ошибках на `response_format` выключите `SENTIMENT_OPENAI_JSON_MODE` (`false` или удалите переменную).
5. Запустите backend и проверьте дневник в UI.

**Альтернатива без Compose** (из документации vLLM), из PowerShell после установки NVIDIA Container Toolkit:

```powershell
docker run --rm --gpus all -p 8000:8000 --shm-size=4g `
  -e HF_TOKEN=$env:HF_TOKEN `
  -v "${env:USERPROFILE}/.cache/huggingface:/root/.cache/huggingface" `
  vllm/vllm-openai:latest `
  --model Qwen/Qwen2.5-3B-Instruct --host 0.0.0.0 --port 8000 `
  --max-model-len 4096 --gpu-memory-utilization 0.6 --enforce-eager
```

### vLLM без Docker (Linux / WSL без поломок под Python на Windows)

1. Установите vLLM по [официальной инструкции](https://docs.vllm.ai) в окружение Python **3.10–3.12** (не через `npm`).
2. Запустите: `vllm serve Qwen/Qwen2.5-3B-Instruct --host 0.0.0.0 --port 8000 --max-model-len 4096 --gpu-memory-utilization 0.6 --enforce-eager` (имя совпадает с `SENTIMENT_OPENAI_MODEL`).
3. Настройте `backend/.env` как в п. 4 выше.

**Проверка API и режима дневника:** `GET /api/health` возвращает `status: "ok"` и **`sentimentProvider`**: `"heuristic"` или `"openai"` — по ней фронт в дневнике показывает подсказку об источнике анализа.

**Если в сайте или в логах backend ошибка вроде `fetch failed` / сетевой сбой к `/chat/completions`:**

- Порт в `SENTIMENT_OPENAI_BASE_URL` должен совпадать с **`VLLM_PORT`** в `.env` рядом с `docker-compose.yml` (проверьте `docker compose ps`).
- В URL лучше **`127.0.0.1`**, не `localhost` (иногда уходит в IPv6 `::1`, а сервис слушает только IPv4).
- Дождитесь, пока vLLM **догрузит веса** (в логах контейнера пройдёт стадия после `Starting to load model...` и появится готовность API — обычно ещё десятки секунд и дольше при первом старте), и только потом сохраняйте запись в дневнике.
- Быстрая проверка с хоста: `curl http://127.0.0.1:8000/v1/models` (подставьте свой порт).

**Если в логах vLLM в конце `RuntimeError: Engine core initialization failed. See root cause above`:**  
это **не полный текст ошибки**. Откройте **полный** вывод `docker compose --profile vllm logs vllm` и **выше** этого traceback найдите блок с префиксом **`(EngineCore pid=...)`** и строкой **`ERROR`** — там будет настоящая причина (часто `ValueError: Free memory on device ... gpu memory utilization`, либо `CUDA out of memory`). Тогда уменьшите в `.env` у compose: `VLLM_GPU_MEMORY_UTIL=0.5`, `VLLM_MAX_MODEL_LEN=2048` или смените модель на **`Qwen/Qwen2.5-1.5B-Instruct`** и синхронизируйте `SENTIMENT_OPENAI_MODEL` в `backend/.env`.

**Веб-интерфейс vLLM:** у движка нет встроенного чата; это HTTP API. Отдельно можно подключить Open WebUI, LibreChat и т.п., указав тот же base URL.

### Удалить локальный `pip install vllm` с Windows

Пакет ставится в каталог **Python**, а не в корень этого репозитория. Удаление:

```powershell
py -3.13 -m pip uninstall vllm -y
```

Если ставили другим интерпретатором — замените на `python -m pip uninstall vllm -y`. Оставшиеся зависимости можно подчистить вручную через `pip list` / `pip uninstall`, если нужно.

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

**Примечание:** для запуска сайта достаточно `npm` и PostgreSQL. Отдельное Python-окружение с vLLM нужно только если вы сами поднимаете локальный сервер модели для `SENTIMENT_PROVIDER=openai`.

## Структура

- `backend/` — REST API, домен, Prisma.
- `frontend/` — SPA: дневник, опросники, самопомощь, карта кампуса.

## Новые MVP-блоки

- **AI + опросники:** дневник передаёт анализатору snapshot самонаблюдения: последние опросники и 4 нормализованных показателя (тревожность, депрессивность, активность, удовлетворённость).
- **Графики:** `/api/wellbeing/daily`, `/api/wellbeing/monthly`, `/api/wellbeing/current` отдают единую статистику 0–100 для дневника и опросников.
- **Карта кампуса:** пользовательский интерфейс использует статичный план с точками в процентных координатах; администратор может добавлять и скрывать точки.
- **Администрирование:** роль `ADMIN` даёт доступ к `/admin` и `/api/admin/*` для управления точками кампуса, опросниками и техниками самопомощи.

После seed создаётся демо-администратор из `ADMIN_EMAIL` / `ADMIN_PASSWORD` (по умолчанию `admin@example.com` / `Admin12345`). Для диплома важно указать, что метрики являются инструментом самонаблюдения, а не медицинской диагностикой.

Материалы раздела самопомощи и сценарии опросников **не являются** клинической диагностикой; в интерфейсе даны дисклеймеры.
