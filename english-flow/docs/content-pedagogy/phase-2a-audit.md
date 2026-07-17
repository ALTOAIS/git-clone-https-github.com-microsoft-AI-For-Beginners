# Phase 2A — Codebase audit

Audit performed by reading the actual backend source in
`english-flow/backend/src`, not by summarizing README claims. Every
count below was produced by a direct grep/read against the file cited,
at commit `551f8c1baa94de6800cc661775568260ae6be4a2` (roadmap merge) plus
the Phase 2A branch `claude/phase2a-content-pedagogy-architecture`.

## Factual inventory (corrected counts)

| Item | Count | Source |
| --- | --- | --- |
| Phrase seeds | **31** | `backend/src/modules/content/seed-phrases.ts` — `grep -c "^\s*english: '"` |
| Built-in lessons (week plan) | **7** | `backend/src/modules/content/week-plan.ts` — 7 `topic:` entries, day 1–7 |
| Conversation scenarios | **18** | `backend/src/modules/content/scenarios.ts` — 18 top-level `id:` entries |
| Diagnostic items | **35** | `backend/src/modules/content/diagnostic.ts` — across 6 sections (vocabulary/grammar/reading/listening/speaking/writing) |
| `ErrorType` enum values | **12** | `backend/prisma/schema.prisma` |
| `MicroCategory` enum values | **12** | `backend/prisma/schema.prisma`, 1:1 with `MICRO_LESSON_THRESHOLDS` in `micro-lessons/thresholds.ts` |
| Static grammar-explanation records | **24** (12 + 12, two independent sets) | See "Confirmed content divergence" below |
| AI roles / system prompts | **12** | `backend/src/modules/ai/prompts/prompts.ts` — 12 `export const *_PROMPT` constants |

Two figures previously stated in earlier roadmap discussion were **not
accurate** and are corrected here: phrase seeds is 31, not 43; scenarios
is 18, not 17; AI roles is 12, not 10. `english-flow/README.md` is
updated with a minimal factual correction referencing this document (see
the top-level PR diff).

## Confirmed content divergence (not a hypothetical risk — found in running code)

Two independently-maintained Russian-language explanations of the same
12 `MicroCategory` values exist today:

1. `backend/src/modules/errors/context-examples.ts` →
   `CATEGORY_RULE_DETAILS` — used by `buildHelpDetails()`, shown in the
   daily-practice "Не понял объяснение" panel (`errors` module).
2. `backend/src/modules/ai/fallbacks.ts:404` → `MICRO_LESSON_RULES` —
   used as the `ruleExplanation` fallback text when `MicroLesson`
   generation runs without a configured AI provider.

Example, same category, different text, both live in production:

```
context-examples.ts (CATEGORY_RULE_DETAILS.THIRD_PERSON_SINGULAR):
"После he/she/it в настоящем времени к глаголу добавляется -s."

ai/fallbacks.ts (MICRO_LESSON_RULES.THIRD_PERSON_SINGULAR):
"В Present Simple к глаголу добавляется -s (или -es), если подлежащее —
he, she, it или существительное в единственном числе («he works», «the
company complies»). Это единственное время, где форма глагола меняется
в зависимости от лица — легко забыть по привычке из русского языка."
```

A third static table, `MICRO_LESSON_GENERIC_EXERCISES`
(`ai/fallbacks.ts:431`), provides fallback exercises for the same 12
categories and is a candidate source for MVP `ExerciseTemplate` content,
not an explanation source.

Per the roadmap's stated rule ("не считать функциональность
реализованной только потому, что есть enum, prompt, seed или mock"),
none of these three tables is treated as a canonical source in this
audit — see `editorial-workflow.md` for how the canonical
`shortExplanationRu`/`explanationRu` pair is derived instead.

## Content, by module

| Element | File | Purpose | Reusable for Phase 2? | Notes |
| --- | --- | --- | --- | --- |
| `SEED_PHRASES` | `content/seed-phrases.ts` | 31 seed phrases, fields `english/russian/category/cefrLevel/example/hint/tags` | Yes, as backfill source | No `sense`/`partOfSpeech`/`source`/`version` |
| `LESSON_CONTENT`/`WEEK_PLAN` | `content/lesson-content.ts`, `content/week-plan.ts` | 7 fixed day-1..7 lessons, `isValidLessonContent()` runtime validator | Yes, as a structural pattern | Lesson phrases are plain JSON text, not FK to any phrase model |
| `CATEGORY_RULE_DETAILS` | `errors/context-examples.ts` | RU explanation, 12 `MicroCategory` | As legacy draft input only | See divergence above |
| `MICRO_LESSON_RULES` | `ai/fallbacks.ts` | RU explanation, same 12 `MicroCategory` | As legacy draft input only | See divergence above |
| `MICRO_LESSON_GENERIC_EXERCISES` | `ai/fallbacks.ts` | Fallback exercises, 12 categories | As `ExerciseTemplate` draft input | No CEFR/source |
| `micro-category.classifier.ts` | `errors/micro-category.classifier.ts` | **Deterministic** (regex/heuristic diff over original/corrected) classification into `MicroCategory` | Yes, unchanged | This is the first stage of `GrammarRuleResolver` — see `retrieval-architecture.md` |
| `language-detector.ts` | `errors/language-detector.ts` | Deterministic RU/EN/MIXED/EMPTY/UNCLEAR detection | Yes, unchanged | Reused as-is by Reading MVP for any free-text input |
| `Phrase`/`UserPhrase` | `schema.prisma` | Already split shared content (`Phrase`) from per-user progress (`UserPhrase`) | Yes — this is the key finding that changed the Phrase MVP recommendation | See `domain-model.md` |
| `trainer.service.ts` | `phrases/trainer.service.ts` | Deterministically generates 5 exercise types (`ru_en`/`en_ru`/`missing`/`order`/`voice`) from `Phrase`/`UserPhrase` fields | Yes, unchanged | Already a working, tested `ExerciseTemplate` engine — nothing to reinvent for Phrase MVP |
| `materials` module | `materials/materials.service.ts` | Per-user upload of PDF/DOCX/TXT into `UploadedMaterial`, no CEFR/source/license | Not a Reading content source | Distinct purpose from `ReadingContent` — do not conflate (see `domain-model.md`) |
| `Lesson.status` | `schema.prisma` — `LessonStatus` enum (`DRAFT`/`READY`/`ARCHIVED`) | Existing per-model lifecycle-status precedent | Yes | Direct precedent for "status field per content model, not a polymorphic review table" — see `domain-model.md` §Governance |

## AI layer

- `ai.service.ts` implements 12 use cases through a single `withFallback<T>()` pattern: LLM call → manual required-field validation (`throw` on invalid) → typed result; on failure or missing config, a deterministic fallback from `ai/fallbacks.ts` runs instead.
- Every result carries `aiMode: 'llm'|'fallback'`, `fallbackReason: 'not_configured'|'llm_error'|'invalid_json'`, `retryCount`, `providerStatus` — already a complete per-call observability payload (see `metrics-observability.md`).
- `llm.client.ts`: `RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504, 529])`, exponential backoff honoring `retry-after`, `AbortController` timeout.
- `json-repair.ts`: strips code fences, repairs common LLM JSON mistakes (unclosed quotes, trailing commas), tested independently.
- Where AI invents content from scratch today: `generateLesson` (whole lesson), `generateMicroLesson` when a provider is configured (rule explanation + examples + exercises, per-user). Where AI already reads from stored data rather than inventing it: `evaluateTranslation`/`evaluateSentence`/`evaluateReviewAnswer` (the expected answer is a parameter from an existing `Phrase`/task, not invented) and `classifyError` (classifies, does not create canonical content). Grammar/Phrase retrieval (Phase 2 §F) follows the same "AI evaluates/adapts, does not invent the verified answer" pattern already established for evaluation, not a new pattern.

## Learning logic

- Phrase SRS (`reviews.service.ts`): fixed intervals `[1, 3, 7, 14, 30, 60, 90]` days.
- Error SRS + mastery (`errors.service.ts`): `REVIEW_SCHEDULE_DAYS = [3, 7, 14, 30]`, `MASTERED_SUCCESS_COUNT = 4`, `MASTERED_CONTEXTS_REQUIRED = 2`.
- `ErrorRecord.contextsPassed` only increments when the practice exercise is a *different* sentence (a `blank` exercise) than the original — this is the existing anti-overfitting gate against false mastery, and Phase 2 slices reuse it rather than inventing a new one.
- `MICRO_LESSON_THRESHOLDS`: fully deterministic per-category error-count-over-window trigger for offering a micro-lesson.
- `plans.service.ts buildTasks()`: deterministic daily-plan assembly by due-review/error counts — confirmed to **not** read `SkillProfile`, `User.goals`, or `User.preferredTopics`.
- `Phrase.cefrLevel` exists in the schema but is not read by `trainer.service.ts` or `reviews.service.ts` for filtering — a currently-decorative field. Whether Phrase MVP activates it for retrieval filtering on day one, or leaves it decorative a while longer, is an open decision (see `decisions.md`).
