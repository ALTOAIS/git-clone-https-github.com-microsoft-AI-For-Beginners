# Phase 2A — Proposed domain model

> **This document describes a proposed data shape, not a Prisma schema.**
> Field lists below are prose descriptions (name — type in words —
> nullable? — purpose), deliberately not written as `model X { ... }`
> blocks, so nothing here can be copy-pasted as a working migration by
> mistake. No Prisma file has been touched. Implementing this shape is
> out of scope for Phase 2A.

## Governing principle: extend, don't duplicate

The audit (`phase-2a-audit.md`) found that `Phrase`/`UserPhrase` already
implement the "shared content vs. per-user progress" split that the
original Phase 2 brief asked `PhraseEntry`/`UserPhraseProgress` to
provide, and that `Lesson.status` already establishes a per-model
lifecycle-status precedent instead of a shared polymorphic table. Every
recommendation below follows that precedent rather than introducing a
parallel structure. See "Alternatives considered" in each section for
why the more elaborate option was rejected for MVP scale.

## Shared content-status lifecycle (applies to every content model below)

Accepted enum, used identically on `GrammarRule`, `GrammarRuleExample`
(inherits parent status, not independently statused), and
`ReadingContent`. `Phrase` gains the same fields when extended for Phrase
MVP (see `mvp-slices.md`), scoped to `PhraseScope: CURATED_LIBRARY` rows
only.

> **`GrammarRule` diverges from `reviewedBy`/`reviewedAt`/`reviewNotes`/
> `sourceRefs` below, corrected in the implementation-readiness round.**
> For `GrammarRule` specifically, none of these four fields is persisted
> in the DB — Git is the source of truth for reviewer identity/notes/
> sourcing, `contentStatus = REVIEWED` is the compact DB signal a human
> gate passed, and a proposed machine-readable import manifest is what a
> future publish CLI checks. See `grammar-prisma-model-proposal.md`'s
> "Review metadata stays in Git" section. This general shared-lifecycle
> shape is unchanged for `ReadingContent`/`Phrase`, which remain out of
> scope for this correction.

- `contentStatus` — enum, one of `DRAFT` / `REVIEWED` / `PUBLISHED` /
  `ARCHIVED`. Required, defaults to `DRAFT`.
- `version` — integer, required, starts at 1. See `editorial-workflow.md`
  for why this is **not** treated as a full revision history — the
  authoritative history lives in Git, this field is a pointer to "which
  Git-reviewed revision is currently live," not a database-native
  version log.
- `reviewedBy` — string, nullable. **Not** a foreign key to `User`. See
  "Reviewer metadata" below for why.
- `reviewedAt` — datetime, nullable.
- `reviewNotes` — string, nullable — free-text reviewer notes (why
  approved, what was changed, what to double-check later).
- `sourceRefs` — string array (or an equivalently simple validated
  structure) — where the content came from: a URL, a book citation, "AI
  draft + human edit," etc. Not a foreign key; content sourcing is
  documentation, not a relation to another table.

Transition rule, enforced by the CLI (`editorial-workflow.md`), not by
the schema alone: `DRAFT → REVIEWED` requires both `reviewedBy` and
`reviewedAt` to be set in the same operation; `REVIEWED → PUBLISHED` is
a separate, explicit step; `→ ARCHIVED` is reachable from any status and
never deletes the row.

### Reviewer metadata — why not a `User` foreign key

Rejected: `reviewerId` as a foreign key into the existing `User` table.
Reasons, all confirmed by the audit: (1) English Flow has no RBAC or
editor-role concept today — `User` is exclusively "a learner," and
overloading it with an "is this person allowed to review content?" role
would require access-control work this phase explicitly excludes; (2) a
content reviewer is not required to be a learner of the product at all;
(3) no admin UI exists to manage such accounts anyway (also excluded
from Phase 2A/MVP by the brief). A free-text `reviewedBy` string is
sufficient at the current scale (effectively one reviewer) and adds zero
schema coupling that would need to be undone if a real editor-accounts
system is built later.

## GrammarRule

> **This section's field list is the original, prose-level sketch and is
> superseded, not current.** `grammar-prisma-model-proposal.md` is the
> exact, field-by-field Prisma proposal (types, defaults, constraints,
> rationale, checked against the real `schema.prisma`) — read that
> document for implementation-ready detail. **Specifically superseded by
> the implementation-readiness round's final architecture closure:**
> `microCategories` and `resolverHints` below are **not** persisted at
> all in the final model (matching logic lives in version-controlled
> TypeScript matcher functions, not DB JSON); `reviewedBy`/`reviewedAt`
> are also not persisted (Git is the source of truth, see the note
> above). This section is kept only for the original architecture-level
> rationale behind the retrieval-model fix below, not as a current field
> list.

| Field | Type (prose) | Nullable | Purpose |
| --- | --- | --- | --- |
| `ruleCode` | string | No, unique | Stable identifier, e.g. `ARTICLE_A_AN` — see `mvp-slices.md` for the 12 MVP codes |
| `cefrLevel` | enum (reuses existing `CefrLevel`) | No | |
| `titleRu` / `titleEn` | string | No | |
| `shortExplanationRu` | string, 1–2 sentences | No | Shown inline on the error card — formalizes today's `CATEGORY_SIMPLIFIED_RULE` text (`context-examples.ts`) into a per-rule field |
| `explanationRu` | string, longer form | No | Shown in "Подробнее" / inside `MicroLesson` — formalizes today's `CATEGORY_RULE_DETAILS` (a re-export of `MICRO_LESSON_RULES`, same object) into a per-rule field |
| `pattern` | string | No | Form/structure summary, e.g. "modal + base verb, no *to*, no tense marking" |
| `usageConditions` | string | Yes | |
| `signalWords` | string array | Yes | |
| `prerequisites` | string array (of `ruleCode`) | Yes | |
| `typicalMistakes` | string array | Yes | |
| `microCategories` | array of enum values (reuses existing `MicroCategory`) | No, at least one | **Plural, not singular** — see "Fixing the retrieval model" below; one `MicroCategory` can map to several `GrammarRule` rows and, in principle, a rule could be relevant to more than one category |
| `resolverHints` | validated JSON, structured as a small ordered list of `{ conditionType, pattern, priority }` | Yes | Consumed only by `GrammarRuleResolver`, never shown to the user — see `retrieval-architecture.md` |
| `exerciseTemplates` | validated JSON array | Yes | See "ExerciseTemplate" below — JSON field on MVP, not a separate table |
| `errorType` | enum (reuses existing `ErrorType`) | Yes | For cross-reference with the legacy `ErrorRecord.errorType` typing, informational only |
| + shared content-status fields | — | — | See above |

### ExerciseTemplate: separate table vs. JSON field on `GrammarRule`

**Accepted: JSON field on MVP, not a separate table.** At 12 rules with
1–2 exercises each, a dedicated table cannot be queried/filtered
independently in any way the product needs yet, and the JSON is
validated on write (by the CLI, per `editorial-workflow.md`) the same way
`Lesson.contentJson` already is by `isValidLessonContent()` — this is a
repeat of an existing pattern, not a new one. Revisit as a separate table
only if Phase 2 §G expansion (50–70 rules) makes template reuse *across*
rules common enough to need independent querying.

### GrammarRuleExample (separate table — accepted)

| Field | Type (prose) | Nullable | Purpose |
| --- | --- | --- | --- |
| `ruleId` | reference to `GrammarRule` | No | |
| `kind` | enum: `incorrect_correct` / `everyday` / `professional` / `literary` | No | |
| `textRu` | string | Yes | |
| `textEn` | string | No | |

Kept as its own table (unlike `ExerciseTemplate`) because a rule
realistically has several examples across several `kind` values, and
Reading MVP's later cross-linking (`ReadingContent.targetGrammarRuleIds`)
benefits from being able to pull "the professional-register example for
rule X" without parsing JSON.

## Fixing the retrieval model: `MicroCategory` is not `GrammarRule`

The original Phase 2A report proposed
`SELECT * FROM GrammarRule WHERE microCategory = ? LIMIT 1` as the
lookup. **This is rejected** — a `MicroCategory` is a wide bucket that
can contain several distinct rules. Concretely, `ARTICLES` alone must
resolve to at least four different MVP rules: `ARTICLE_A_AN`,
`ARTICLE_THE_SPECIFIC`, `ARTICLE_ZERO_GENERAL`, and
`SINGULAR_PLURAL_ARTICLE_AGREEMENT`. An unconditioned `LIMIT 1` would
return an arbitrary one of these — sometimes the wrong explanation for
the actual mistake. The corrected design (`GrammarRuleResolver`, full
detail in `retrieval-architecture.md` and, for the final corrected
contract, `grammar-resolver-contract.md`) evaluates each candidate
rule's own version-controlled TypeScript matcher against the actual
`originalText`/`correctedText` diff, in deterministic priority order,
and only falls back to a
category-level generic explanation (still not a random row) when no
specific rule matches.

### `ErrorRecord.grammarRuleId` (new, nullable)

| Field | Type (prose) | Nullable | Purpose |
| --- | --- | --- | --- |
| `grammarRuleId` | reference to `GrammarRule` | **Yes** | Set by `GrammarRuleResolver` at classification time when a specific published rule is confidently matched |

- **Relation strategy: `onDelete: SetNull`** (or the safe equivalent —
  never cascade-delete a user's error history because a content row was
  archived). Archiving a `GrammarRule` must never delete or orphan an
  `ErrorRecord`.
- **No backfill required or performed for legacy `ErrorRecord` rows.**
  Every existing record simply keeps `grammarRuleId = null` and continues
  reading from the legacy static fallback chain
  (`context-examples.ts`/`MICRO_LESSON_RULES`) exactly as it does today.
  This is why Grammar MVP is non-destructive: it adds a nullable pointer,
  it does not require touching a single existing row.
- Why this field is *in scope* for Grammar MVP rather than deferred to a
  later iteration: it is the only way to (a) show the specific matched
  rule rather than a whole category, (b) trace which verified source
  produced an explanation, (c) compute "error recurrence after this
  specific rule's explanation" (a Grammar MVP metric — see
  `metrics-observability.md`), and (d) know, later, whether the *same*
  rule was matched again in a *different* sentence — the input to a
  future "recognition-to-production transfer for grammar" measurement,
  parallel to the existing `contextsPassed` mechanism.

### `MicroLesson` — nullable FK vs. `sourceRuleIds` array: recommendation

> **Superseded by the implementation-readiness round's final decision:
> this linkage is deferred entirely, not added to the Grammar MVP
> migration.** The array-vs-FK cardinality reasoning below is still
> correct as *architecture*, and `sourceRuleCodes` (the field's final
> proposed name, keyed on `ruleCode` rather than an internal `id`) is
> the option that would be chosen **if** the field were added — but
> re-checking `micro-lessons.service.ts`'s actual `serialize()` method
> found no current MVP flow that reads any lesson→rule linkage at all.
> A field with no confirmed reader is not persisted speculatively. See
> `grammar-prisma-model-proposal.md`'s "`MicroLesson.sourceRuleCodes` —
> final decision: deferred entirely" section and
> `grammar-implementation-readiness.md` decision #3.

Two options were considered:

1. A single nullable `grammarRuleId` foreign key on `MicroLesson`,
   mirroring `ErrorRecord`.
2. A `sourceRuleIds` string array, server-validated against existing
   `GrammarRule.ruleCode`/id values at write time — mirroring the
   **already-existing** `MicroLesson.sourceErrorIds: String[]` field.

**Recommendation: option 2, `sourceRuleIds` array.** Reasons:
- `MicroLesson.generate()` already draws from up to 5 `ErrorRecord` rows
  in one micro-lesson (`micro-lessons.service.ts generate()`); those
  records can plausibly resolve to more than one specific `GrammarRule`
  within the same category (e.g. a `THIRD_PERSON_SINGULAR` micro-lesson
  built from examples that individually matched two closely related MVP
  rules). A single FK has the wrong cardinality for this from day one.
- `MicroLesson` already has exactly this pattern —
  `sourceErrorIds: String[]` — for its relationship to `ErrorRecord`.
  Adding `sourceRuleIds: String[]` next to it is consistent with an
  existing, working convention, not a new one.
- Server-side validation ("every ID here must exist and be `PUBLISHED`")
  is the same validation `retrieval-architecture.md` already requires for
  any AI-returned source ID — no new validation *concept*, just applying
  it to one more field.

## PhraseScope — the missing distinction between "who owns this phrase" and "how did it get here"

The audit found that `Phrase`/`UserPhrase` already split content from
progress, but that `PhraseSource` (`SEED`/`AI_LESSON`/`MANUAL`/
`SPEAKING`/`UPLOADED_DOCUMENT`/`ERROR_CORRECTION`/`DIAGNOSTIC`) answers
"how did this phrase get created," not "does this phrase belong to the
shared, editorially-governed library, or is it one learner's private
entry." Those are different questions — a `MANUAL` entry today can be
either a curator manually typing a library phrase, or a learner typing
their own personal note; the enum alone can't tell them apart.

**Proposed (Phase 2A documents this; Phase 2A does not implement it —
see `mvp-slices.md` for when it lands):**

| Field | Type (prose) | Nullable | Purpose |
| --- | --- | --- | --- |
| `phraseScope` | enum: `CURATED_LIBRARY` / `PERSONAL` | No, default depends on `source` at creation time | |
| `ownerUserId` | reference to `User` | Required when `phraseScope = PERSONAL`, otherwise null | |

Rules:
- `CURATED_LIBRARY` rows: `ownerUserId = null`; the shared
  content-status fields (`contentStatus`/`version`/`reviewedBy`/…) are
  required and enforced; the normal read API (`GET /phrases`, trainer
  task generation) only ever surfaces rows where `contentStatus =
  PUBLISHED`.
- `PERSONAL` rows: `ownerUserId` required; content-status/reviewer
  fields simply do not apply — nobody is expected to "review" a
  learner's private phrase; visible only to its owner, exactly as all
  `UserPhrase`-linked `Phrase` rows behave today.
- `PhraseSource` is kept unchanged and continues to answer "how did this
  row come to exist" (seed / AI-generated in a lesson / typed by hand /
  from speaking / from an uploaded document / from an error correction /
  from diagnostics) — completely orthogonal to `phraseScope`. A `SEED`
  phrase is always `CURATED_LIBRARY`; a `SPEAKING`-sourced phrase created
  because a learner asked to save something they said is always
  `PERSONAL`; a `MANUAL` phrase could in principle be either, decided at
  creation time by which flow created it (editor CLI vs. learner UI),
  not by the source value itself.

This model is **documented only** in Phase 2A. Phase 2A does not modify
`Phrase`/`UserPhrase`.

## ReadingContent (not `TextMaterial`)

Named `ReadingContent` specifically to avoid colliding with the existing
`UploadedMaterial` model, which is a different concept (private,
per-user uploaded text with no CEFR/source/license fields, no editorial
governance, never intended to be shared).

| Field | Type (prose) | Nullable | Purpose |
| --- | --- | --- | --- |
| `title` | string | No | |
| `body` | string | No | |
| `cefrLevel` | enum (reuses `CefrLevel`) | No | |
| `wordCount` | integer, computed automatically | No | |
| `topic` | string | Yes | |
| `tokenizedVocabularyProfile` | structured JSON — token/lemma list with frequency | No, computed at `DRAFT → REVIEWED` transition | Used by the per-user coverage calculation — see below and `retrieval-architecture.md` |
| `targetPhraseIds` | array of references to `Phrase` | Yes | |
| `targetGrammarRuleIds` | array of references to `GrammarRule` | Yes | |
| `comprehensionQuestions` | structured JSON | No, at least one required to publish | |
| `discussionQuestions` | structured JSON | Yes | |
| `speakingTask` / `summaryTask` | string | Yes (at least one recommended, not hard-required) | |
| `source` | string | **No — required without exception**, no warning-level tolerance | |
| `license` | string | **No — required without exception** | Enforced as a hard publish-blocker, not a review note — see `editorial-workflow.md` |
| + shared content-status fields | — | — | |

### Lexical coverage: intentionally left as an open design question

The original Phase 2A report proposed computing "known vocabulary" as
"the set of `Phrase.englishText` values in the learner's `UserPhrase`
rows where `status != NEW`." **This is rejected as the final algorithm**
— it would understate real vocabulary severely, since a learner's actual
known-word set is much larger than their explicit phrase library (basic
function words, words absorbed passively through diagnostics/lessons/
speaking that were never added as a `Phrase`, etc.).

`ReadingContent.tokenizedVocabularyProfile` is specified above precisely
because it decouples "what words does this text use" (a property of the
text, computed once) from "what does this specific learner know" (a
property of the learner, computed per-request against whichever known-
vocabulary signal is eventually chosen). That known-vocabulary signal
itself is **not finalized here**. Candidate inputs to combine, none
selected yet: a CEFR/diagnostic-derived baseline vocabulary list,
`UserPhrase` entries, words the learner explicitly marks as already
known, words implied by successful reading/review attempts, and word-form/
lemma normalization. The exact combination and algorithm is a dedicated
design task that must happen **before Reading MVP implementation starts**
but explicitly **does not block Grammar MVP or Phrase MVP** — see
`mvp-slices.md` and `decisions.md` (open, non-blocking for Grammar/Phrase).

## User-progress models

### `UserGrammarProgress` — rejected as a new model

Considered and **rejected**: a dedicated `UserGrammarProgress` table
mirroring `UserPhrase`. The audit found that `ErrorRecord` already
carries essentially the same fields a grammar-progress model would need
(`successfulReviewCount`, `contextsPassed`, `practiceStatus`,
`nextPracticeAt`) and is already per-user. Adding `grammarRuleId`
(above) to `ErrorRecord` gives grammar-rule-level progress tracking
without a new table, new migration surface, or new SRS algorithm to
maintain in parallel with the one `errors.service.ts` already runs.
Revisit only if grammar-progress ever needs to exist independent of any
specific `ErrorRecord` (e.g., "practice this rule proactively before you
ever make the mistake") — not a Grammar MVP requirement.

### `UserPhraseProgress` — rejected as a new model

Considered and **rejected** for the same reason as `PhraseEntry`
(domain-model, Phrase section): `UserPhrase` already is this model.
Phrase MVP extends `UserPhrase` with new nullable fields
(`activeRecallScore`, `passiveFamiliarityScore`, `productionSuccessCount`
— exact shape is Phrase MVP scope, not finalized in Phase 2A) rather than
creating a parallel table. `reviewStage`/`nextReviewAt`/`correctCount`/
`incorrectCount` and all `ReviewAttempt` history are explicitly
untouched — see the blocking guarantee in `migration-plan.md`.

### `UserReadingProgress` (new model, genuinely new — no existing equivalent)

| Field | Type (prose) | Nullable | Purpose |
| --- | --- | --- | --- |
| `userId` | reference to `User` | No | |
| `readingContentId` | reference to `ReadingContent` | No | |
| `startedAt` / `completedAt` | datetime | `completedAt` nullable | |
| `comprehensionScore` | number | Yes | |
| `savedPhraseIds` | array of references to `Phrase`/`UserPhrase` | Yes | Which phrases from the text the learner chose to add to SRS |

No existing model covers this — Reading is the one MVP slice without a
reusable progress mechanism, consistent with the audit's finding that it
carries the highest implementation cost of the three slices.

## Governance table alternatives — recap of the accepted decision

A single polymorphic `ContentReview`/`ContentVersion` table (one row per
review event, referencing an arbitrary content type + id) was considered
and **rejected** for MVP. Prisma does not natively support polymorphic
relations; implementing one would require either raw SQL or a separate
join table per content type, which erases the supposed simplification.
The shared content-status fields listed at the top of this document,
repeated per model, are the accepted approach — this is the same
trade-off already made for `Lesson.status` in the existing schema, not a
new one.
