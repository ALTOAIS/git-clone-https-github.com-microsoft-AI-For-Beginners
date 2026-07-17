# Phase 2A — Architecture decisions

ADR-style log. Statuses: **Accepted** (settled, documented across the
other files), **Deferred** (explicitly not decided now, with a named
trigger for revisiting), **Rejected** (considered and explicitly not
chosen, with the reason), **Open** (unresolved, does not block Phase 2A
documentation or any specific MVP slice yet), **Blocking** (must be
resolved before a named piece of implementation can start).

## Accepted

1. **Build order:** Grammar MVP → Phrase MVP → Reading MVP. (`mvp-slices.md`)
2. **Grammar MVP** uses a new `GrammarRule`, a separate `GrammarRuleExample`
   table, and `ExerciseTemplate` content as a validated JSON field inside
   `GrammarRule` for MVP only (not a separate table). It reuses the
   existing `errors` module SRS/mastery mechanism unmodified. (`domain-model.md`)
3. **Phrase MVP** extends the existing `Phrase` and `UserPhrase` models.
   It does **not** create parallel `PhraseEntry`/`UserPhraseProgress`
   tables, and does not rewrite the existing SRS algorithm or
   `ReviewAttempt` history. (`domain-model.md`, `migration-plan.md`)
4. **Governance fields** (`contentStatus`/`version`/`reviewedBy`/
   `reviewedAt`/`reviewNotes`/`sourceRefs`) live directly on each content
   model. No polymorphic `ContentReview` table for MVP. (`domain-model.md`)
5. **Retrieval** is deterministic SQL for all three MVP flows. No
   embeddings, no vector database, no full-text search on MVP. AI never
   selects verified content on its own — it only adapts wording around
   content a deterministic stage already picked, with every AI-returned
   source ID validated server-side. (`retrieval-architecture.md`)
6. **Editorial workflow** is CLI/scripts only. No admin UI, no RBAC, in
   MVP. (`editorial-workflow.md`)
7. **New reading-content model is named `ReadingContent`**, not
   `TextMaterial` — avoids collision with the existing, differently-purposed
   `UploadedMaterial` model. (`domain-model.md`)
8. **Expansion (§G)** — growing past the 12/100–150/10–15 MVP numbers is
   allowed only after production validation of **all three** mandatory
   MVP slices, plus a minimal editorial/quality pipeline actually
   operating on real content. (`mvp-slices.md`)
9. **Canonical grammar explanations have two lengths** —
   `shortExplanationRu` (1–2 sentences, inline error card) and
   `explanationRu` (fuller, "Подробнее"/`MicroLesson`) — derived from
   deliberate human reconciliation of the two diverging legacy sources,
   never an automatic copy of either. (`editorial-workflow.md`)
10. **`GrammarRuleResolver`, not a bare category lookup.** A
    `MicroCategory` can map to several `GrammarRule` rows; resolution
    evaluates `resolverHints` in deterministic priority order against
    the actual error diff, never returns an arbitrary row via an
    unconditioned `LIMIT 1`. (`retrieval-architecture.md`)
11. **`ErrorRecord.grammarRuleId`** — new, nullable, `onDelete: SetNull`,
    no backfill required or performed for legacy rows, is in scope for
    Grammar MVP (needed for source traceability, recurrence metrics, and
    future transfer-to-new-context measurement). (`domain-model.md`)
12. **`MicroLesson.sourceRuleIds`** (string array, server-validated) is
    recommended over a single nullable FK, matching the model's existing
    `sourceErrorIds: String[]` pattern and correctly modeling the
    one-micro-lesson-to-many-rules cardinality. (`domain-model.md`)
13. **Reviewer metadata is `reviewedBy`/`reviewedAt`/`reviewNotes`/
    `sourceRefs`, not a `reviewerId` foreign key to `User`.** No RBAC
    exists; a reviewer need not be a product learner; no admin UI exists
    to manage such accounts. (`domain-model.md`)
14. **`PhraseScope` (`CURATED_LIBRARY`/`PERSONAL`) is the correct
    distinction for editorial governance**, not `PhraseSource` alone —
    `PhraseSource` answers "how did this row get created," `phraseScope`
    answers "does editorial governance apply to it." Documented now;
    **not implemented in Phase 2A** — implementation is Phrase MVP scope. (`domain-model.md`)
15. **Versioning is Git-backed for MVP.** The database holds the current
    published snapshot; the reviewed content definition lives in a
    version-controlled file; the CLI is the only writer to `PUBLISHED`
    rows; rollback re-applies a prior Git revision. A single mutable
    `version` integer alone is explicitly **not** claimed to be a
    revision history. (`editorial-workflow.md`)
16. **Lexical coverage is a per-user computation against
    `ReadingContent.tokenizedVocabularyProfile`, not a stored field on
    the content row, and not reducible to `UserPhrase` alone.** The exact
    known-vocabulary signal is deferred (see below). (`domain-model.md`)
17. **Content status lifecycle:** `DRAFT → REVIEWED → PUBLISHED →
    ARCHIVED`; AI creates only `DRAFT`; automated validation never
    advances status; `REVIEWED` requires `reviewedBy`+`reviewedAt`
    together; normal user-facing API returns only `PUBLISHED`; `ARCHIVED`
    never deletes a row or breaks user progress; `PUBLISHED` content is
    never edited directly in the production database. (`editorial-workflow.md`)

## Deferred

1. **`ExerciseTemplate` as its own table.** Deferred until Phase 2 §G
   volume (50–70 rules) makes cross-rule template reuse common enough to
   need independent querying. Trigger: demonstrated need, not a
   timeline. (`domain-model.md`)
2. **A dedicated content revision/event-log table (`GrammarRuleRevision`
   or general equivalent).** Deferred until a future phase needs a
   queryable in-product audit log, in-product diff view, or concurrent-
   draft editing — none of which Phase 2A/MVP requires. (`editorial-workflow.md`)
3. **`PhraseScope` implementation** (the model is decided; the migration
   is not part of Phase 2A — it lands with Phrase MVP). (`domain-model.md`)
4. **The exact lexical-coverage algorithm and known-vocabulary signal
   combination** for Reading. Explicitly a dedicated design task before
   Reading MVP implementation starts; does not block Grammar or Phrase
   MVP. (`domain-model.md`, `mvp-slices.md`)
5. **Admin UI and RBAC.** Deferred until reviewer count or workflow
   volume outgrows what CLI/scripts can handle — no trigger date, driven
   by actual pain, not a plan.

## Rejected

1. **`SELECT ... WHERE microCategory = ? LIMIT 1` as the Grammar
   retrieval architecture.** Rejected — `MicroCategory` is a wide bucket
   that can contain several distinct rules; an unconditioned `LIMIT 1`
   can return the wrong rule for the actual mistake. Replaced by
   `GrammarRuleResolver`. (`retrieval-architecture.md`)
2. **New `PhraseEntry`/`UserPhraseProgress` tables parallel to
   `Phrase`/`UserPhrase`.** Rejected — the audit found `Phrase`/
   `UserPhrase` already implement the content/progress split; a parallel
   structure would duplicate a working, tested mechanism and require a
   risky migration of live SRS state for no benefit. (`domain-model.md`)
3. **A single `reviewerId` foreign key to `User`.** Rejected — no RBAC,
   no admin UI, reviewer need not be a learner. (`domain-model.md`)
4. **Embeddings/vector database for retrieval.** Rejected for MVP scale
   — none of the three MVP flows needs fuzzy semantic matching; adds
   infrastructure, latency, and cost with no retrieval-quality benefit at
   12/100–150/10–15 rows, and extension availability on the current
   free-tier Postgres provider isn't even confirmed. (`retrieval-architecture.md`)
5. **Full-text search for MVP.** Rejected for the same scale reason as
   embeddings — exact CEFR/category/topic filtering is sufficient at
   current volume. (`retrieval-architecture.md`)
6. **A single polymorphic `ContentReview`/`ContentVersion` table.**
   Rejected — Prisma has no native polymorphic-relation support; the
   workaround (raw SQL or per-type join tables) erases the intended
   simplification. Per-model status fields, matching the existing
   `Lesson.status` precedent, chosen instead. (`domain-model.md`)
7. **Admin UI for content review in Phase 2A/MVP.** Rejected for this
   phase specifically per the brief's explicit instruction; see
   "Deferred" above for the actual future trigger.
8. **A plain mutable `version` integer as the entire versioning
   story**, with no Git backing. Rejected as insufficient — it does not,
   by itself, provide rollback. Replaced by the Git-backed approach.
   (`editorial-workflow.md`)
9. **Known-vocabulary signal reduced to only `UserPhrase` rows with
   `status != NEW`.** Rejected — would understate real learner
   vocabulary substantially. Left as an open design task instead of a
   premature final answer. (`domain-model.md`)
10. **Automatically treating either legacy grammar-explanation source
    (`CATEGORY_RULE_DETAILS` or `MICRO_LESSON_RULES`) as canonical.**
    Rejected — the two sources are confirmed to disagree; canonicalizing
    one without review would just formalize an arbitrary, unreviewed
    choice. Both are legacy drafts feeding a human-reviewed merge instead.
    (`editorial-workflow.md`)

## Open (non-blocking)

1. Whether `Phrase.cefrLevel` (currently unused by any retrieval filter)
   is activated for Phrase MVP retrieval filtering on day one, or stays
   decorative a while longer.
2. Whether `MicroCategory` needs two new enum values for
   `MODAL_BASE_VERB` (rule #7) and `DO_DOES_DID_QUESTIONS_NEGATIVES`
   (rule #10), which don't map cleanly to any of the current 12
   `MicroCategory` values — see `mvp-slices.md`. This is open for Phase
   2A documentation purposes but will need resolving before Grammar MVP
   implementation can seed those two specific rules (see "Blocking"
   below for the implementation-time version of this question).
3. Whether `ReadingContent.tokenizedVocabularyProfile` should be
   recomputed whenever a learner's known-vocabulary signal changes, or
   whether coverage should be computed fully on-the-fly without any
   precomputed profile at all.
4. Whether a "content freshness" metric (time since a published item was
   last reviewed) is worth adding to `metrics-observability.md` now or
   later.

## Blocking (must be resolved before named implementation can start)

1. **Canonical text per MVP rule (which parts of `CATEGORY_RULE_DETAILS`
   vs. `MICRO_LESSON_RULES` to keep, per rule).** Blocks: authoring the
   12 rules' seed content. Does not block: the schema/migration itself.
2. **Confirmation that the Phrase MVP migration plan's guarantee
   (`UserPhrase`/`ReviewAttempt` untouched) has been dry-run and verified
   before it touches any environment with real user data.** Blocks:
   Phrase MVP implementation start.
3. **The `PhraseScope` split must exist before Phrase MVP content
   migration**, otherwise governance fields would be meaninglessly
   applied to personal, non-curated phrases. Blocks: Phrase MVP.
4. **The lexical-coverage/known-vocabulary-signal design task.** Blocks:
   Reading MVP implementation start only — does not block Grammar or
   Phrase MVP.
5. **Resolution of the `MicroCategory` mapping gap for rules #7 and #10**
   (see "Open" #2 above) — this becomes blocking specifically at the
   point of seeding those two rules' content, not for the rest of
   Grammar MVP.
