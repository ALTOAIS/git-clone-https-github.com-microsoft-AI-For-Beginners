# Phase 2A — Legacy migration plan

This is a plan only. No migration has been written or run. No `DROP`
statement appears anywhere in this document or is proposed by it.
Nothing in this plan deletes production data.

For Grammar MVP specifically, `grammar-migration-execution-plan.md` has
the exact expected SQL for the **5** additive schema steps (enums,
`GrammarRule`, `GrammarRuleExample`, `ErrorRecord.grammarRuleId`,
`ErrorRecord.grammarResolverVersion`), written to match the real style
of the 5 existing migration files — still a plan, still `NOT EXECUTED`.
**Corrected in the implementation-readiness round's final architecture
closure:** `MicroLesson.sourceRuleCodes` is no longer part of this
migration at all — deferred entirely, since no current MVP flow reads a
lesson→rule linkage (see `grammar-implementation-readiness.md` decision
#3). This document stays the higher-level legacy-content migration plan
(what happens to `context-examples.ts`/`ai/fallbacks.ts` content,
described in the table below).

## Blocking guarantee — Phrase/UserPhrase

Stated explicitly because it is the one migration among the three MVP
slices with real risk to a live, working feature (Phrase SRS):

> **Phrase MVP migration does not change or recompute:**
> `UserPhrase.reviewStage`, `UserPhrase.nextReviewAt`,
> `UserPhrase.correctCount`, `UserPhrase.incorrectCount`, or any
> `ReviewAttempt` history row.

Everything Phrase MVP adds (governance fields, `phraseScope`, the
active/passive progress fields on `UserPhrase` — see `domain-model.md`)
is additive: new nullable columns with safe defaults, applied via
`ALTER TABLE ... ADD COLUMN`. No existing column on `Phrase` or
`UserPhrase` is renamed, retyped, or recomputed by this plan. This is a
prerequisite for Phrase MVP implementation to begin, not a nice-to-have
— see `decisions.md` (blocking question).

## Per-legacy-item plan

| Legacy data | Action | Backfill | Nullable compatibility | Rollback | Success criterion |
| --- | --- | --- | --- | --- | --- |
| 31 `Phrase` rows (`seed-phrases.ts`) | **Map** — extend in place, not moved to a new table | `contentStatus='PUBLISHED'`, `version=1`, `phraseScope='CURATED_LIBRARY'`, `sourceRefs=['seed-phrases.ts']` for all 31 | New fields (`sense`, `partOfSpeech`, etc.) nullable, warning-level only, do not block reads | Reverse migration removes only the newly-added, still-empty columns; pre-existing `Phrase`/`UserPhrase` columns and all row data are never touched, so there is nothing to lose even in the worst case | All 31 phrases readable through the existing `GET /phrases` response shape unchanged for pre-existing fields |
| `UserPhrase` progress (all users) | **Leave as is** | None | N/A | N/A — not part of this migration | Zero `UserPhrase` rows modified, checked by row-count and checksum comparison before/after |
| `ReviewAttempt` history (all users) | **Leave as is** | None | N/A | N/A | Zero rows modified |
| `context-examples.ts` (`CATEGORY_SIMPLIFIED_RULE`/`CATEGORY_RULE_FORMULA`/`CATEGORY_RULE_DETAILS`) + `ai/fallbacks.ts` (`MICRO_LESSON_RULES` — same object as `CATEGORY_RULE_DETAILS`, not a second source) | **Map** for the 12 MVP rule codes' categories, **leave as legacy** for any category outside MVP scope | Manual — human review per rule, per `editorial-workflow.md`: narrow each wide-category legacy text down to the specific `ruleCode`, cross-check against an external source (`grammar-source-verification.md`), never copy verbatim (the legacy text is one blended paragraph per category, not one per rule — see `phase-2a-audit.md` "Legacy content is layered, not duplicated") | `buildHelpDetails()` keeps working unmodified as the fallback for any category Grammar MVP does not cover | Do not switch `errors.service.ts` to read from `GrammarRule` for a category until its rule(s) are `PUBLISHED` and spot-checked | Line-by-line comparison confirms the new `shortExplanationRu`/`explanationRu` pair for each of the 12 rules was deliberately reviewed and source-cited, not silently copied |
| `MICRO_LESSON_GENERIC_EXERCISES` (`ai/fallbacks.ts`) | **Map** (feeds `GrammarRule.exerciseTemplates` for the same 12 rules — not a separate migration target) | Manual review, same process as above | `generateMicroLessonFallback()` keeps working unmodified for uncovered categories | Same principle | Same principle |
| `MicroLesson.contentJson` (already-created rows, all users) | **Leave as legacy** | None — historical rows are not rewritten | N/A — **corrected this round:** `sourceRuleCodes` is not part of this migration at all (deferred entirely, no confirmed MVP reader, see above) | N/A | `MicroLessonsService.getById()` continues to work unmodified for pre-existing rows |
| `Lesson.contentJson` (7 seed lessons + any AI-generated/user lessons) | **Leave as legacy.** New lessons *may* begin referencing `PhraseEntry`/`GrammarRule` once Grammar/Phrase MVP exist (Phase 2 §F, out of Phase 2A scope) | None | `isValidLessonContent()` contract unchanged in Phase 2A | N/A | The 7 seed lessons and every existing `LessonAttempt` continue to work unmodified |
| `ErrorRecord` rows predating the source-context migration (PR #34) | **Leave as legacy** — already resolved by the existing honest-fallback UI from PR #34; Grammar MVP adds `grammarRuleId` (nullable, defaults to null, no backfill) alongside this, does not reopen it | None (already done in a prior PR) | Already nullable, already has a fallback UI | Already shipped, not part of this plan | Not regressing — confirmed unchanged by this plan |
| `UploadedMaterial` (all users) | **Leave as legacy, permanently** — different purpose from `ReadingContent`, never migrated into it | None | N/A | N/A | Zero rows touched, zero schema change to this model |
| Existing AI-generated runtime `Lesson`/`MicroLesson` rows | **Leave as legacy** | None | N/A | N/A | Unchanged |

## Explicit non-goals of this plan

- No existing row is deleted.
- No existing column is renamed or retyped.
- No existing user-facing API response shape is broken for a field that
  already exists (new fields are additive).
- No `ErrorRecord`, `UserPhrase`, or `ReviewAttempt` row is backfilled
  with a computed/guessed value it didn't already have — nullable fields
  stay null until a real event (a `GrammarRuleResolver` match, a Phrase
  MVP activity) sets them.
