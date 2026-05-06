# Полное описание проекта: веб-платформа психологической поддержки студентов (MVP)

**Идентификатор репозитория:** `student-wellness-platform` (npm workspaces: `backend`, `frontend`).  
**Назначение документа:** систематическое, максимально полное описание функционала, архитектуры, потоков данных, конфигурации и ограничений системы с точки зрения разработки и научно-прикладного контекста (вузовская психопросветительская поддержка, не клиническая диагностика).

---

## 1. Введение и постановка задачи

### 1.1. Предметная область

Система ориентирована на **студенческую аудиторию** и сценарии **самонаблюдения эмоционального состояния**, **краткого самоотчёта** (опросные шкалы), **психообразовательного контента** (самопомощь) и **ориентации в пространстве кампуса** (навигационно-информационный модуль). В терминах клинической психологии и психиатрии такие инструменты относят к области **скрининга и психообразования** при условии явных ограничений: отсутствие диагноза, отсутствие терапевтического контакта, ответственность пользователя за решение обращаться к специалисту.

### 1.2. Этико-правовые и методические ограничения (заложенные в продукте)

В коде и пользовательских текстах продукт декларирует:

- материалы **не заменяют** очную консультацию специалиста;
- опросники и интерпретации — для **личной динамики**, а не для **диагноза**;
- при **кризисных формулировках** в дневнике система усиливает **направление к экстренной и очной помощи** (шаблоны в `journalAssistant`, детекция в `crisisLanguage`).

Это соответствует распространённой практике проектирования digital mental health-приложений: прозрачное ограничение компетенции системы и триаж при риске.

### 1.3. Целевой функционал MVP (как реализовано)

| Модуль | Реализация |
|--------|------------|
| Учётная запись студента | Регистрация, вход, JWT |
| Дневник самонаблюдения | Текстовые записи, автоматический анализ, сохранение метрик |
| Опросники самонаблюдения | Каталог, прохождение, история попыток, условная интерпретация |
| Самопомощь | Статический структурированный контент на SPA |
| Кампус | Справочник корпусов/этажей, карта маркеров OpenStreetMap |
| Здоровье API | Маршрут проверки доступности |

---

## 2. Общая архитектура системы

### 2.1. Стиль архитектуры

Приложение построено как **классическая клиент-серверная архитектура**:

- **Frontend:** одностраничное приложение (SPA), обращается к REST API по префиксу `/api`.
- **Backend:** монолитный HTTP-сервис на Express с **слое́вым разделением ответственности**, близким к **чистой архитектуре / гексагональной модели** (ядро домена не зависит от Express или Prisma напрямую).

Условные слои backend:

1. **Presentation (HTTP)** — маршруты, контроллеры, middleware.
2. **Application** — сервисы сценариев использования, DTO/Zod-схемы, правила (стрики, генерация сообщений ассистента).
3. **Domain** — сущности, типы анализа дневника, интерфейсы репозиториев и сервисов (контракты).
4. **Infrastructure** — Prisma, JWT, bcrypt, эвристический или LLM-анализатор.

Точка сборки зависимостей: `backend/src/composition/bootstrap.ts`, сборка HTTP-приложения: `backend/src/composition/createHttpApp.ts`.

### 2.2. Поток запроса (обобщённо)

1. HTTP-запрос попадает в Express-приложение (`createHttpApp`).
2. Глобальные middleware: CORS (origin из `CORS_ORIGIN`), парсинг JSON.
3. Маршрутизация по префиксам `/api/*`.
4. При необходимости — **JWT guard** (`authGuard`): из заголовка `Authorization: Bearer <token>` извлекается полезная нагрузка; в `req.auth` помещаются `userId` и `email`.
5. Контроллер вызывает **application service**.
6. Сервис обращается к **репозиторию** и/или **инфраструктурным адаптерам** (анализ текста).
7. Ошибки перехватывает **централизованный обработчик** (`errorHandler`): Zod → 400, доменные `HttpError` → код статуса, прочее → 500.

### 2.3. Связь frontend и backend при разработке

Файл `frontend/vite.config.ts` задаёт **прокси** `/api` → `http://localhost:4000`. На клиенте базовый URL для `fetch` может быть пустым (`ApiClient("")`), так как браузер обращается к тому же origin (Vite), а прокси пересылает на backend.

---

## 3. Технологический стек

### 3.1. Backend

| Компонент | Технология |
|-----------|------------|
| Язык | TypeScript |
| Runtime | Node.js |
| HTTP | Express 4 |
| ORM | Prisma 6 |
| СУБД | PostgreSQL |
| Валидация конфигурации и входных DTO | Zod |
| Хеширование пароля | bcryptjs |
| Токены доступа | JWT (`jsonwebtoken`) |
| Анализ дневника | Локальная эвристика **или** OpenAI-compatible Chat Completions API |
| Тесты | Vitest |

### 3.2. Frontend

| Компонент | Технология |
|-----------|------------|
| Язык | TypeScript |
| Сборка | Vite 6 |
| UI | React 18 |
| Маршрутизация | react-router-dom 7 |
| Карты | Leaflet + react-leaflet |
| Графики | Recharts |

### 3.3. Монорепозиторий

Корневой `package.json` объявляет **npm workspaces** (`backend`, `frontend`). Скрипты агрегируют запуск и сборку по workspace.

---

## 4. Модель данных и персистентность

### 4.1. Схема Prisma

Файл: `backend/prisma/schema.prisma`.

#### 4.1.1. `User` (таблица `users`)

- Идентификатор UUID.
- Уникальный `email`.
- `passwordHash` — bcrypt-хеш (маппинг колонки `password_hash`).
- Связи: множество `JournalEntry`, множество `SurveyAttempt`.

#### 4.1.2. `JournalEntry` (таблица `journal_entries`)

Хранит **сырой текст** и **результат автоматического разбора**:

| Поле | Смысл |
|------|--------|
| `content` | Текст записи |
| `sentimentScore` | Числовая оценка валентности (−1…1 в логике анализатора, затем нормализация) |
| `sentimentLabel` | Класс: positive / negative / neutral (производно от score) |
| `primaryEmotion` | Доминирующая эмоция (slug из ограниченного набора) |
| `primaryIntensity` | Интенсивность доминирующей эмоции (0…1) |
| `emotionProfile` | JSON: распределение интенсивностей по эмоциям |
| `problemLevel` | Индекс «проблемности» / дистресса (0…1) для UX и политики |
| `suggestPsychologist` | Флаг рекомендации очной поддержки |
| `adviceFromModel` | Текст совета от LLM или пусто при эвристике |
| `createdAt` | Временная метка |

Индекс `(userId, createdAt DESC)` оптимизирует выборку последних записей пользователя.

#### 4.1.3. `SurveyAttempt` (таблица `survey_attempts`)

- Привязка к пользователю и ключу опроса (`surveyKey`).
- `answers` — JSON-массив числовых ответов.
- `score` — агрегированный балл по правилам определения опроса.
- Индекс `(userId, surveyKey, createdAt DESC)` для истории.

#### 4.1.4. Кампус: `Building`, `BuildingFloor`, `CampusMarker`

- **Building:** человекочитаемое имя, уникальный `slug`, описание, памятка адреса (`addressNote`), приблизительные `lat`/`lng`, порядок сортировки.
- **BuildingFloor:** уровень (`levelIndex`), подпись этажа, опционально `planImageUrl` для схемы.
- **CampusMarker:** координаты, категория из перечисления Prisma `CampusMarkerCategory` (`QUIET`, `FOOD`, `STUDY`, `RELAX`, `SERVICE`, `OTHER`), опциональная привязка к зданию.

### 4.2. Инициализация данных (seed)

Файл `backend/prisma/seed.ts` создаёт/обновляет набор **корпусов ЛЭТИ** с заданным числом этажей и **искусственным расположением точек** на малом радиусе вокруг базовых координат (демонстрационная геометрия для карты). Маркеры кампуса в seed не массово наполняются — их наличие зависит от данных в БД.

---

## 5. Backend: конфигурация окружения

Файл `backend/src/config/env.ts` загружает `.env` через `dotenv` и валидирует переменные **Zod-схемой**.

### 5.1. Общие параметры

- `NODE_ENV`: development | test | production  
- `PORT`: порт HTTP (по умолчанию 4000)  
- `DATABASE_URL`: строка подключения PostgreSQL  
- `JWT_SECRET`: секрет подписи JWT (минимум 32 символа)  
- `CORS_ORIGIN`: разрешённый origin для браузера (по умолчанию `http://localhost:5173`)

### 5.2. Провайдер анализа дневника

- `SENTIMENT_PROVIDER`: **`heuristic`** | **`openai`**  
  - По умолчанию **`heuristic`** — без сетевых вызовов.
  - При **`openai`** ожидается совместимый с OpenAI эндпоинт **`POST /v1/chat/completions`** (частный сервер, LM Studio, vLLM и т.п.).
- `SENTIMENT_OPENAI_BASE_URL` — URL с суффиксом `/v1`.  
- `SENTIMENT_OPENAI_MODEL` — строковое имя модели на стороне провайдера (конкретика задаётся развёртыванием).  
- `SENTIMENT_OPENAI_API_KEY` — опционально (Bearer).

При `SENTIMENT_PROVIDER=openai` схема требует непустые `BASE_URL` и `MODEL`.

### 5.3. Политика журнала (жёсткие пороги для UX и триажа)

Файл `backend/src/config/journalPolicy.ts` конструирует объект `JournalPolicy` из env:

| Переменная | Роль |
|------------|------|
| `JOURNAL_PSYCHOLOGIST_LEVEL` | Если анализ даёт `problemLevel` ≥ порога — триггер рекомендации психолога (совместно с другими сигналами) |
| `JOURNAL_DISTRESS_STREAK_LEVEL` | Порог для серии «дистресса» по последним записям |
| `JOURNAL_SENTIMENT_STREAK_THRESHOLD` | Порог негативной валентности для серии «негативных» записей |
| `JOURNAL_SENTIMENT_STREAK_LEN` | Длина окна (число последних записей) для негативной серии |
| `JOURNAL_DISTRESS_STREAK_LEN` | Длина окна для серии дистресса |

Значения по умолчанию задаются в `env.ts`.

---

## 6. Backend: доменная модель анализа дневника

### 6.1. Набор эмоций

Файл `backend/src/domain/journal/emotions.ts`:

- Константа `PRIMARY_EMOTIONS`: фиксированный список slug-эмоций (`depression`, `anxiety`, `sadness`, `anger`, `joy`, `kindness_warmth`, `calm`, `apathy`, `shame_guilt`, `hope`, `overwhelm`, `loneliness`, `neutral`).
- Тип `PrimaryEmotion`.
- Функция `isPrimaryEmotion` для безопасной типизации.
- `EMOTION_LABEL_RU` — русскоязычные описания для интерфейса/отчётности.

Такой подход соответствует **структурированному самоотчёту по эмоциональным категориям** (упрощённая эмоциональная таксономия для приложения, не клинический опросник).

### 6.2. Результат анализа

Файл `backend/src/domain/journal/JournalAnalysisResult.ts`:

- `score` ∈ [−1, 1] — грубая валентность.  
- `label` — `{ positive, negative, neutral }` производится от score (`analysisNormalize.ts`).  
- `primaryEmotion`, `primaryIntensity`.  
- `emotionProfile` — частичное отображение эмоция → вес.  
- `problemLevel` ∈ [0, 1].  
- `suggestPsychologist` — булев флаг.  
- `adviceFromModel` — строка от LLM или пустая.

### 6.3. Нормализация

Файл `backend/src/domain/journal/analysisNormalize.ts`:

- Приведение score и problemLevel к допустимым интервалам.
- Вывод `label` по порогам `LABEL_POSITIVE_MIN` / `LABEL_NEGATIVE_MAX`.
- Нормализация профиля эмоций из произвольного JSON (от LLM): отбрасывание неизвестных ключей, clamp 0…1.
- `finalizeAnalysis` — единая точка финализации результата перед сохранением.

---

## 7. Backend: анализаторы настроения (инфраструктура)

Интерфейс: `backend/src/domain/services/ISentimentAnalyzer.ts` — метод `analyze(text)`.

Фабрика: `backend/src/infrastructure/sentiment/createSentimentAnalyzer.ts` выбирает реализацию по `SENTIMENT_PROVIDER`.

### 7.1. HeuristicSentimentAnalyzer

Файл: `backend/src/infrastructure/sentiment/HeuristicSentimentAnalyzer.ts`.

**Метод:** правило-ориентированное сопоставление текста с регулярными выражениями (русский лексикон). Для каждого срабатывания правила накапливается вес эмоции в профиле. Доминирующая эмоция — с максимальным весом; при отсутствии совпадений — `neutral`.

**Производные метрики:**

- `score` и `problemLevel` вычисляются эвристически из доминирующей эмоции и её веса (`scoreAndProblem`).
- Отдельно вызывается `textMayIndicateCrisis` из `application/safety/crisisLanguage.ts`; при срабатывании усиливаются депрессивная метка, problemLevel и рекомендация специалиста.

**Ограничения метода:** чувствительность к формулировкам, отсутствие семантического понимания контекста, риск ложных срабатываний/пропусков — типичные ограничения лексиконных методов в NLP.

### 7.2. OpenAiCompatibleJournalAnalyzer

Файл: `backend/src/infrastructure/sentiment/OpenAiCompatibleJournalAnalyzer.ts`.

**Метод:** один запрос к `POST {baseUrl}/chat/completions` с телом в формате OpenAI: `model`, `messages` (system + user), `temperature`, `max_tokens`.

System prompt задаётся константой `JOURNAL_LLM_SYSTEM_RU` в `backend/src/infrastructure/sentiment/llmJournalAnalysis.ts`: модель инструктируют вернуть **строго JSON** с полями score, label, primaryEmotion, emotionIntensity (профиль), problemLevel, suggestPsychologist, advice.

User prompt оборачивает текст пользователя (`buildJournalUserPrompt`), с обрезкой до 12 000 символов.

Ответ парсится функцией `journalAnalysisFromLlmRawText`: извлечение JSON из возможных markdown-ограждений, fallback на нейтральный безопасный результат при ошибке parse.

**Ограничения:** зависимость от доступности LLM, вариативность формата ответа (частично компенсируется очисткой и fallback), необходимость политики конфиденциальности при отправке текста третьей стороне.

---

## 8. Backend: безопасность и правила сопровождения дневника

### 8.1. Детекция кризисной лексики

Файл: `backend/src/application/safety/crisisLanguage.ts`.

Набор консервативных regex-паттернов по русскоязычным формулировкам суицидальных намерений и самоповреждения. Используется:

- в эвристическом анализаторе — для усиления метрик;
- в `JournalService` — для флага `psychologistSuggested` независимо от score модели.

### 8.2. Журнальный сервис сценария «создание записи»

Файл: `backend/src/application/services/JournalService.ts`.

**Алгоритм `addEntry(userId, content)`:**

1. Вызов `sentiment.analyze(content)` → объект анализа.
2. Вычисление `crisisLanguageDetected = textMayIndicateCrisis(content)`.
3. Вычисление `psychologistSuggested` как логическое ИЛИ:
   - обнаружена кризисная лексика,
   - или анализатор вернул `suggestPsychologist`,
   - или `problemLevel` ≥ `journalPolicy.psychologistProblemLevel`.
4. Сохранение записи в репозитории с полным набором полей анализа.
5. Загрузка последних N записей пользователя (N = max из длин серий для стриков).
6. Вычисление:
   - `negativeStreak` — функция `isNegativeStreak` (`application/rules/negativeStreak.ts`): последние `sentimentStreakLen` записей имеют `sentimentScore` ниже порога `sentimentStreakThreshold`;
   - `distressStreak` — `isDistressStreak`: последние `distressStreakLen` записей имеют `problemLevel` ≥ `distressStreakLevel`.
7. Формирование **`assistantMessage`** через `buildJournalAssistantMessage` (`application/rules/journalAssistant.ts`) с учётом контекста стриков и кризиса.

Ответ API при создании записи включает публичную запись, флаги серий и рекомендаций и текст ассистента.

### 8.3. Генерация сообщения ассистента

Файл: `backend/src/application/rules/journalAssistant.ts`.

Многоуровневая композиция текста:

1. При кризисной лексике — **жёсткий блок** с указанием экстренной помощи (скорая 112 и т.д.).
2. Основной блок: если от LLM есть непустой `adviceFromModel`, он используется; иначе — **шаблон по типу эмоции и уровню problemLevel** (`fallbackLine`).
3. При рекомендации психолога — дополнительный блок (вариант текста зависит от наличия кризисной лексики).
4. При серии дистресса (и отсутствии кризисной лексики) — блок про несколько тяжёлых записей подряд.
5. Иначе при негативной серии без дистресса — мягкая рекомендация дыхания / раздела самопомощи.

Это реализует **правило-ориентированное сопровождение** без обязательной генеративной модели.

---

## 9. Backend: аутентификация и авторизация

### 9.1. Регистрация и вход

Сервис: `backend/src/application/services/AuthService.ts`.

- Email нормализуется к нижнему регистру.
- Регистрация проверяет уникальность email; при конфликте — `ConflictError` (409).
- Пароль хешируется через `BcryptPasswordHasher` (`infrastructure/security/BcryptPasswordHasher.ts`).
- JWT подписывается `JwtTokenService` с полезной нагрузкой `{ sub: userId, email }`.

Вход при неверных учётных данных возвращает **единое сообщение** «Неверный email или пароль» (`UnauthorizedError`, 401) — базовая защита от перечисления аккаунтов.

### 9.2. HTTP endpoints авторизации

Маршруты: `backend/src/presentation/http/routes/authRoutes.ts`

| Метод | Путь | Защита | Действие |
|-------|------|--------|----------|
| POST | `/api/auth/register` | Нет | Создание пользователя, выдача JWT |
| POST | `/api/auth/login` | Нет | Проверка пароля, выдача JWT |
| GET | `/api/auth/me` | JWT | Профиль текущего пользователя |

Контроллер: `presentation/http/controllers/AuthController.ts`.  
Валидация тел: `application/dto/auth.schemas.ts` (email, пароль ≥ 8 символов при регистрации).

### 9.3. Middleware авторизации

Файл: `backend/src/presentation/http/middleware/authGuard.ts`.

Извлекает Bearer-токен, верифицирует через `ITokenService`, записывает `req.auth`. Расширение типов Express: `backend/src/types/express.d.ts`.

---

## 10. Backend: дневник (HTTP API)

Маршруты: `backend/src/presentation/http/routes/journalRoutes.ts` — **весь роутер под guard**.

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/journal/` | Создание записи |
| GET | `/api/journal/?limit=` | Список записей пользователя (limit 1…100, по умолчанию 30) |

Контроллер: `JournalController.ts`.  
Валидация: `application/dto/journal.schemas.ts` — контент непустой, максимум 16 000 символов.

Сервис уже описан в разделе 8.

Персистентность: `PrismaJournalRepository` (`infrastructure/persistence/PrismaJournalRepository.ts`).

---

## 11. Backend: опросники

### 11.1. Концепция

Опросники задаются **в коде** как объекты типа `SurveyDefinition` (`application/surveys/survey.types.ts`):

- ключ `key`, заголовок, описание;
- список вопросов с диапазоном целых ответов `[min, max]`;
- функция агрегирования `score(answers)`;
- функция **`interpret(score)`** — текст для пользователя с явным указанием в коде и UI, что это не диагноз.

Реестр: `application/surveys/surveyRegistry.ts` — экспорт каталога и получение определения по ключу (ошибка `NotFoundError` если ключ неизвестен).

Пример реализации шкалы: `application/surveys/wellbeingSurvey.ts` — «Краткая шкала самочувствия (5 вопросов)», шкала 0–3 по пунктам, суммарный балл, интерпретация по порогам суммы.

### 11.2. Валидация ответов

Файл: `application/surveys/validateAnswers.ts` — проверка длины массива, целочисленности и вхождения каждого ответа в допустимый интервал вопроса.

### 11.3. HTTP API опросников

Маршруты: `backend/src/presentation/http/routes/surveyRoutes.ts`.

Особенность порядка middleware:

- `GET /api/surveys/` — **каталог без авторизации** (список ключей и метаданных для главной страницы списка даже у гостя в текущей реализации frontend).
- Далее подключается **`router.use(guard)`**: все маршруты ниже требуют JWT:
  - `GET /api/surveys/:surveyKey/attempts` — история попыток пользователя по ключу;
  - `POST /api/surveys/:surveyKey/attempts` — сохранение новой попытки + интерпретация;
  - `GET /api/surveys/:surveyKey` — определение опроса (вопросы и метаданные).

Контроллер: `SurveyController.ts`.  
Сервис: `SurveyService.ts` — делегирует репозиторию `PrismaSurveyAttemptRepository`.

---

## 12. Backend: кампус

Сервис: `backend/src/application/services/CampusService.ts`.

Функции:

- `buildings()` — упорядоченный список зданий с числом этажей.
- `buildingBySlug(slug)` — детальная карточка + этажи (или 404).
- `markers(filter)` — точки на карте с фильтром по `buildingId` UUID и/или `category` из перечисления Prisma.

Контроллер: `CampusController.ts`. Запрос маркеров парсит query-параметры через Zod; категория приводится через `CampusService.parseCategory`.

Маршруты: `presentation/http/routes/campusRoutes.ts`:

| Метод | Путь |
|-------|------|
| GET | `/api/campus/markers` |
| GET | `/api/campus/buildings` |
| GET | `/api/campus/buildings/:slug` |

**Авторизация для кампуса не требуется** — публичный справочник.

Репозиторий: `PrismaCampusCatalogRepository.ts`.

---

## 13. Backend: обработка ошибок и коды ответов

Файл: `domain/errors/HttpError.ts` — иерархия ошибок с HTTP-кодом и строковым `code`:

- `ConflictError` — 409  
- `UnauthorizedError` — 401  
- `NotFoundError` — 404  
- `BadRequestError` — 400  

Глобальный обработчик `errorHandler.ts`:

- `ZodError` → 400, массив `issues` с путём и сообщением;
- `HttpError` → соответствующий статус и `code`;
- иное → 500 с текстом сообщения (в production обычно дополнительно маскируют детали — в текущем коде сообщение ошибки может пробрасываться клиенту).

---

## 14. Backend: точка входа и жизненный цикл процесса

Файл: `backend/src/server.ts`:

- создаётся контекст приложения `createApplicationContext()`;
- слушается `PORT` из env;
- обработка `SIGINT` / `SIGTERM`: закрытие HTTP-сервера и `prisma.$disconnect()`.

---

## 15. Frontend: общая структура

### 15.1. Точка входа и маршрутизация

- `frontend/src/main.tsx` — монтирование React в `#root`, `StrictMode`, `BrowserRouter`.
- `frontend/src/App.tsx` — провайдер `AuthProvider`, шапка навигации (`top-nav`), вложенные маршруты:

| Путь | Компонент страницы |
|------|-------------------|
| `/` | `HomePage` |
| `/login`, `/register` | `LoginPage`, `RegisterPage` |
| `/journal` | `JournalPage` |
| `/surveys`, `/surveys/:key` | `SurveysListPage`, `SurveyPage` |
| `/campus`, `/campus/:slug` | `CampusPage`, `CampusBuildingPage` |
| `/help`, `/help/:slug` | `SelfHelpHub`, `SelfHelpTopicPage` |
| `*` | редирект на `/` |

Глобальные стили: `frontend/src/index.css` (дизайн-токены CSS-переменными, компонентные классы: `.card`, `.btn`, `.callout`, `.survey-row`, сетка кампуса).

### 15.2. Взаимодействие с API

Класс `frontend/src/api/ApiClient.ts`:

- хранение JWT в `localStorage` под ключом `wellness_token`;
- автоматическая подстановка заголовка `Authorization: Bearer …` при наличии токена;
- методы `getJson` / `postJson`;
- класс ошибки `ApiError` с полями status, code, issues.

Специализированные сервисы:

- `AuthApiService.ts` — login, register, me  
- `JournalApiService.ts` — create, list  
- `SurveyApiService.ts` — catalog, definition, history, submit  
- `CampusApiService.ts` — buildings, markers, building by slug  

### 15.3. Состояние авторизации

`frontend/src/auth/AuthContext.tsx`:

- при монтировании синхронизирует token accessor с `localStorage`;
- если токен есть — запрос `GET /api/auth/me`; при ошибке — logout;
- методы `login`, `register` сохраняют токен и пользователя в состоянии.

### 15.4. Страница главная / личный кабинет

Файл: `frontend/src/pages/HomePage.tsx`.

- **Гость:** описание продукта, дисклеймер, CTA входа/регистрации, ссылки на самопомощь, кампус и список опросников с пояснением про сохранение результатов после входа.
- **Авторизованный пользователь:** дисклеймер, быстрые действия (дневник, опросники, самопомощь, кампус), блок последних записей дневника (превью текста, эмоция, проблемность), блок опросников с последним баллом и датой по каждому ключу из каталога.

### 15.5. Дневник

`frontend/src/pages/JournalPage.tsx`:

- без токена — предложение войти;
- форма текстовой записи, отправка POST `/api/journal`;
- отображение `assistantMessage` и визуальное выделение при предупреждающих флагах;
- список последних записей с русскими подписями эмоций из `journal/emotionLabels.ts`.

### 15.6. Опросники

- `SurveysListPage.tsx` — загрузка каталога GET `/api/surveys`.
- `SurveyPage.tsx` — при отсутствии токена сообщение о необходимости входа для прохождения и графика; при наличии токена — загрузка определения и истории, форма radio-по шкале, отправка результата, отображение интерпретации и линейного графика динамики по месяцам (`surveys/monthlyAvg.ts`, `surveys/ScoreLineChart.tsx` через Recharts).

### 15.7. Самопомощь

Контент централизован в `frontend/src/selfhelp/topics.ts`: массив тем со slug, заголовком, секциями и общим дисклеймером.

Страницы хаба и темы рендерят Markdown-подобную структуру через JSX (не MDX).

### 15.8. Кампус

- `CampusPage.tsx` — фильтры по зданию и категории маркера; карта Leaflet с тайлами OSM; список точек; исправление путей к дефолтным иконкам Leaflet для Vite ESM.
- `CampusBuildingPage.tsx` — загрузка корпуса по slug, список этажей, опциональная ссылка на `planImageUrl`.

### 15.9. Прочие страницы

- `LoginPage.tsx`, `RegisterPage.tsx` — формы, вызов контекста auth, редирект после успеха.
- Файл `frontend/src/pages/HelpPage.tsx` в текущем роутинге **не подключён** к маршрутам приложения (при необходимости его следует удалить или включить в `App.tsx` во избежание расхождения версий контента).

---

## 16. Нефункциональные свойства и ограничения текущей версии

### 16.1. Безопасность

- JWT хранится в **localStorage** на клиенте — простая схема для MVP; для production часто рассматривают httpOnly cookies и защиту от XSS.
- Отсутствует встроенный rate limiting на auth endpoints в коде (рекомендуется на уровне reverse proxy).
- CORS настроен на один origin из env.

### 16.2. Масштабируемость и операции

- Один процесс Node, один экземпляр приложения в типичном dev-сценарии.
- LLM-режим добавляет внешнюю зависимость и задержку.

### 16.3. Научная и методическая валидность

- Эвристический анализ не проходил внешнюю валидацию на корпусе данных.
- Опросник `wellbeing_5` является **упрощённой авторской шкалой**, заявленной в коде как инструмент самонаблюдения, а не стандартизированный психометрический тест.

---

## 17. Тестирование

В backend расположены модульные тесты Vitest, например:

- `infrastructure/sentiment/OpenAiCompatibleJournalAnalyzer.test.ts`
- `infrastructure/sentiment/llmJournalAnalysis.test.ts`
- `application/rules/distressStreak.test.ts`, `negativeStreak.test.ts`
- `application/services/AuthService.test.ts`
- `application/surveys/validateAnswers.test.ts`

Запуск из корня: `npm test` (workspace backend).

Frontend автотестами в репозитории не покрыт.

---

## 18. Индекс ключевых файлов (справочник разработчика)

### Backend

| Область | Путь |
|---------|------|
| Запуск HTTP | `src/server.ts` |
| DI | `src/composition/bootstrap.ts`, `createHttpApp.ts` |
| Env | `src/config/env.ts`, `src/config/journalPolicy.ts` |
| Дневник | `src/application/services/JournalService.ts` |
| Правила UX | `src/application/rules/journalAssistant.ts`, `negativeStreak.ts`, `distressStreak.ts` |
| Кризис | `src/application/safety/crisisLanguage.ts` |
| Эвристика | `src/infrastructure/sentiment/HeuristicSentimentAnalyzer.ts` |
| LLM | `src/infrastructure/sentiment/OpenAiCompatibleJournalAnalyzer.ts`, `llmJournalAnalysis.ts` |
| Опросы | `src/application/surveys/*`, `SurveyService.ts` |
| Кампус | `CampusService.ts`, `PrismaCampusCatalogRepository.ts` |
| Auth | `AuthService.ts`, `authRoutes.ts`, `JwtTokenService.ts` |
| Ошибки | `src/domain/errors/HttpError.ts`, `errorHandler.ts` |
| Схема БД | `prisma/schema.prisma`, `prisma/seed.ts` |

### Frontend

| Область | Путь |
|---------|------|
| Роутинг и оболочка | `src/App.tsx`, `src/main.tsx` |
| Авторизация | `src/auth/AuthContext.tsx` |
| HTTP | `src/api/ApiClient.ts`, `*ApiService.ts` |
| Страницы | `src/pages/*.tsx` |
| Самопомощь | `src/selfhelp/topics.ts` |
| Карта | `src/pages/CampusPage.tsx` |
| Стили | `src/index.css` |
| Прокси dev | `vite.config.ts` |

---

## 19. Заключение

Проект представляет собой **интегрированную MVP-платформу** для поддержки студентов: **журнал самонаблюдения с автоматическим разбором текста**, **модуль опросных шкал**, **психообразовательный контент** и **геопривязанный справочник кампуса**, реализованные с разделением слоёв на backend и SPA на frontend. Архитектурно заложена возможность замены метода анализа дневника с **лексиконной эвристики** на **LLM в формате OpenAI-compatible API** без изменения контракта доменного интерфейса `ISentimentAnalyzer`.

Дальнейшее развитие (за рамками данного документа как спецификации) логично направить на расширение батареи опросников, улучшение данных кампуса, усиление безопасности и приватности (cookies, политика хранения), а также на пользовательские исследования полезности текстов сопровождения и порогов политики журнала.

---

*Документ сгенерирован по состоянию кодовой базы репозитория и отражает реализованное поведение системы; при изменении кода следует актуализировать соответствующие разделы.*
