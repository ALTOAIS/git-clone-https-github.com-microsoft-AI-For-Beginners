# English Flow — Personal AI English Coach

Персональный ИИ-тренер английского языка для ежедневной практики.
Первый пользователь — Мирас, русскоязычный комплаенс-специалист из Казахстана
(уровень ≈ A2, цель — уверенный B1/B2 и активная разговорная речь).

Главный принцип продукта: **перевод → фраза → своё предложение → говорение → повторение**.
Главный KPI: пользователь говорит по-английски каждый день, даже если у него есть только 2–5 минут.

## Что реализовано (MVP)

| Модуль | Описание |
| --- | --- |
| Онбординг | 7 шагов: цели, самооценка навыков, методы, время в день, интересы, диагностика |
| Диагностический тест | Закрытые секции (словарь, грамматика, чтение, аудирование через TTS) — детерминированная оценка; письмо и говорение — ИИ-оценка; профиль CEFR по 6 навыкам |
| «Сегодня» | Дневной план (повторение → урок → диалог → ошибки), режим «У меня только 3 минуты», фраза дня, стрик |
| Урок | 7 этапов: разминка → новые фразы → перевод → своё предложение (ИИ-корректор) → говорение (STT) → мини-диалог → итоги |
| Тренажёр перевода | Слова / фразы / предложения / профессиональный / голосовой перевод / мои ошибки; семантическая ИИ-оценка, а не сравнение строк |
| Библиотека фраз | Карточки с переводом, транскрипцией, примером, источником, статусом; фильтры и категории; стартовый набор из 31 фразы под Мираса |
| Интервальное повторение | Интервалы 1-3-7-14-30-60-90 дней, оценка «Не помню … Очень легко», смешанные задания; освоить фразу пассивным узнаванием нельзя — только активной продукцией |
| Разговор с ИИ | 17 сценариев в 9 режимах (повседневные + комплаенс/работа), живой транскрипт, подсказки на русском, разбор после диалога, сохранение фраз, честная статистика |
| Реестр ошибок | Типизация (артикли, времена, порядок слов…), статусы NEW→PRACTICING→IMPROVING→RESOLVED, упражнения «исправь предложение», повторные ошибки всплывают чаще |
| Прогресс | Уровень, навыки, точность повторений, минуты говорения, практические достижения, ежемесячные голосовые срезы |
| Генератор уроков | Тема/уровень/длительность/фокус; предпросмотр черновика, правка, сохранение, запуск, удаление |
| Материалы | Загрузка PDF/DOCX/TXT и вставка текста; извлечение фраз, упрощение текста, урок из документа; предупреждение о внешней ИИ-обработке; полное удаление |
| PWA / офлайн | Установка на Android/десктоп, офлайн-просмотр кэшированных данных, офлайн-очередь ответов повторения с синхронизацией |
| Голос | Web Speech API: TTS (озвучка фраз и реплик ИИ) и STT (распознавание английской речи) — работает в Chrome, включая Android |

## Архитектура

```
english-flow/
├── backend/    NestJS 10 + Prisma 6 + PostgreSQL 16, JWT-аутентификация
│   └── src/modules/
│       ├── ai/            слой ИИ: 10 ролей-промптов, LLM-клиент, дев-фолбэки
│       ├── content/       сидовый контент: фразы, 7-дневный план, диагностика, сценарии
│       ├── auth, users, phrases, reviews, lessons, plans,
│       ├── diagnostics, conversations, errors, progress, materials
├── frontend/   React 19 + TypeScript + Vite 7 + Tailwind 4 + PWA
│   └── src/
│       ├── api/       клиент и типы
│       ├── i18n/      русский интерфейс (архитектура готова к kk)
│       ├── lib/       голос (Web Speech API), офлайн-очередь
│       ├── layout/    сайдбар (десктоп) + нижняя навигация (мобайл)
│       └── pages/     15 экранов
└── docker-compose.yml
```

### Слой ИИ

Отдельные системные промпты для 10 ролей (раздел 17 PRD): оценщик диагностики,
оценщик переводов, корректор грамматики, генератор уроков, разговорный партнёр,
оценщик разговора, классификатор ошибок, экстрактор фраз, упрощатель текстов,
генератор плана. Все ответы — строгий JSON с серверной валидацией.

Провайдер выбирается через переменные окружения и **не зашит в код**:
поддерживаются OpenAI-совместимые endpoints и Anthropic Messages API.
Если ключ не задан или вызов упал — включается детерминированный дев-фолбэк,
и каждый такой ответ помечается `aiMode: "fallback"`, а интерфейс показывает
бейдж «Дев-режим ИИ». Фальшивых «ИИ-ответов» без пометки нет.

Распознавание и синтез речи выполняются в браузере (Web Speech API) —
ключи для этого не нужны; серверные STT/TTS-адаптеры можно добавить в слой ИИ позже.

### Проверка статуса ИИ через health endpoint

`GET /api/health` проверяет БД и возвращает режим работы ИИ **без раскрытия
секретов** (не выводятся API-ключ, base URL, provider, model, тексты ошибок).
`ai.configured=true` только когда одновременно заданы корректный `AI_PROVIDER`
(`openai`|`anthropic`|`anthropic-compatible`), `AI_API_KEY` и `AI_MODEL`.

Реальный ИИ подключён:

```json
{
  "status": "ok",
  "service": "english-flow-api",
  "time": "2026-07-14T05:41:22.880Z",
  "ai": { "configured": true, "mode": "llm" }
}
```

Дев-фолбэк (переменные ИИ не заданы или заданы не полностью):

```json
{
  "status": "ok",
  "service": "english-flow-api",
  "time": "2026-07-14T05:41:22.880Z",
  "ai": { "configured": false, "mode": "fallback" }
}
```

Provider и model в публичный ответ намеренно не попадают — их видно только
в серверных логах при старте (`LlmClient`).

## Переменные окружения (backend/.env)

| Переменная | Обязательна | Описание |
| --- | --- | --- |
| `DATABASE_URL` | да | PostgreSQL, например `postgresql://ef:ef_password@localhost:5432/english_flow?schema=public` |
| `DIRECT_URL` | да (если БД за pooler'ом, напр. Neon) | Прямое подключение без PgBouncer — нужно только для `prisma migrate deploy`; см. раздел «Деплой на Render» |
| `JWT_ACCESS_SECRET` | да (prod) | секрет подписи JWT |
| `JWT_ACCESS_EXPIRES_IN` | нет | срок жизни токена, по умолчанию `30d` |
| `PORT` | нет | по умолчанию `3001` |
| `CORS_ORIGIN` | нет | origin фронтенда, по умолчанию `http://localhost:5175`; `*` — разрешить все |
| `AI_PROVIDER` | нет | `mock` (по умолчанию) \| `openai` \| `anthropic` \| `anthropic-compatible` |
| `AI_API_KEY`, `AI_MODEL` | для реального ИИ | ключ и модель провайдера |
| `AI_BASE_URL` | нет | кастомный endpoint (для anthropic-compatible / self-hosted) |
| `AI_TEMPERATURE`, `AI_MAX_TOKENS`, `AI_TIMEOUT_MS` | нет | параметры вызова |
| `SEED_DEMO_USER`, `SEED_DEMO_PASSWORD` | нет | `true` — создать демо-пользователя `miras@englishflow.local` |

Фронтенд: `VITE_API_URL` — адрес API (по умолчанию `/api`, в dev проксируется на `:3001`).

## Локальный запуск

Требуются Node.js 22 и PostgreSQL 16.

```bash
# 1. База данных
createdb english_flow            # или через docker: см. docker-compose.yml

# 2. Backend
cd english-flow/backend
cp .env.example .env             # заполните DATABASE_URL
npm install
npm run prisma:migrate           # применить миграции (dev)
npm run prisma:seed              # стартовые фразы + 7-дневный план
npm run start:dev                # http://localhost:3001/api

# 3. Frontend
cd ../frontend
npm install
npm run dev                      # http://localhost:5175 (проксирует /api на :3001)
```

Проверки качества:

```bash
cd backend  && npm run typecheck && npm run lint:check && npm run build
cd frontend && npm run typecheck && npm run lint && npm run build
```

## Миграции БД

- новая миграция в разработке: `npm run prisma:migrate -- --name <name>`
- применить в продакшене: `npm run prisma:deploy` — выполняется автоматически
  при старте контейнера (`CMD` в `Dockerfile` и `command:` в `docker-compose.yml`
  — одна и та же цепочка `migrate deploy && seed && start`). `preDeployCommand`
  Render'а НЕ используется — эта функция доступна только на платных планах,
  а `english-flow-api` на free (см. раздел «Render (Blueprint)» ниже).
- сиды идемпотентны: повторный запуск не создаёт дублей.

## Продакшен-сборка

### Docker (рекомендуется)

```bash
cd english-flow
AI_PROVIDER=anthropic AI_API_KEY=sk-... AI_MODEL=claude-sonnet-5 docker compose up --build
# фронтенд: http://localhost:8085, API: http://localhost:3001/api
```

Образ бэкенда сам применяет миграции и сиды при старте.
Nginx фронтенда проксирует `/api` на бэкенд, поэтому PWA работает с одного origin.

### Вручную

```bash
cd backend  && npm ci && npx prisma generate && npm run build && npx tsc -p tsconfig.seed.json
DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy && node dist-seed/prisma/seed.js && node dist/main
cd frontend && npm ci && VITE_API_URL=https://api.example.com/api npm run build   # → dist/
```

### Render (Blueprint)

English Flow разворачивается отдельным Blueprint — файл **`english-flow/render.yaml`**
(корневой `render.yaml` относится к Compliance Risk Hub и этим не затрагивается).
Blueprint создаёт два сервиса; база данных в Render НЕ создаётся:

- `english-flow-api` — backend (Docker, NestJS), health check `/api/health`,
  `JWT_ACCESS_SECRET` генерируется Render'ом, `AI_PROVIDER` — `sync: false`
  (задаётся вручную в дашборде, по умолчанию до первого задания — дев-фолбэк);
- `english-flow` — frontend (static, Vite/PWA, SPA-rewrite `/* → /index.html`).

**Важно про `AI_PROVIDER`/`AI_API_KEY`/`AI_MODEL`:** это ручные переменные
дашборда (`AI_PROVIDER` помечен `sync: false` в blueprint, `AI_API_KEY` и
`AI_MODEL` в `render.yaml` вообще не описаны). Любой ключ, у которого в
`render.yaml` стоит фиксированный `value: ...` (а не `sync: false`),
Render **переприменяет при каждом Blueprint-синке** — а синк триггерится
любым пушем, меняющим `render.yaml`. Если когда-нибудь понадобится
добавить в blueprint ключ, значение которого уже задано вручную в
дашборде, используйте `sync: false`, а не `value:` — иначе следующий же
пуш с правкой `render.yaml` молча затрёт ручное значение.

**База данных — внешняя PostgreSQL.** Бесплатный слот Postgres в Render занят
базой CRH, поэтому создайте изолированную базу у внешнего провайдера
(Neon / Supabase / Railway — у всех есть бесплатный тариф) и возьмите строку
подключения вида `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`.

Порядок:

1. Создайте базу у внешнего провайдера, скопируйте connection string.
2. Render Dashboard → **New +** → **Blueprint** → выбрать репозиторий и ветку
   `claude/english-flow-mvp-edrtv0`, файл `english-flow/render.yaml` → **Apply**.
3. Render запросит значения `DATABASE_URL` и `DIRECT_URL` (в blueprint они
   помечены `sync: false` и в репозитории не хранятся):
   - `DATABASE_URL` — обычная (у Neon — **pooled**, host с `-pooler`) строка
     подключения, используется приложением во время работы.
   - `DIRECT_URL` — **прямое** подключение без pooler'а (у Neon: в Connection
     Details выключите тумблер «Pooled connection»). Используется только для
     `prisma migrate deploy` — `migrate deploy` берёт postgres advisory lock,
     который не работает через PgBouncer и без `DIRECT_URL` падает с `P1002`
     (таймаут). Если ваш провайдер БД не использует pooler, укажите то же
     значение, что и в `DATABASE_URL`.
   Миграции и сиды выполняются через `CMD` образа при старте контейнера
   (`migrate deploy && seed && start`). `preDeployCommand` Render'а НЕ
   используется — он доступен только на платных планах (paid web services),
   а этот сервис на free-плане; на free Render молча игнорирует это поле и
   идёт сразу build → CMD. **Следствие:** не запускайте два деплоя подряд
   (например, git push сразу вслед за ручным Manual Deploy) — оба контейнера
   могут запустить `migrate deploy` почти одновременно и столкнуться за один
   и тот же postgres advisory lock (`P1002`). Дожидайтесь завершения одного
   деплоя перед следующим.
4. После деплоя бэкенда пропишите его URL в `VITE_API_URL` фронтенда
   (Manual Deploy — Vite читает переменную на этапе сборки).
5. URL фронтенда пропишите в `CORS_ORIGIN` бэкенда вместо `*`.

## Установка как PWA (Android)

Откройте сайт в Chrome → меню → «Добавить на главный экран».
Офлайн доступны: открытие приложения, библиотека фраз, очередь повторения,
дневной план; ответы повторения сохраняются локально и синхронизируются
при появлении сети. Разговор с ИИ и распознавание речи требуют интернет.

## Известные ограничения MVP

- **Google-вход не реализован** — только email + пароль (JWT на 30 дней, без refresh-ротации).
- **Push-уведомления не отправляются** — настройки напоминаний сохраняются, доставка появится в следующей фазе.
- **STT/TTS зависят от браузера**: распознавание речи работает в Chrome (десктоп/Android); в Firefox/iOS Safari предлагается текстовый ввод.
- **Анализ произношения не выполняется** — приложение сознательно не показывает фальшивые метрики произношения; сравнивается только текст распознанной речи.
- **Мини-диалог внутри урока** идёт по фиксированной канве вопросов урока; полноценный адаптивный ИИ-диалог — в разделе «Разговор».
- **Аудио голосовых срезов** хранится как data-URL в БД (до ~2 МБ); объектное хранилище (S3) — следующая фаза.
- **Листенинг в диагностике** озвучивается браузерным TTS, а не записанными дикторами.
- **Дев-фолбэк без ИИ-ключа** оценивает переводы по совпадению токенов и не находит грамматических ошибок — для полноценного обучения нужен реальный провайдер.
- Казахская локализация подготовлена архитектурно (i18n-ресурсы), но не переведена.

## Roadmap

Единственный source of truth по фазам продукта — этот раздел. Отдельного
`ROADMAP.md`/`docs/roadmap.md` в репозитории нет и заводить его не нужно —
при обновлении планов редактируется этот файл.

Этот раздел прошёл точечный аудит (см. итог аудита в истории PR #35) —
поправки ниже отражают его результаты: более точные статусы отдельных
возможностей внутри Phase 0/1, исправленный AI-backlog, новая
последовательность фаз (Phase 3 «Core Skills Engine» перед
Literature/IELTS), отдельный раздел сквозных workstream'ов, метрики и
risk register уровня roadmap.

**Статусы фаз:** `DONE` — весь заявленный объём фазы закрыт и подтверждён
· `IN PROGRESS` — часть объёма сделана, часть в работе · `PLANNED / NOT
STARTED` — только описано, ни строчки кода/схемы/сида не создано.

**Статусы отдельных возможностей внутри фазы** (более точная гранулярность,
чем статус всей фазы — используется в таблицах Phase 0/1 ниже):
`DONE` — пользовательский flow реализован и работает · `PARTIAL` — flow
существует, но отсутствует часть качества, покрытия или адаптивности ·
`LIMITED` — осознанное ограничение текущей реализации (не забытая
недоделка, а сознательный trade-off, обычно задокументированный в
«Известные ограничения MVP» выше) · `NOT STARTED` — реализации нет.

Существование отдельного seed-файла, AI-промпта или одной вспомогательной
функции **не** считается основанием отметить возможность как `DONE` —
статус повышается только когда пользовательский flow реально работает и
проверен (тесты + typecheck + lint + build, где применимо).

---

### Phase 0 — MVP — Status: `DONE`

MVP как целостный scope завершён — см. таблицу «Что реализовано (MVP)»
выше. Отдельные ограничения внутри завершённого MVP не понижают статус
всей фазы; ниже — гранулярные статусы конкретных возможностей, чтобы
Phase 2+ ссылались на них точно, а не на общее «MVP готов».

| Возможность | Статус | Пояснение |
| --- | --- | --- |
| Onboarding | `DONE` | 7 шагов, данные сохраняются и используются (`currentLevel` → генератор уроков, `onboardingCompleted` → роутинг) |
| Daily plan («Сегодня») | `DONE` | Детерминированная сборка задач по due-повторениям/ошибкам, busy-режим |
| Phrase trainer (тренажёр перевода) | `DONE` | Семантическая ИИ-оценка, не сравнение строк |
| Phrase SRS (интервальное повторение) | `DONE` | Интервалы 1-3-7-14-30-60-90 дней, только активная продукция |
| Errors daily practice / SRS | `DONE` | Source context, language gate, дневная сессия, MASTERED-гейтинг — самый тестируемый модуль проекта |
| Daily Achievement Summary | `DONE` | Дневная сводка достижений на основе реальной активности |
| Micro-lessons (adaptive) | `DONE` | Пороговая генерация по реальным ошибкам пользователя, есть тест |
| Diagnostics — core flow | `DONE` | Закрытые секции (словарь/грамматика/чтение/аудирование) — детерминированная оценка |
| Diagnostics — AI calibration / production validation | `PARTIAL` | Письмо и говорение оцениваются ИИ; без реального ключа работает дев-фолбэк с более грубой точностью — это не отдельный баг, а прямое следствие AI backlog ниже |
| Lessons — core flow | `DONE` | Проигрыватель, генератор, попытки, оценка предложения — реально работают |
| Lessons — adaptive mini-dialogue | `LIMITED` / `PARTIAL` | Мини-диалог внутри урока идёт по фиксированной канве вопросов — осознанное ограничение (полноценный адаптивный диалог есть отдельно, в разделе «Разговор») |
| Speaking — text conversation engine | `DONE` | 17 сценариев/9 режимов, живой транскрипт, разбор после диалога, сохранение фраз |
| Speaking — pronunciation assessment | `NOT STARTED` | Осознанно не реализовано — сравнивается только текст распознанной речи, README прямо об этом предупреждает |
| Voice — browser Web Speech STT/TTS | `DONE` / `LIMITED` | Работает в Chrome (десктоп/Android); в Firefox/iOS Safari — текстовый fallback. Это ограничение браузерной поддержки, не пробел реализации |
| Voice — server STT/TTS | `NOT STARTED` | Нет серверных адаптеров (Whisper/нейро-TTS) — см. AI backlog в Phase 1 |
| Personalization — by current CEFR | `DONE` | `currentLevel`/`SkillProfile` реально влияют на генератор уроков |
| Personalization — by interests/goals/professional domain | `PARTIAL` | `goals`/`preferredTopics`/`preferredLearningMethods` собираются при онбординге, но `buildTasks()` (сборка дневного плана) их не читает, а 7-дневный план (`content/week-plan.ts`) — статический хардкод тем. Данные есть, использование — нет |
| CEFR — per-item tagging / retrieval | `NOT STARTED` | CEFR есть только на уровне пользователя и урока; на отдельных фразах/правилах/текстах — нет (появится в Phase 2) |
| Reading engine | `NOT STARTED` | `materials`-модуль — это загрузка пользователем своих файлов, не курируемая библиотека с CEFR/lexical coverage |
| Listening engine | `NOT STARTED` | Существует только как навык в `SkillProfile` и как браузерный TTS в диагностике — не отдельный модуль |
| Shadowing engine | `NOT STARTED` | Не реализовано нигде |
| Writing engine | `NOT STARTED` | Writing оценивается только внутри диагностики (разовая ИИ-оценка), отдельного тренировочного модуля нет |

---

### Phase 1 — Stabilization, Trust & Production Foundations — Status: `IN PROGRESS`

Цель фазы: довести до продакшен-надёжности то, что уже выпущено, закрыть
операционные и доверительные пробелы (мониторинг, приватность, честная
AI-калибровка), прежде чем расширять контент или добавлять новые крупные
направления (Phase 2+). Phase 0 завершён; Phase 1 продолжается — это не
противоречие: «стабилизирован» относится к уже выпущенному MVP-объёму,
а не к тому, что вся стабилизационная работа закончена.

**Уже сделано в рамках Phase 1:**
- **Реестр ошибок / SRS для ошибок — `DONE`.** Редизайн (source context,
  детерминированный language gate, ежедневная сессия практики на 3 задания,
  интервальное повторение, MASTERED-гейтинг), UX-доработки (раздельные
  «Проверить»/«Завершить», честная tri-bucket статистика, отложенный skip)
  и production-хотфикс (пустая дневная сессия при активных `NEW`-записях,
  исключение повреждённых legacy-записей, унификация карточки контекста,
  ручное подтверждённое удаление) — смержено (PR #33, PR #34).
- **Daily Achievement Summary + adaptive micro-lessons — `DONE`.** Дневная
  сводка достижений и адаптивные микро-уроки на основе ошибок пользователя.
  ⚠️ Термин «micro-lessons» здесь означает уже реализованный adaptive-recap
  механизм (`progress`/`micro-lessons` backend-модуль) — **не** путать с
  будущей Grammar Knowledge Base (Phase 2): сейчас объяснения правил
  берутся из точечного набора `CATEGORY_RULE_DETAILS`/
  `CATEGORY_ADDITIONAL_EXAMPLE` (`backend/src/modules/errors/context-examples.ts`,
  12 микрокатегорий) — это не структурированная база знаний, а
  захардкоженный fallback-контент для карточки «Не понял объяснение».
  Будущее качественное обновление Errors/MicroLessons будет использовать
  Grammar Knowledge Base как источник — это не блокирующая зависимость в
  обратную сторону: Errors/MicroLessons уже `DONE` и работают на своём
  текущем контенте сегодня.

#### AI production backlog

Раньше этот пункт был одной строкой «подключить продакшен-ключ ИИ» со
статусом `NOT STARTED` — это было неточно. Часть работы уже сделана и
проверяема в коде (`backend/src/modules/ai/llm.client.ts`):

| Возможность | Статус | Доказательство |
| --- | --- | --- |
| Anthropic production provider connected | `DONE` | Провайдер выбирается через `AI_PROVIDER`/`AI_API_KEY`/`AI_MODEL`, не зашит в код; `GET /api/health` отражает реальный режим (`ai.configured`/`mode`) |
| Transient retry/backoff (429/502/503/504/529, network/timeout) | `DONE` | `RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504, 529])` в `llm.client.ts`, экспоненциальный backoff с `retryAfterMs`/jitter, таймаут через `AbortController` |
| Fallback metadata and UI distinction | `DONE` | Каждый фолбэк-ответ помечается `aiMode: "fallback"`, интерфейс показывает бейдж «Дев-режим ИИ» — фальшивых ИИ-ответов без пометки нет |
| Production validation всех AI use cases/ролей | `PARTIAL` | 10 ролей-промптов реализованы и покрыты dev-режимом тестов, но систематической проверки всех 10 ролей на реальных production-ответах (не дев-фолбэке) не проводилось |
| AI quality evaluation | `NOT STARTED` | Нет метрики «насколько хорош ответ ИИ» за пределами structured-output валидности |
| Prompt versioning | `NOT STARTED` | Промпты — статический код, без версии/истории изменений |
| Aggregated AI observability | `NOT STARTED` | Ретраи/фолбэки логируются точечно (`LlmClient`), но не агрегируются в дашборд |
| Latency/token/cost monitoring | `NOT STARTED` | Нет |
| Caching | `NOT STARTED` | Нет |

Дев-фолбэк — это механизм отказоустойчивости (продукт не падает и не
врёт, когда ИИ недоступен), а **не** доказательство полноценного
качества ИИ-оценки: он оценивает переводы по совпадению токенов и не
находит грамматических ошибок (см. «Известные ограничения MVP» выше).
Эти два факта не противоречат друг другу и оба должны фиксироваться.

#### Стабилизационные задачи Phase 1 (расширено по итогам аудита)

Все — `PLANNED / NOT STARTED`, если не указано иное:

1. Production monitoring и агрегация ошибок (production-хотфикс PR #34
   показал, что баг долетел до пользователя незамеченным).
2. Агрегация AI fallback rate / error rate (сейчас логируется точечно, не
   агрегируется — см. AI backlog выше).
3. Privacy: удаление аккаунта и связанных пользовательских данных —
   сейчас `deletedAt` есть только на `UploadedMaterial`, не на
   `User`/`ErrorRecord`/`Conversation`/`VoiceAnswer`.
4. Diagnostics hardening — снизить зависимость точности writing/speaking
   оценки от AI production calibration (см. `PARTIAL` выше).
5. Welcome-back flow после длительного перерыва — сейчас `streakDays`
   просто обнуляется, повторного онбординга/пересборки плана нет.
6. Baseline adaptive level progression — сейчас `currentLevel`/
   `SkillProfile` меняются только вручную/повторной диагностикой, нет
   автоматического пересчёта по накопленным успехам.
7. Проверка использования onboarding interests/goals — зафиксировано
   аудитом, что данные собираются, но не используются (см. Phase 0
   таблицу); нужно решить, встраивать ли их в `buildTasks()`/недельный
   план, до начала Phase 2 персонализации контента.
8. Render Free cold-start и latency observability — известное
   архитектурное ограничение free-плана (см. «Render (Blueprint)» выше),
   сейчас не отслеживается количественно.
9. Web Push-уведомления (напоминание в выбранное время, фразы к повторению).
10. Серверные STT/TTS-адаптеры (Whisper + нейро-TTS) для браузеров без
    Web Speech API и более точных транскриптов.
11. Объектное хранилище для аудио и загруженных файлов.
12. Недельный отчёт (генератор плана уже есть в слое ИИ) и адаптация
    плана по ошибкам.
13. Казахская локализация интерфейса.

**Editorial/content tooling в Phase 1 намеренно не входит** — он относится
к Phase 2 §A, потому что нужен именно непосредственно перед публикацией
новой базы контента, а не как общая инфраструктурная задача заранее (см.
Phase 2 ниже и Risk register).

---

### Phase 2 — English Flow: Content & Pedagogy Engine — Status: `PLANNED / NOT STARTED`

Следующая итерация после стабилизации должна улучшить **качество
учебного содержания**, а не добавлять декоративные функции. Это
фаза-фундамент: Phase 3 (Core Skills Engine) не начинается на новом
контенте, пока здесь не закрыт обязательный MVP-объём (§A–§D) — см. карту
зависимостей в конце раздела.

**Принцип вертикальных срезов:** не строить сначала три большие базы
данных (Grammar/Phrase/Reading), а затем подключать их к продукту. Каждый
MVP-подэтап (§B/§C/§D) обязан закончиться работающим пользовательским
сценарием end-to-end, а не только заполненной таблицей.

#### Preliminary inventory

Ниже — **предварительная** сверка текущего состояния контента, сделанная
при формулировании этой фазы. Это не финальный аудит — полный аудит
(модель данных, retrieval-архитектура, риски, критерии приёмки) —
отдельный deliverable подэтапа §A, и до его завершения ничего в этой
таблице не считается окончательным.

| Область | Текущее состояние | Разрыв с целевым объёмом Phase 2 |
| --- | --- | --- |
| Phrase seeds | `content/seed-phrases.ts` — 43 фразы, без структурированных полей (collocations, sense, active/passive mastery, source/version) | Нужно 600–1000 элементов с полной схемой (§C), MVP-итерация — 100–150 (§C) |
| Lesson seeds | `content/lesson-content.ts` + генератор уроков через ИИ — контент создаётся на лету, не версионируется, без review-статуса | Нужна модель версионирования/review-статуса (§A) |
| AI prompts | 10 системных промптов-ролей (слой ИИ, раздел 17 PRD) — сами по себе рабочие, но грамматика/примеры каждый раз изобретаются ИИ заново | AI должен получать проверенный контент из базы, не изобретать (см. «AI role & constraints» ниже) |
| Grammar explanations | `errors/context-examples.ts` — `CATEGORY_RULE_DETAILS`/`CATEGORY_ADDITIONAL_EXAMPLE`/`buildHelpDetails` на 12 микрокатегорий, только RU, без CEFR/prerequisites/signal words/примеров по регистрам | Нужна база на 50–70 правил A1–B1 с полной схемой (§B), MVP-итерация — 10–15 (§B) |
| Text/material models | `materials`-модуль — загрузка PDF/DOCX/TXT пользователем, упрощение текста ИИ; нет курируемой библиотеки текстов с CEFR/lexical coverage/source-license | Нужна Reading-библиотека 60–100 текстов (§D), MVP-итерация — 10–15 (§D) |
| CEFR tagging | Есть на уровне пользователя (диагностика → 6-навыковый профиль) и урока (генератор уроков принимает level); нет per-item CEFR на фразах/правилах/текстах | CEFR должен быть на каждой единице контента (§B–§D) |
| Error categories | `errorType` (enum) + `microCategory` (12 значений, `micro-category.classifier.ts`) — рабочая типизация, но не связана с формальными rule code из Grammar KB | Grammar KB должна ссылаться на существующие `ErrorType`/`MicroCategory`, не создавать параллельную таксономию (§B) |
| Review scheduling | SRS для фраз (1-3-7-14-30-60-90 дней) и для ошибок (3-7-14-30 дней, раздельные реализации) — оба работают, но интервалы не связаны ни с одним из «evidence-based» методов явно | Формализовать как продуктовые правила (см. «Evidence-based methods» ниже) |

Ни прямых блокеров для проектирования Content & Pedagogy Engine, ни
готовых к использованию заготовок (кроме `microCategory`-типизации,
которая уже пригодна как FK-цель) предварительная сверка не выявила.
Полный аудит и модель данных — deliverable §A, не выполнены здесь.

#### Evidence-based methods (сквозной принцип Phase 2+)

Реализовать как продуктовые правила, не только описать: spaced practice,
retrieval practice, deliberate practice, immediate corrective feedback,
interleaving, task-based learning, extensive reading, shadowing,
production before perfection. Для каждого метода — где уже реализован
(полностью/частично), какие данные использует, какой алгоритм должен
измениться, как измеряется результат. Пример частичной реализации уже
сегодня: spaced practice и immediate corrective feedback — в SRS фраз и
ошибок (Phase 0); retrieval practice — в тренажёре перевода; shadowing —
не реализован нигде (контентный фундамент — §E, полноценный движок —
Phase 3).

#### AI role & constraints (применяется в §F retrieval integration)

AI должен: выбирать релевантный контент из базы, адаптировать
объяснение/примеры под пользователя, оценивать открытые ответы,
генерировать упражнения на основе реальных ошибок, адаптировать тексты
под уровень, проверять JSON и сохранять source IDs.

AI не должен: подменять собой базу контента, возвращать непроверенный
контент как факт, генерировать бесконечные дубли, использовать
защищённые тексты без прав, **возвращать verified rule/content source
ID, которого нет в базе** — это блокирующая серверная валидация, не
рекомендация.

#### Подэтапы Phase 2

Порядок: **A — обязателен первым и без него ничего не публикуется**. B и
C могут идти параллельно после A. D может начинаться после A, желательно
имея хотя бы часть B/C (для `targetGrammarRuleIds`/`targetPhraseIds`
текстов), но не обязан ждать их завершения. E — контентный фундамент,
не блокирует B/C/D. F интегрируется **внутри** каждого из B/C/D по мере
готовности, а не одним блоком в конце. G — отдельное решение после
production-валидации всех обязательных MVP-срезов (B/C/D) и минимального
quality/editorial pipeline (часть A) — не только после одного из
подэтапов.

**A. Architecture, governance and editorial foundation**
- Цель: до первого content seed определить и реализовать минимальный
  editorial/governance фундамент — без него B/C/D не могут начать
  публикацию контента безопасно.
- Зависимости: нет (первый подэтап).
- Deliverables: полный аудит контента и retrieval-архитектуры (Preliminary
  inventory выше — только черновик, здесь он должен быть завершён и
  формализован); предлагаемая Prisma-модель данных (`GrammarRule`,
  `PhraseEntry`/`UserPhraseProgress`, `ReadingContent`/`ReadingText` —
  имя финализируется здесь, не конфликтует с существующим
  `UploadedMaterial`); content statuses `draft`/`reviewed`/`published`/
  `archived`; `version`; `source`; `license` (где применимо); reviewer
  metadata; required-field validation; duplicate detection (normalize+lookup,
  по паттерну уже существующего `recordErrors()` в `errors.service.ts`);
  rollback/archive-стратегия (мягкий archive, не hard delete — контент
  может быть уже использован в прогрессе пользователей); preview/review
  путь; запрет обычному API отдавать `draft`-контент; минимальный
  editorial/admin workflow **или** безопасный CLI workflow (UI для
  редакторов не обязателен при небольшом объёме).
- Критерии приёмки: архитектурное решение утверждено; блокирующих
  вопросов нет; остальные вопросы зафиксированы как ADR/open issues, не
  оставлены неявными.
- Риски: недооценка объёма ручной редактуры (correctness правил и
  текстов — не задача, которую можно полностью делегировать ИИ).
- Вне scope: массовое наполнение контентом (это §B/§C/§D).
- Migration: да, если governance-поля (`status`/`version`/`source`/
  `license`/`reviewerId`) реализуются как часть общей базовой схемы для
  будущих моделей. Seed: нет.
- Затрагиваемые модули: документация/планирование + при необходимости
  минимальный admin/CLI-инструмент (новый, вне текущих модулей).

**B. Grammar vertical MVP**
- Цель: полный пользовательский flow `GrammarRule → ErrorRecord/
  MicroLesson → проверенное объяснение → упражнение → scheduled review →
  новый контекст → mastery metric` — не просто заполненная таблица правил.
- Scope первой итерации: **10–15 правил**, не 50–70. Целевой объём всей
  Phase 2 — 50–70 правил A1–B1 (см. Phase 2 §G Expansion).
- Категории с максимальной текущей ценностью для MVP: articles,
  third-person singular, Past Simple, Present Perfect, modal + base verb,
  prepositions, word order, countable/uncountable nouns.
- Зависимости: A.
- Deliverables: Prisma-модель `GrammarRule` — **с `review`/`source`/
  `version` полями уже в первой миграции**, не добавленными позже
  (`ruleCode, cefrLevel, titleRu, titleEn, explanationRu, pattern,
  usageConditions, signalWords[], prerequisites[], typicalMistakes[],
  examples, errorType, microCategory, exerciseTemplateIds[], source,
  reviewerId, version, status`); связь с `ErrorType`/`MicroCategory`;
  сид 10–15 правил; backend-эндпоинт получения правила по коду/категории;
  замена статического `context-examples.ts` на чтение из базы для
  карточки «Не понял объяснение» — **для выбранных 10–15 категорий**.
- Критерии приёмки: MVP не считается завершённым, пока хотя бы `errors` и
  `micro-lessons` реально не используют `GrammarRule` вместо
  `context-examples.ts` для этих категорий (не только «модель создана»);
  каждое правило проходит required-field validation (§A); существующие
  regression-тесты `errors`-модуля (даты/скип/язык) остаются зелёными.
- Риски: миграция с `CATEGORY_RULE_DETAILS` может незаметно изменить
  текст, который уже видели пользователи — нужна построчная сверка для
  переносимых микрокатегорий.
- Вне scope: оставшиеся ~35–55 правил до целевых 50–70 (см. §G).
- Migration: да. Seed: да (10–15 правил).
- Затрагиваемые модули: `backend/src/modules/errors` (rule lookup вместо
  статического объекта), `micro-lessons`/`progress` (adaptive recap
  читает из новой базы для покрытых категорий).

**C. Phrase vertical MVP**
- Цель: полный пользовательский flow `PhraseEntry → Lesson → active
  production → Review → Speaking/новый контекст → UserPhraseProgress`.
- Scope первой итерации: **100–150 Phrase Entries**. Целевой объём всей
  Phase 2 — 600–1000 (см. §G).
- Ключевое архитектурное решение: **разделить контент и прогресс**.
  `PhraseEntry` — общий проверенный контент (lemma, phrase, translation,
  CEFR level, sense, part of speech, pronunciation, collocations, example
  sentences, common errors, topic, content domain, source, version) —
  **без** active/passive mastery. `UserPhraseProgress` — пользовательское
  владение (passive familiarity, active recall, production success,
  review stage, next review, contexts passed, mastery status) — по
  аналогии с уже существующим разделением `Phrase`/`UserPhrase`, но с
  явным active/passive различием, которого сегодня физически нет.
- Зависимости: A (может идти параллельно с B).
- Deliverables (MVP-итерация): интеграция Phrase Library + Lessons +
  Reviews. Speaking usage tracking (структурная связь `PhraseEntry` ↔
  распознанное употребление в `Conversation.transcriptJson`) — **допускается
  как следующая итерация внутри этого slice**, не блокирует MVP.
  Расширенная Prisma-модель (`PhraseEntry`/`UserPhraseProgress`), миграция
  существующих 43 сидовых фраз без потери прогресса пользователя, первая
  партия 100–150 фраз по контентному балансу 40% everyday / 30%
  professional / 20% interests/hobbies / 10% literature/culture.
- Критерии приёмки: существующие 43 фразы и связанный прогресс
  (`UserPhrase.reviewStage`/`nextReviewAt`) валидны и не теряются при
  миграции; баланс тем на новой партии соответствует заданным процентам
  ±5 п.п.
- Риски: backfill старых фраз может потребовать ручной разметки полей,
  которых не было (sense, part of speech); ложный active mastery, если
  переход passive→active не проверяется в разных контекстах (см. Risk
  register).
- Вне scope: полный объём 600–1000 (§G); автоматическое обнаружение
  употребления фразы в свободной речи (следующая итерация).
- Migration: да. Seed: да (backfill + 100–150 новых).
- Затрагиваемые модули: `backend/src/modules/phrases`, `reviews` (SRS
  должен продолжать работать без разрыва прогресса), frontend библиотека
  фраз.

**D. Reading vertical MVP**
- Цель: полный пользовательский flow `ReadingContent → расчёт lexical
  coverage для конкретного пользователя → экран текста → glossary →
  comprehension questions → summary/speaking task → результат →
  сохранение выбранных PhraseEntry в SRS`. **API + сид без этого flow не
  считается пользовательским MVP.**
- Scope первой итерации: **10–15 текстов**. Целевой объём всей Phase 2 —
  60–100 (см. §G).
- Именование модели: **`ReadingContent`/`ReadingText`** — не `TextMaterial`,
  чтобы не создавать двусмысленность с уже существующим
  `UploadedMaterial` (загрузка пользователем своих файлов — другая сущность,
  другое назначение).
- Lexical coverage — **пользовательский расчёт, не хранимое поле**:
  `ReadingContent` хранит tokenized vocabulary profile текста,
  frequency/difficulty metadata, `targetPhraseIds[]`, `targetGrammarRuleIds[]`
  — сам coverage вычисляется на лету относительно словаря конкретного
  пользователя (пересечение с `UserPhraseProgress`), не записывается как
  статичное число в тексте.
- Зависимости: A; может начинаться сразу после A, но полноценные
  `targetPhraseIds`/`targetGrammarRuleIds` предполагают хотя бы частичную
  готовность B/C — не обязаны ждать их завершения целиком.
- Deliverables: Prisma-модель `ReadingContent` (CEFR, word count,
  tokenized vocabulary profile, target grammar/phrases, topic, source,
  license, review status), алгоритм расчёта lexical coverage per-user,
  экран чтения (новый UI, ранее не существовал), comprehension/discussion
  questions, speaking/summary task, связь с сохранением фраз текста в
  SRS-очередь. 10–15 текстов (только original AI-assisted или
  public-domain/CC — никаких защищённых текстов).
- Критерии приёмки: у каждого текста заполнено `source`/`license`
  (обязательное условие для Phase 4, см. карту зависимостей); lexical
  coverage считается детерминированно относительно конкретного
  пользователя, не ИИ-оценкой; пользователь реально может пройти текст
  от чтения до сохранения новых фраз в SRS — сквозной flow, не только API.
- Риски: соблазн взять готовый защищённый текст «для качества» — явный
  запрет; нужен editorial review перед публикацией (часть A).
- Вне scope: guided reading для текстов со сложностью выше ~95% lexical
  coverage; полный объём 60–100 текстов (§G).
- Migration: да. Seed: да (10–15 текстов).
- Затрагиваемые модули: новый content-модуль (`reading`), новый frontend
  экран, `phrases`/`reviews` (сохранение фраз текста в SRS).

**E. Listening content foundation**
- Цель: определить **контентную модель** для будущего Listening — не
  полноценный движок (он — Phase 3) и не массовое производство аудио.
- Зависимости: A.
- Deliverables: схема данных (transcript, audio source, speaker/accent
  metadata, duration, CEFR, target phrases, target grammar, source/license,
  review status) — без обязательного наполнения в Phase 2 MVP.
- Критерии приёмки: схема согласована и совместима с governance-полями
  §A (status/version/source/license); не требуется ни одной готовой
  аудиозаписи для завершения этого подэтапа.
- Риски: соблазн сразу начать производство аудио — явно вне scope.
- Вне scope: полноценный Listening user engine (Phase 3); массовое
  создание аудио-контента.
- Migration: да (только схема). Seed: нет.
- Затрагиваемые модули: новая модель данных, без UI/движка в Phase 2.

**F. Retrieval integration по slices**
- Цель: AI реально читает проверенный контент вместо изобретения заново
  — интегрируется **поэтапно, внутри каждого slice**, а не одним общим
  блоком после B/C/D.
- Подход: Grammar retrieval — сразу внутри §B (как только `GrammarRule`
  для 10–15 категорий существует); Phrase retrieval — сразу внутри §C;
  Reading retrieval — внутри §D. Общий AI retrieval layer и source-ID
  validation унифицируют эти реализации **после** того, как хотя бы одна
  из них работает end-to-end — не как отдельная предварительная
  архитектура вслепую.
- Зависимости: соответствующий slice (B для grammar-retrieval, C для
  phrase-retrieval, D для reading-retrieval).
- Deliverables: обновлённые системные промпты с retrieval-шагом перед
  вызовом ИИ; серверная валидация, что `source ID` в ответе ИИ
  существует в базе (см. «AI role & constraints» выше — блокирующее
  правило, не рекомендация); dev-фолбэки обновлены на детерминированные
  ответы из базы вместо захардкоженных строк — для покрытых категорий.
- Критерии приёмки: ни один промпт не может вернуть unverified
  rule/content source ID без явной пометки; regression-тесты на
  дев-фолбэк режим (`aiMode: fallback`) остаются зелёными.
- Риски: рост латентности запроса (retrieval + LLM-вызов
  последовательно) — измерить, при необходимости кешировать.
- Вне scope: единый централизованный retrieval-layer до появления хотя
  бы одного работающего slice-примера.
- Migration: возможно (индексы для retrieval-запросов). Seed: нет.
- Затрагиваемые модули: `ai` (промпты, LLM-клиент), плюс модуль
  соответствующего slice (`errors`/`phrases`/`reading`).

**G. Expansion** — `PLANNED / NOT STARTED`, не детализируется сейчас.
Наращивание Grammar vertical до 50–70 правил, Phrase vertical до
600–1000, Reading vertical до 60–100 **разрешается только после**:
production-валидации **всех** обязательных MVP-срезов (§B, §C, §D —
не только одного из них) **и** минимального quality/editorial pipeline
(часть §A) в реальном использовании, с подтверждёнными quality-метриками
(см. «Метрики» ниже). Отдельное утверждение объёма перед стартом
расширения, как и для всей Phase 2 в целом.

---

### Phase 3 — Core Skills Engine — Status: `PLANNED / NOT STARTED`

Пользовательские учебные движки и progression поверх контентных моделей
Phase 2 — отвечает за то, как пользователь **прокачивает навык**, а не
только за то, что за контент ему показывается. Направления:

- Reading progression (движок поверх `ReadingContent` из Phase 2 §D —
  адаптивный подбор сложности, а не фиксированный список текстов).
- Listening progression (движок поверх контентной модели Phase 2 §E —
  в Phase 2 есть только схема, здесь появляется сам движок и, при
  необходимости, наполнение аудио-контентом).
- Speaking depth (углубление уже существующего text conversation engine
  Phase 0 — не с нуля).
- Writing (отдельный тренировочный движок — сегодня writing существует
  только как разовая ИИ-оценка внутри диагностики).
- Shadowing (полноценный движок поверх контентного фундамента Phase 2 §E).
- Skill-specific adaptive progression (пересчёт `SkillProfile` по
  результатам, не только по повторной диагностике — продолжение
  «baseline adaptive level progression» из Phase 1, но per-skill, не
  только общий уровень).
- Content difficulty adjustment (динамическая сложность на основе
  lexical coverage/успехов, не статичный CEFR-фильтр).
- Recognition-to-production transfer (явное измерение перехода от
  пассивного узнавания к активной продукции — то же разграничение,
  что вводится в Phase 2 §C через `UserPhraseProgress`, здесь
  становится измеримой учебной метрикой по всем навыкам).
- Weekly skill review (еженедельная практика по навыкам, отличная от
  «недельного отчёта» из Phase 1 backlog — тот является отчётом,
  это — учебная активность).

Зависимости: контентные модели Phase 2 (§B/§C/§D/§E) — Phase 3 не
изобретает контент заново, а строит движки поверх него. Не детализирован
на уровне подэтапов — требует отдельного планирования после того, как
хотя бы один content-slice Phase 2 пройдёт production-валидацию.

---

### Phase 4 — Literature, Culture & Story Mode — Status: `PLANNED / NOT STARTED`

Жёсткие зависимости — **не начинать только потому, что в БД появились
тексты**:
- Reading engine (Phase 3) — Story Mode это не просто «база текстов»,
  это учебный движок поверх нескольких текстов с прогрессией.
- Listening engine (Phase 3) — при наличии аудио-версий истории.
- Reading/Listening content models (Phase 2 §D/§E).
- source/license/version/editorial workflow (Phase 2 §A) — без честного
  трекинга источника и лицензии Literature Track невозможен по условиям
  §D (запрет на хранение полных защищённых текстов).
- Phrase Library (Phase 2 §C) — 10%-я квота literature/culture в
  контентном балансе.
- Grammar Knowledge Base (Phase 2 §B) — литературные примеры правил.

---

### Phase 5 — IELTS Readiness & Simulations — Status: `PLANNED / NOT STARTED`

Обязательные зависимости — **не описывать как зависящую только от
Grammar KB и Reading Library**:
- Reading (Phase 3 engine, не только Phase 2 контент).
- Listening (Phase 3 engine).
- Speaking (углублённый, Phase 3 depth — не только text conversation
  engine Phase 0).
- Writing (Phase 3 engine — сегодня отсутствует).
- Skill-specific analytics (часть Cross-cutting workstreams ниже).
- Task-based and deliberate practice (Evidence-based methods, Phase 2).
- Structured rubrics (новое — IELTS требует формальных критериев
  оценки по навыку, которых сегодня нет ни в одной ИИ-роли).
- Timed simulation engine (новое — ни один текущий модуль не измеряет
  время выполнения как часть оценки).

---

## Cross-cutting workstreams

Это **не последовательные фазы** — они применяются во всех фазах
одновременно, начиная с указанной ниже точки старта. Roadmap-аудит
показал, что без явного выделения эти направления теряются между
контентными фазами.

| Workstream | Текущее состояние | Ближайший минимальный результат | Фаза начала | Критерий готовности |
| --- | --- | --- | --- | --- |
| Production reliability | Частично — retry/backoff на AI-слое есть (`DONE`, см. AI backlog); systemic reliability вне AI-слоя не отслеживается | Явный dashboard/лог основных ошибок API | Phase 1 | Production-инцидент уровня PR #34 обнаруживается мониторингом раньше, чем пользователем |
| Monitoring and observability | Точечное логирование (`LlmClient`, Nest logger) без агрегации | Агрегированный лог ошибок + базовые алерты | Phase 1 | Есть единая точка, где видно состояние продакшена без чтения сырых логов контейнера |
| AI quality/latency/cost observability | Не существует | Метрики fallback rate, latency, cost per call | Phase 1 (старт) → Phase 2 (для нового контента) | Метрики из раздела «Метрики» ниже собираются автоматически |
| Privacy and user-data deletion | Не существует (`deletedAt` только на `UploadedMaterial`) | Endpoint удаления аккаунта + связанных данных | Phase 1 | Пользователь может полностью удалить свои данные одним действием |
| Migration and legacy-data safety | Частично — есть прецедент (`ErrorRecord` honest fallback + ручное удаление после PR #34) | Тот же паттерн явно закреплён как требование для новых моделей Phase 2 | Phase 1 (паттерн), Phase 2 (применение) | Ни одна новая миграция Phase 2+ не создаёт молчаливых `null`-полей без fallback в UI |
| Accessibility | Не оценивалось | Базовый a11y-аудит текущих 15 экранов | Phase 1 (старт) | Ключевые флоу проходимы с клавиатуры/screen reader без критичных блокеров |
| Responsive/mobile UX | Частично — PWA адаптивна, но без целевого review | Обзор мобильного UX новых экранов (Phase 2 Reading) | Phase 1 (старт), Phase 2 (для нового UI) | Новые экраны не хуже существующих по мобильному UX |
| Browser compatibility | Задокументировано как известное ограничение (Firefox/iOS Safari — text fallback для STT/TTS), не отслеживается как workstream | Явный список поддерживаемых браузеров/деградаций | Phase 1 | Ограничения зафиксированы в roadmap, а не только в «Известных ограничениях» |
| Security | Базовый JWT (30 дней, без refresh-ротации), Google-вход не реализован — задокументировано, не проработано как workstream | Явная оценка риска долгоживущего JWT без ротации | Phase 1 | Риск либо принят осознанно, либо запланирован refresh-ротацией |
| Backup/recovery | Неизвестно (зависит от внешнего провайдера БД — Neon/Supabase/Railway, не описано в roadmap) | Явная запись, какой backup-план у выбранного провайдера БД | Phase 1 | Есть задокументированный ответ на «что если БД провайдера потеряет данные» |
| Product and learning analytics | Метрики вычислимы из схемы (`occurrenceCount`, `contextsPassed` и т.д.), но не агрегируются и не выводятся | Дашборд с метриками из раздела «Метрики» ниже | Phase 1 (старт), Phase 5 (зрелость) | Метрики Phase 1/2 (см. ниже) реально собираются, не только вычислимы в теории |

---

## Метрики

Не ограничиваться количеством контента (правил/фраз/текстов) как
результатом фазы.

### Phase 1

**Product:** daily completion rate · return rate (D1/D7/D30) · review
completion rate · streak length distribution.
**Learning:** error recurrence rate (`ErrorRecord.occurrenceCount`) · time
to mastery · transfer to new contexts (`contextsPassed`) · vocabulary
recall accuracy (`ReviewAttempt.correct`).
**AI/operational:** AI fallback rate (`aiMode: fallback`) · retry rate ·
invalid structured-output rate · latency · Render cold-start frequency.

### Phase 2

**Product:** % daily-сессий, затрагивающих новый контент (Grammar/Phrase/
Reading) vs legacy fallback · content flow completion rate (% пользователей,
прошедших Reading-flow от текста до сохранения фраз).
**Learning:** rule mastery rate · active phrase recall (отдельно от
пассивного узнавания, см. `UserPhraseProgress`) · reading comprehension
pass rate · lexical coverage vs user-reported difficulty (насколько
предсказанный coverage совпадает с ощущением пользователя).
**Content quality:** duplicate rate · human-review rejection rate · CEFR
disagreement rate (авто-тег vs human review) · missing source/license
rate (должен быть 0) · archived/rolled-back content rate.
**AI/operational:** fallback rate для retrieval-промптов · cost per
completed learning activity · latency retrieval+LLM.

Phase 3–5 метрики не фиксируются заранее — преждевременно закреплять
метрики для функционала, который ещё не спроектирован детально (риск
«метрика ради метрики»); они появятся при детальном планировании этих фаз.

---

## Risk register (уровень roadmap)

| Риск | Вероятность | Влияние | Mitigation | Owning phase/workstream |
| --- | --- | --- | --- | --- |
| Chрезмерный scope (scope expansion) | Высокая | Высокое | Жёсткий MVP-таргет 10–15/100–150/10–15 до расширения; §G условия расширения ужесточены (все MVP-срезы + editorial pipeline) | Phase 2 §A/§G |
| Массовая генерация низкокачественного контента | Высокая при спешке | Высокое | Обязательный `draft→reviewed→published`, 100% human review для правил | Phase 2 §A |
| Неверный грамматический контент | Средняя | Высокое (портит обучение) | `review`/`source`/`version` в первой миграции `GrammarRule`, human review до `published` | Phase 2 §B |
| CEFR misclassification | Средняя | Среднее | Детерминированные эвристики + human review gate | Phase 2 §A/§B/§C/§D |
| Duplicate content | Средняя | Низкое-среднее | Normalize+lookup паттерн (уже есть прецедент в `errors.service.ts`) | Phase 2 §A |
| Copyright/license | Средняя | Высокое (юридическое) | NOT NULL source/license на уровне схемы для `ReadingContent`; запрет публикации без лицензии | Phase 2 §D |
| Missing editorial workflow | Была высокой при старой последовательности (§F в конце) | Высокое | Перенесено в §A — обязательно до первого seed, не после B/C/D | Phase 2 §A |
| False mastery | Средняя | Высокое (подрывает доверие) | `contextsPassed`-гейт уже есть для Errors; тот же паттерн обязателен для `UserPhraseProgress` (Phase 2 §C) | Phase 2 §C |
| Overfitting на повторяемых предложениях | Средняя | Среднее | Требование нового контекста перед mastery (уже часть §B/§C flow) | Phase 2 §B/§C |
| Legacy data | Уже материализовался (PR #34) | Уже материализовался | Паттерн честного fallback + ручного удаления распространяется на все новые модели Phase 2 | Phase 2 §A, сквозной |
| AI cost | Средняя | Среднее | Cost per activity метрика (см. «Метрики»), кеширование retrieval | Phase 1 (мониторинг) → Phase 2 (для retrieval) |
| 429/529 | Высокая (уже наблюдается в логах) | Среднее | Retry/backoff уже `DONE`; нужна агрегированная production-метрика частоты | Phase 1 |
| Cold starts (Render free) | Высокая | Среднее (UX) | Явный workstream «Render Free cold-start observability» | Phase 1 |
| Рост Prisma schema без контроля | Средняя | Среднее | Governance-поля (`status`/`version`/`source`) закладываются в первую миграцию каждой новой модели, не добавляются постфактум | Phase 2 §A |
| Privacy (нет удаления данных пользователя) | Средняя, растёт с масштабом | Высокое (юридическое/доверие) | Явная задача Phase 1 backlog | Phase 1 |
| Отсутствие мониторинга | Высокая | Высокое | Cross-cutting workstream «Monitoring and observability», старт Phase 1 | Phase 1 |

---

## Карта зависимостей (сводно)

| Направление | Зависит от |
| --- | --- |
| Errors / MicroLessons (Phase 1, уже `DONE`) | Не блокирующая зависимость — уже работают на текущем контенте. Будущее качественное обновление объяснений использует Grammar Knowledge Base (Phase 2 §B) как источник, когда она появится |
| Lessons, Reviews, Speaking, Reading (новый UI) | Phrase vertical (Phase 2 §C) |
| Reading, Story Mode, Literature Track | Reading vertical / `ReadingContent` (Phase 2 §D) |
| Literature/Culture & Story Mode (Phase 4) | source/license/version/editorial workflow (Phase 2 §A) — обязательное условие |
| Персонализация по интересам/целям (сейчас `PARTIAL`) | Явное решение из Phase 1 backlog (проверка использования onboarding-данных) — не зависит от Phase 2 |
| Персонализация контента по CEFR | CEFR tagging per-item (Phase 2 §B–§D) |
| SRS, Reviews, генерация уроков | Evidence-based methods формализация (Phase 2, сквозной принцип) |
| Phase 3 (Core Skills Engine) | Phase 2 §B/§C/§D/§E (контентные модели, на которых строятся движки) |
| Phase 4 (Literature/Story Mode) | Phase 3 (Reading/Listening engines) + Phase 2 §A/§C/§D (governance, Phrase, Reading) |
| Phase 5 (IELTS Readiness & Simulations) | Phase 3 (Reading/Listening/Speaking/Writing engines) + Phase 2 (Evidence-based methods, task-based practice) — не только Grammar KB и Reading Library |
| Все Phase 2+ | Cross-cutting workstreams — governance/monitoring/privacy начинаются в Phase 1, не ждут Phase 2 |
