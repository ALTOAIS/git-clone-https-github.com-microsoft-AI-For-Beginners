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
| Static grammar-explanation records | **12 categories, covered by 4 layered legacy tables** (not 24 independent records — see "Legacy content is layered, not duplicated" below) | `context-examples.ts` + `ai/fallbacks.ts` |
| AI roles / system prompts | **12** | `backend/src/modules/ai/prompts/prompts.ts` — 12 `export const *_PROMPT` constants |

Two figures previously stated in earlier roadmap discussion were **not
accurate** and are corrected here: phrase seeds is 31, not 43; scenarios
is 18, not 17; AI roles is 12, not 10. `english-flow/README.md` is
updated with a minimal factual correction referencing this document (see
the top-level PR diff).

## Legacy content is layered, not duplicated — correction to an earlier audit claim

**Correction (superseding the original Phase 2A audit statement below):**
a direct read of `context-examples.ts` line 9 shows

```ts
export const CATEGORY_RULE_DETAILS = MICRO_LESSON_RULES;
```

`CATEGORY_RULE_DETAILS` is a **re-export of the same object** as
`MICRO_LESSON_RULES` (`ai/fallbacks.ts`), not an independent, disagreeing
second source. The original audit compared `MICRO_LESSON_RULES` against
text that actually lives in a third table, `CATEGORY_SIMPLIFIED_RULE`,
while mislabeling it as `CATEGORY_RULE_DETAILS`. There is **no confirmed
case of two contradicting detailed explanations live in production** —
that specific claim in the original audit was incorrect and is retracted
here, not carried forward into any other Phase 2A document.

The accurate picture: `context-examples.ts` + `ai/fallbacks.ts` together
hold **four layered, mutually-consistent tables**, each covering the same
12 `MicroCategory` values at a different level of detail, none of them in
conflict with the others:

| Table | File | Role | Example (`THIRD_PERSON_SINGULAR`) |
| --- | --- | --- | --- |
| `CATEGORY_SIMPLIFIED_RULE` | `context-examples.ts` | short (1-sentence) version, used for the "Не понял объяснение" panel | «После he/she/it в настоящем времени к глаголу добавляется -s.» |
| `CATEGORY_RULE_FORMULA` | `context-examples.ts` | compact pattern/formula | «he/she/it + глагол-s» |
| `CATEGORY_RULE_DETAILS` = `MICRO_LESSON_RULES` | `context-examples.ts` (re-export) / `ai/fallbacks.ts` (source) | detailed version, used both for "Подробнее о правиле" and as the `MicroLesson` fallback `ruleExplanation` | «В Present Simple к глаголу добавляется -s (или -es), если подлежащее — he, she, it или существительное в единственном числе…» |
| `CATEGORY_ADDITIONAL_EXAMPLE` | `context-examples.ts` | one extra example sentence | «He checks reports every Monday.» |

A fifth table, `MICRO_LESSON_GENERIC_EXERCISES` (`ai/fallbacks.ts:431`),
provides fallback exercises for the same 12 categories — a candidate
source for MVP `ExerciseTemplate` content, not an explanation source.

**The real problem this creates for Grammar MVP is not "reconcile two
disagreeing texts."** It is:

- content is spread across several hardcoded structures with no shared
  identity between them beyond the `MicroCategory` key;
- none of `CATEGORY_SIMPLIFIED_RULE`/`CATEGORY_RULE_FORMULA`/
  `CATEGORY_RULE_DETAILS`/`CATEGORY_ADDITIONAL_EXAMPLE` carries a stable
  `ruleCode`, CEFR level, source citation, reviewer, or version;
- **one `MicroCategory` is too coarse and can contain several distinct
  grammar rules** — e.g. `ARTICLES` alone must resolve to at least four
  MVP rules (`ARTICLE_A_AN`, `ARTICLE_THE_SPECIFIC`, `ARTICLE_ZERO_GENERAL`,
  `SINGULAR_PLURAL_ARTICLE_AGREEMENT`), and the existing tables provide
  one blended text per category, not one per rule;
- there is no source verification, versioning, or editorial lifecycle on
  any of this content;
- `errors` and `micro-lessons` both key off the wide `MicroCategory`,
  never a specific rule.

Grammar MVP's job is therefore to **formalize this layered legacy
content into a structured, verified `GrammarRule`, and decompose each
wide category into its constituent rules** — not to arbitrate a
disagreement that does not actually exist. See
`grammar-mvp-decision-pack.md` for the per-rule short/detailed pair
derived from this layered content, and `editorial-workflow.md` for how
each derivation is sourced and reviewed.

## Content, by module

| Element | File | Purpose | Reusable for Phase 2? | Notes |
| --- | --- | --- | --- | --- |
| `SEED_PHRASES` | `content/seed-phrases.ts` | 31 seed phrases, fields `english/russian/category/cefrLevel/example/hint/tags` | Yes, as backfill source | No `sense`/`partOfSpeech`/`source`/`version` |
| `LESSON_CONTENT`/`WEEK_PLAN` | `content/lesson-content.ts`, `content/week-plan.ts` | 7 fixed day-1..7 lessons, `isValidLessonContent()` runtime validator | Yes, as a structural pattern | Lesson phrases are plain JSON text, not FK to any phrase model |
| `CATEGORY_SIMPLIFIED_RULE` | `errors/context-examples.ts` | short RU explanation, 12 `MicroCategory` | As legacy draft input for `shortExplanationRu` | See "Legacy content is layered, not duplicated" above |
| `CATEGORY_RULE_DETAILS` = `MICRO_LESSON_RULES` | `errors/context-examples.ts` (re-export) / `ai/fallbacks.ts` (source) | detailed RU explanation, same 12 `MicroCategory` — one object, not two | As legacy draft input for `explanationRu` | Same object, not an independent source — see above |
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

## `micro-category.classifier.ts` — precise coverage (read in full for the resolver design)

`micro-category.classifier.ts` (221 lines) is a deterministic, priority-ordered
chain of `if`-checks over `tokens(original)`/`tokens(corrected)` — not AI, not
fuzzy matching. Precise findings that shaped `grammar-resolver-test-cases.md`:

- `ARTICLES` fires when the article set (`a`/`an`/`the`) differs while the
  non-article words match as a multiset — it does **not** distinguish which
  article rule was broken, which is exactly why one `MicroCategory` value
  must resolve to four MVP rule codes, not one.
- `THIRD_PERSON_SINGULAR` only matches a literal `corrected[i] === original[i] + 's'`
  positional pattern. It does **not** catch `do → does`, `have → has`, or
  consonant+y → -ies (`study → studies`) — these fall through to `PRESENT_SIMPLE`
  or `null`/`COLLOCATIONS`. The resolver for `PRESENT_SIMPLE_THIRD_PERSON`
  compensates with its own text-level checks, not by trusting `microCategory`
  alone.
- **There is no branch for modal verbs or do-support in questions/negatives
  anywhere in the file.** `do`/`does`/`did` are checked only inside the
  `MAKE_VS_DO` branch (lexical make-vs-do confusion), not for do-support.
  This is the concrete, code-level confirmation of the `MODAL_BASE_VERB` /
  `DO_DOES_DID_QUESTIONS_NEGATIVES` mapping gap — these errors most often
  fall through to `null` or the final `COLLOCATIONS` catch-all bucket
  (`orig.length <= 4 && corr.length <= 4`).
- `PRESENT_PERFECT` only fires when `have`/`has` is **added** in the
  corrected text and was absent in the original — the reverse direction
  (original wrongly contains `have`/`has`, corrected removes it, e.g. a
  finished-time-marker misuse) is not caught by this branch at all and
  falls through toward the `PAST_SIMPLE` `-ed` check instead.

None of this is a defect to fix in Phase 2A (`Не менять classifier` was out
of scope for this step) — it is the precise, code-grounded basis for the
resolver hints and precedence in `grammar-resolver-test-cases.md`.
