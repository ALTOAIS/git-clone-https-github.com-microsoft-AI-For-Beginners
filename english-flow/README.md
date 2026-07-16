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

**Статусы:** `DONE` — в production и подтверждено тестами/смоук-тестом ·
`IN PROGRESS` — часть объёма сделана, часть в работе ·
`PLANNED / NOT STARTED` — только описано, ни строчки кода/схемы/сида не создано.
Существование отдельного seed-файла, AI-промпта или одной вспомогательной
функции **не** считается основанием отметить направление как `DONE` —
статус повышается только когда объём, описанный в конкретной фазе, закрыт
и проверен (тесты + typecheck + lint + build), см. пункт 6 ниже.

### Phase 0 — MVP (`DONE`)

Базовый продукт из раздела «Что реализовано (MVP)» выше: онбординг,
диагностика, дневной план, урок, тренажёр перевода, библиотека фраз,
интервальное повторение (SRS v1), разговор с ИИ, реестр ошибок v1,
прогресс, генератор уроков, материалы, PWA/офлайн, голос.

### Phase 1 — Стабилизация текущих модулей (`IN PROGRESS`)

Цель фазы: довести до продакшен-надёжности то, что уже выпущено, прежде
чем расширять контент или добавлять новые крупные направления (Phase 2+).

- **Реестр ошибок / SRS для ошибок — `DONE`.** Редизайн (source context,
  детерминированный language gate, ежедневная сессия практики на 3 задания,
  интервальное повторение, MASTERED-гейтинг), UX-доработки (раздельные
  «Проверить»/«Завершить», честная tri-bucket статистика, отложенный skip)
  и production-хотфикс (пустая дневная сессия при активных `NEW`-записях,
  исключение повреждённых legacy-записей, унификация карточки контекста,
  ручное подтверждённое удаление) — смержено (PR #33, PR #34).
- **Daily Achievement Summary + adaptive micro-lessons — DONE.** Дневная
  сводка достижений и адаптивные микро-уроки на основе ошибок пользователя.
  ⚠️ Термин «micro-lessons» здесь означает уже реализованный adaptive-recap
  механизм (`progress`/`micro-lessons` backend-модуль) — **не** путать с
  Grammar Knowledge Base из Phase 2: сейчас объяснения правил берутся из
  точечного набора `CATEGORY_RULE_DETAILS`/`CATEGORY_ADDITIONAL_EXAMPLE`
  (`backend/src/modules/errors/context-examples.ts`, 12 микрокатегорий) —
  это не структурированная база знаний, а захардкоженный fallback-контент
  для карточки «Не понял объяснение». Формализация этого контента — задача
  Grammar Knowledge Base (Phase 2, §1).
- **Инфраструктурный backlog (перенесён без изменений из прежнего раздела
  «Рекомендуемая следующая фаза» — `PLANNED / NOT STARTED`, если не указано иное):**
  1. Подключить продакшен-ключ ИИ (Anthropic/OpenAI) и прогнать все 10 ролей на реальных ответах.
  2. Web Push-уведомления (напоминание в выбранное время, фразы к повторению).
  3. Серверные STT/TTS-адаптеры (Whisper + нейро-TTS) для браузеров без Web Speech API и более точных транскриптов.
  4. Объектное хранилище для аудио и загруженных файлов.
  5. Недельный отчёт (генератор плана уже есть в слое ИИ) и адаптация плана по ошибкам.
  6. Казахская локализация интерфейса.

Personalization (CEFR-профиль по 6 навыкам, онбординг-интересы, дневной
план) и speaking (Web Speech STT/TTS) существуют в объёме Phase 0/1 выше;
их дальнейшее углубление зависит от контента Phase 2 (см. карту
зависимостей в конце раздела) и вынесено в Phase 5.

---

### Phase 2 — English Flow: Content & Pedagogy Engine (`PLANNED / NOT STARTED`)

English Flow стабилизирован в production (Phase 0–1). Следующая итерация
должна улучшить **качество учебного содержания**, а не добавлять
декоративные функции. Это фаза-фундамент: Phase 3 (Literature/Culture
Track, Story Mode) и Phase 4 (IELTS readiness) не начинаются, пока здесь
не закрыт как минимум MVP-объём (§7, подэтапы A–C) — см. карту
зависимостей.

Не начинать с массовой генерации контента. Сначала — аудит текущего
состояния, затем — проектирование управляемого Content & Pedagogy Engine.

#### Аудит текущего контента (выполнен при добавлении этой фазы в roadmap)

| Область | Текущее состояние | Разрыв с целевым объёмом Phase 2 |
| --- | --- | --- |
| Phrase seeds | `content/seed-phrases.ts` — 43 фразы, без структурированных полей (collocations, sense, active/passive mastery, source/version) | Нужно 600–1000 элементов с полной схемой (§2) |
| Lesson seeds | `content/lesson-content.ts` + генератор уроков через ИИ — контент создаётся на лету, не версионируется, без review-статуса | Нужна модель версионирования/review-статуса (§6) |
| AI prompts | 10 системных промптов-ролей (слой ИИ, `raздел 17 PRD`) — сами по себе рабочие, но грамматика/примеры каждый раз изобретаются ИИ заново | AI должен получать проверенное правило из базы, не изобретать (§5) |
| Grammar explanations | `errors/context-examples.ts` — `CATEGORY_RULE_DETAILS`/`CATEGORY_ADDITIONAL_EXAMPLE`/`buildHelpDetails` на 12 микрокатегорий, только RU, без CEFR/prerequisites/signal words/примеров по регистрам | Нужна база на 50–70 правил A1–B1 с полной схемой (§1) |
| Text/material models | `materials`-модуль — загрузка PDF/DOCX/TXT пользователем, упрощение текста ИИ; нет курируемой библиотеки текстов с CEFR/lexical coverage/source-license | Нужна Reading and Text Library 60–100 текстов (§3) |
| CEFR tagging | Есть на уровне пользователя (диагностика → 6-навыковый профиль) и урока (генератор уроков принимает level); нет per-item CEFR на фразах/правилах/текстах | CEFR должен быть на каждой единице контента (§1–3) |
| Error categories | `errorType` (enum) + `microCategory` (12 значений, `micro-category.classifier.ts`) — рабочая типизация, но не связана с формальными rule code из Grammar KB | Grammar KB должна ссылаться на существующие `ErrorType`/`MicroCategory`, не создавать параллельную таксономию (§1, зависимость ниже) |
| Review scheduling | SRS для фраз (1-3-7-14-30-60-90 дней) и для ошибок (3-7-14-30 дней, раздельные реализации) — оба работают, но интервалы не связаны ни с одним из «evidence-based» методов явно | Формализовать как продуктовые правила (§4) и, где оправдано, унифицировать |

**Вывод аудита:** прямых блокеров для проектирования Content & Pedagogy
Engine нет, но ни один из существующих кусков (43 фразы, 12
микрокатегорий, per-user CEFR) не закрывает целевой объём Phase 2 — это
подтверждает, что нужна отдельная управляемая база знаний, а не
расширение точечных объектов в `context-examples.ts`/`seed-phrases.ts` на
месте.

#### §1. Grammar Knowledge Base

Структурированная база основных правил английского языка A1–B1. Для
каждого правила: stable rule code, CEFR level, title RU/EN, краткое
объяснение на русском, form/pattern, usage conditions, signal words,
prerequisites, typical mistakes русскоязычных учащихся,
incorrect/correct examples, everyday/professional/literary examples,
связанные `ErrorType`/`MicroCategory`, exercise templates, source/reviewer/version.

ИИ не изобретает правило заново — получает проверенное правило из базы и
адаптирует объяснение/примеры под пользователя (см. §5).

Начальный scope: 50–70 правил A1–B1 — articles, Present Simple,
third-person singular, Past Simple, Present Perfect, modal verbs,
questions, negatives, prepositions, word order, gerund/infinitive,
countable/uncountable nouns and common collocations.

#### §2. Vocabulary and Phrase Library

Расширение библиотеки преимущественно фразами и lexical chunks, не
изолированными словами. Поля: lemma, phrase, translation, CEFR level,
meaning/sense, part of speech, pronunciation, collocations, example
sentences, common errors, topic, content domain, active/passive mastery,
source/version.

Начальный scope: 600–1000 элементов A1–B1. Баланс: 40% everyday · 30%
professional · 20% interests/hobbies · 10% literature/culture/advanced.

#### §3. Reading and Text Library

60–100 коротких текстов A1–B1 (everyday/family/travel/sport/technology/
movies/original fiction/science fiction/professional). Поля: CEFR level,
word count, target grammar, target phrases, topic, estimated lexical
coverage, comprehension questions, discussion questions, speaking task,
summary task, source and license.

Extensive reading — тексты, где пользователю знакомо ≥~95% лексики;
более сложные — только guided reading с подсказками. Никаких полных
текстов защищённых современных книг — только original AI-assisted,
public-domain, user-uploaded или совместимый Creative Commons контент с
атрибуцией.

#### §4. Evidence-Based Learning Methods

Реализовать как продуктовые правила, не только описать: spaced practice,
retrieval practice, deliberate practice, immediate corrective feedback,
interleaving, task-based learning, extensive reading, shadowing,
production before perfection. Для каждого метода — где уже реализован
(полностью/частично), какие данные использует, какой алгоритм должен
измениться, как измеряется результат. (Пример частичной реализации уже
сегодня: spaced practice и immediate corrective feedback — в SRS фраз и
ошибок Phase 0/1; retrieval practice — в тренажёре перевода; shadowing —
не реализован нигде.)

#### §5. AI Role

AI должен: выбирать релевантное правило из базы, адаптировать объяснение
под пользователя, создавать новые примеры, оценивать открытые ответы,
генерировать упражнения на основе реальных ошибок, адаптировать тексты
под уровень, проверять JSON и сохранять source IDs.

AI не должен: подменять собой базу правил, возвращать непроверенные
правила как факт, генерировать бесконечные дубли, использовать
защищённые тексты без прав.

#### §6. Quality Control

Content validation, duplicate detection, CEFR consistency checks,
required-field validation, source/license tracking, versioning, review
status (`draft` / `reviewed` / `published` / `archived`), deterministic
fallback content.

#### §7. Подэтапы Phase 2

Обязательный порядок: A → B/C могут идти параллельно после A → D → E → F.
G — отдельное решение после production-валидации E, вне текущего scope.

**A. Audit and architecture**
- Цель: закрыть §7.1 delivery process целиком — итоговый документ с
  моделью данных, архитектурой retrieval, scope первой итерации, рисками,
  критериями приёмки — до старта любой реализации.
- Зависимости: нет (это первый подэтап).
- Deliverables: аудит текущего контента (см. таблицу выше, уже выполнен
  как часть данного roadmap-обновления и требует ревью), предлагаемая
  Prisma-модель данных (`GrammarRule`, `PhraseItem`, `ReadingText` и
  связи с существующими `ErrorType`/`MicroCategory`), архитектура
  retrieval (как AI выбирает правило/фразу/текст из базы), scope
  первой ограниченной итерации, риски, критерии приёмки.
- Критерии приёмки: документ согласован отдельным утверждением
  (см. §7 delivery process — «после отдельного утверждения»), нет
  открытых вопросов по схеме данных.
- Риски: недооценка объёма ручной редактуры (correctness правил и
  текстов — не задача, которую можно полностью делегировать ИИ).
- Вне scope: любой код, миграции, сиды.
- Migration: нет. Seed: нет.
- Затрагиваемые модули: только документация/планирование.

**B. Grammar Knowledge Base MVP**
- Цель: первые ~50–70 правил A1–B1 (§1) с полной схемой, доступные через
  API для чтения.
- Зависимости: A.
- Deliverables: Prisma-модель `GrammarRule` (+ связь с `ErrorType`/
  `MicroCategory`), сид первых правил, backend-эндпоинт получения
  правила по коду/категории, замена статического `context-examples.ts`
  на чтение из базы для карточки «Не понял объяснение».
- Критерии приёмки: каждое правило проходит required-field validation
  (§6), существующие regression-тесты `errors`-модуля (даты/скип/язык)
  остаются зелёными без изменений бизнес-логики.
- Риски: миграция с `CATEGORY_RULE_DETAILS` может незаметно изменить
  текст, который уже видели пользователи, — нужна проверка построчного
  соответствия минимум для существующих 12 микрокатегорий.
- Вне scope: адаптация ИИ под правило (§5) — берётся отдельным подэтапом
  или частью D.
- Migration: да (новая таблица/поля). Seed: да (50–70 правил).
- Затрагиваемые модули: `backend/src/modules/errors` (rule lookup вместо
  статического объекта), `progress`/`micro-lessons` (adaptive recap
  читает из новой базы вместо хардкода).

**C. Vocabulary and Phrase Library MVP**
- Цель: первая партия фраз по целевой схеме (§2), не обязательно все
  600–1000 сразу — первая ограниченная итерация по итогам A.
- Зависимости: A (может идти параллельно с B).
- Deliverables: расширенная Prisma-модель фразы (текущая модель фраз +
  недостающие поля: sense, part of speech, collocations, active/passive
  mastery, source/version, content domain), миграция существующих 43
  сидовых фраз в новую схему без потери данных, первая партия новых фраз
  по контентному балансу 40/30/20/10.
- Критерии приёмки: существующие 43 фразы валидны в новой схеме
  (backfill без null у required-полей), баланс тем соответствует
  заданным процентам ±5 п.п. на новой партии.
- Риски: backfill старых фраз может потребовать ручной разметки полей,
  которых не было (sense, part of speech).
- Вне scope: полный объём 600–1000 (это дальнейшее расширение, см. G).
- Migration: да. Seed: да (backfill + первая новая партия).
- Затрагиваемые модули: `backend/src/modules/phrases`, `reviews`
  (SRS должен продолжать работать на новой схеме без разрыва прогресса
  пользователя), frontend библиотека фраз.

**D. Reading Library MVP**
- Цель: первые 15–20 текстов (подмножество целевых 60–100, §3) с полной
  схемой, как основа для Reading и будущего Phase 3.
- Зависимости: A, желательно после B/C (использует Grammar KB и Phrase
  Library для target grammar/target phrases конкретного текста).
- Deliverables: Prisma-модель `ReadingText` (CEFR, word count, target
  grammar/phrases, topic, lexical coverage estimate, comprehension/
  discussion questions, speaking/summary task, source/license),
  алгоритм оценки lexical coverage для конкретного пользователя, первые
  15–20 текстов (только original AI-assisted или public-domain/CC —
  никаких защищённых текстов).
- Критерии приёмки: у каждого текста заполнено поле `source`/`license`
  (обязательное условие для Phase 3, см. карту зависимостей), lexical
  coverage считается детерминированно (не ИИ-оценкой).
- Риски: соблазн взять готовый защищённый текст для "качества" — явный
  запрет в §3, нужен editorial review перед публикацией (§6).
- Вне scope: guided reading UI, полный объём 60–100 текстов.
- Migration: да. Seed: да (15–20 текстов).
- Затрагиваемые модули: новый contentModule (или расширение `content`),
  frontend — новый экран/раздел не создаётся в рамках MVP (только API +
  данные), UI — отдельная работа после этого подэтапа.

**E. Retrieval integration**
- Цель: AI-слой (§5) реально читает из Grammar KB/Phrase Library/Reading
  Library вместо изобретения контента заново; JSON-ответы содержат
  source IDs.
- Зависимости: B, C, D.
- Deliverables: обновлённые системные промпты (объяснение грамматики,
  генератор уроков, генератор упражнений) с retrieval-шагом перед
  вызовом ИИ, серверная валидация, что `source ID` в ответе ИИ
  существует в базе, dev-фолбэки обновлены на детерминированные ответы
  из базы вместо захардкоженных строк.
- Критерии приёмки: ни один промпт из §5 не может вернуть правило,
  которого нет в Grammar KB, без явной пометки как "AI-generated,
  unverified"; regression-тесты на dev-фолбэк режим (`aiMode: fallback`)
  зелёные.
- Риски: рост латентности запроса (retrieval + LLM-вызов
  последовательно) — нужно измерить и, если критично, кешировать.
- Вне scope: адаптация текстов под уровень (частично §5, может быть
  отдельной итерацией внутри E).
- Migration: возможно (индексы для retrieval-запросов). Seed: нет
  (использует то, что засеяно в B/C/D).
- Затрагиваемые модули: `ai` (промпты, LLM-клиент), `errors`, `phrases`,
  `reviews`, `lessons`, `materials` — везде, где сегодня ИИ
  "изобретает" объяснение/пример на лету.

**F. Quality control and editorial workflow**
- Цель: закрыть §6 целиком как процесс, не только как поля в схеме.
- Зависимости: B, C, D (нужен реальный контент, на котором проверяется
  процесс).
- Deliverables: content validation pipeline (required fields, CEFR
  consistency, duplicate detection), review-статус
  draft/reviewed/published/archived на каждой модели, версионирование
  (кто/когда/что изменил), source/license tracking как обязательное
  поле там, где применимо (§3), детерминированный fallback-контент на
  случай отсутствия LLM (уже частично есть паттерн — дев-фолбэк ИИ-слоя,
  раздел «Слой ИИ» выше — нужно распространить на новый контент).
- Критерии приёмки: ни один элемент со статусом `draft` не отдаётся
  пользователю через обычный (не review/preview) API-путь; duplicate
  detection ловит внесённые вручную тестовые дубли.
- Риски: если editorial workflow появится позже наполнения (после B/C/D
  вместо параллельно) — придётся ретроактивно проставлять статусы всему
  уже засеянному контенту.
- Вне scope: UI для редакторов/модераторов (может не понадобиться при
  небольшом объёме контента и ручном review через БД/скрипты — решается
  в рамках A).
- Migration: да (review-статус, версия, source/license — где ещё нет).
- Seed: нет (только backfill статусов на существующий контент из B/C/D).
- Затрагиваемые модули: все новые content-модели из B/C/D.

**G. Expansion after production validation** — `PLANNED / NOT STARTED`,
не детализируется сейчас. Наращивание Grammar KB до 50–70 правил (если A
даст меньший начальный scope), Phrase Library до 600–1000, Reading
Library до 60–100 — только после того как A–F подтверждены в
production и понятно, что retrieval/quality control выдерживают нагрузку.
Отдельное утверждение объёма перед стартом, как и для всей Phase 2 в
целом (§7 delivery process, «после отдельного утверждения»).

---

### Phase 3 — Literature/Culture Track & Story Mode (`PLANNED / NOT STARTED`)

Не детализирован на уровне подэтапов — сначала должен быть закрыт
фундамент. **Жёсткая зависимость: Phase 2 §7 D (Reading Library MVP) и,
внутри неё, source/license tracking (Phase 2 §6/F)** — без честного
трекинга источника и лицензии текста Literature Track невозможен по
условиям §3 (запрет на хранение полных защищённых текстов). Также
зависит от Phase 2 §7 B (Grammar KB — литературные примеры правил, §1)
и C (Phrase Library — 10%-я квота literature/culture, §2).

### Phase 4 — IELTS Readiness (`PLANNED / NOT STARTED`)

Не детализирован. Зависит от Phase 2 §7 B (грамматика на структурном
уровне, нужном для Writing/Speaking-критериев IELTS), D (Reading Library
— формат, близкий к IELTS Reading), и от расширения speaking-оценки
(Phase 5) для Speaking-секции. Также зависит от Phase 2 §4
(Evidence-Based Learning Methods — task-based learning, deliberate
practice — методологическая база для IELTS-подготовки).

### Phase 5 — Speaking/Reading/Listening/Shadowing depth, Simulations & Analytics (`PLANNED / NOT STARTED`)

Не детализирован. Углубление personalization (per-skill адаптация плана
за пределами текущего CEFR-профиля), shadowing (нет реализации сегодня —
см. Phase 2 §4), серверные STT/TTS (пересекается с Phase 1 backlog,
пункт 3 — не дублируется, при реализации ссылаться на Phase 1),
симуляции (расширение «Разговор с ИИ») и продуктовая аналитика
(долгосрочные тренды, не только текущий `progress`-модуль). Частично
зависит от контента Phase 2 (упражнения/тексты для симуляций) и от
накопленных SRS-данных Phase 0/1.

### Карта зависимостей (сводно)

| Направление | Зависит от |
| --- | --- |
| Errors / MicroLessons (Phase 1, уже DONE) | Grammar Knowledge Base (Phase 2 §1) — для формализации объяснений вместо `context-examples.ts` |
| Lessons, Reviews, Speaking, Reading | Vocabulary and Phrase Library (Phase 2 §2) |
| Reading, Story Mode, Literature Track | Text Library (Phase 2 §3) |
| Literature/Culture Track (Phase 3) | source/license tracking (Phase 2 §6) — обязательное условие |
| Персонализация (CEFR-адаптация контента) | CEFR tagging и lexical coverage (Phase 2 §1–3) |
| SRS, Reviews, генерация уроков | Evidence-Based Learning Methods формализация (Phase 2 §4) |
| Phase 3 (Literature/Story Mode) | Phase 2 §7 B, C, D + F (source/license) |
| Phase 4 (IELTS readiness) | Phase 2 §7 B, D + Phase 2 §4 + Phase 5 (speaking) |
| Phase 5 (Simulations/Analytics/Shadowing) | Phase 2 (контент для сценариев) + Phase 0/1 (накопленные SRS-данные) |
