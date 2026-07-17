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
   `explanationRu` (fuller, "Подробнее"/`MicroLesson`) — derived by
   narrowing the relevant slice of the four layered legacy tables
   (`CATEGORY_SIMPLIFIED_RULE`/`CATEGORY_RULE_FORMULA`/
   `CATEGORY_RULE_DETAILS`≡`MICRO_LESSON_RULES`/`CATEGORY_ADDITIONAL_EXAMPLE`)
   down to the specific `ruleCode`, cross-checked against an external
   source, never an automatic verbatim copy. **Correction:** an earlier
   version of this decision described this as "reconciling two diverging
   sources" — `CATEGORY_RULE_DETAILS` and `MICRO_LESSON_RULES` are the
   same object (`context-examples.ts` line 9 re-exports it), not two
   independent, disagreeing sources; see `phase-2a-audit.md` for the
   correction and `grammar-source-verification.md` for the external
   sources used per rule. (`editorial-workflow.md`)
10. **`GrammarRuleResolver`, not a bare category lookup.** A
    `MicroCategory` can map to several `GrammarRule` rows; resolution
    evaluates `resolverHints` in deterministic priority order against
    the actual error diff, never returns an arbitrary row via an
    unconditioned `LIMIT 1`. (`retrieval-architecture.md`)
11. **`ErrorRecord.grammarRuleId`** — new, nullable, `onDelete: SetNull`,
    no backfill required or performed for legacy rows, is in scope for
    Grammar MVP (needed for source traceability, recurrence metrics, and
    future transfer-to-new-context measurement). (`domain-model.md`)
12. **`MicroLesson.sourceRuleCodes`** (string array, server-validated) is
    recommended over a single nullable FK, matching the model's existing
    `sourceErrorIds: String[]` pattern and correctly modeling the
    one-micro-lesson-to-many-rules cardinality. Named `sourceRuleCodes`
    (not `sourceRuleIds`) for consistency with `GrammarRule.ruleCode` as
    the stable, human-readable identifier used everywhere else in this
    design, including in resolver logs. (`domain-model.md`)
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
18. **`GrammarRuleResolver` precedence is diff-specific, not one global
    ordering.** An earlier draft proposed a single global
    `DO_DOES_DID → MODAL` precedence for all cases. Corrected: the
    precedence depends on which token was actually changed in the
    diff — modal-form errors (modal retained, `to`/`-s`/past-tense
    stripped from the following verb) resolve to `MODAL_BASE_VERB`;
    unnecessary do-support before a retained modal (`Does she can
    work?` → `Can she work?`) resolves to `DO_DOES_DID_QUESTIONS_NEGATIVES`
    with `MODAL_BASE_VERB` as a logged secondary candidate; double-marking
    after `did`/`does` (`did went` → `did go`) resolves to
    `DO_DOES_DID_QUESTIONS_NEGATIVES`. Where the diff gives no reliable
    distinguishing signal, `resolvedRuleCode = null`, `ambiguous = true`,
    `LOW` confidence, legacy fallback — never a guess.
    (`grammar-resolver-test-cases.md`)
19. **No `HIGH` confidence from a single weak signal.** Corrected: earlier
    resolver hints allowed `HIGH` confidence purely from a word ending in
    `-s`/`-es`, a single signal word, sentence length, or landing in the
    generic `COLLOCATIONS` fallback bucket. `HIGH` now requires a
    structural diff (modal + changed verb form; `did`/`does` + changed
    main verb; explicit article insertion/removal with a reliable number
    signal; a known-uncountable noun from a reviewed lexicon; an exact
    curated preposition pattern; same tokens in a changed order).
    Suffix-only or single-signal-word matches are capped at `MEDIUM`/`LOW`
    with fallback. In particular, `SINGULAR_PLURAL_ARTICLE_AGREEMENT`
    no longer claims `HIGH` confidence from a bare `-s`/`-es` suffix check
    — nouns like `business`, `class`, `analysis`, `series`, `species`,
    `news` end in `-s`/are irregular and are not plural for this purpose
    (confirmed via Cambridge Dictionary — `news` takes a singular verb;
    `series`/`species` share one form for singular and plural).
    (`grammar-resolver-test-cases.md`)
20. **External source verification attempted for all 12 rules, not 6 —
    status is `PARTIAL`, corrected from an earlier, wrong `DONE` claim.**
    Primarily British Council LearnEnglish and Cambridge Dictionary
    Grammar (per the requested source priority); Oxford Learner's
    Dictionaries added this round for `ARTICLE_ZERO_GENERAL`'s
    previously-missing second source. **Correction:** this session's
    egress policy blocks `WebFetch` (and raw `curl`) to external hosts
    generally — confirmed host-agnostic by testing Cambridge, British
    Council, Oxford, Wikipedia, and Google, all identically blocked at
    the proxy `CONNECT` stage — so no rule can currently reach
    `VERIFIED_DIRECTLY` or `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`;
    every rule is `PARTIALLY_VERIFIED` (search-indexed snippets only).
    See `grammar-source-verification.md` for the 4-tier status
    definition, the full citation list, and two content corrections the
    search surfaced that were not in any legacy content: `much` reads as
    formal/literary in affirmative sentences (Cambridge Dictionary) —
    `a lot of` is the more natural default; and `arrive home/here/there`
    take no preposition at all (Cambridge Dictionary), a nuance absent
    from the original `BASIC_PREPOSITION_PATTERNS` draft.
21. **Three gates for Grammar MVP rules, not one — corrected from an
    earlier two-gate framing that itself conflated AI recommendation
    with human decision.** `grammar-rules-human-review.md` tracks (1) AI
    documentation recommendation — this review pass's own judgment,
    explicitly labeled as AI output, never worded as "approved"; (2)
    human documentation decision — an actual human reviewer's call,
    `PENDING HUMAN REVIEW` until a human acts; (3) production publication
    decision — is the rule cleared to be seeded as `PUBLISHED` content
    real users will see, `NOT APPROVED` for all 12 rules regardless of
    gates 1 or 2. None of the three is inferred from another.
22. **First real human documentation review recorded — 5 of 12 rules,
    not all 12.** A product owner, reviewing as a learner/user, issued
    documentation decisions for the 5 rules flagged highest-risk:
    `ARTICLE_THE_SPECIFIC` (`APPROVE`), `ARTICLE_ZERO_GENERAL` (`APPROVE
    AFTER REVISION` — required the four-way comparison table and the
    singular-countable-noun constraint before approval), `PAST_SIMPLE_VS_
    PRESENT_PERFECT` (`APPROVE AFTER REVISION` — required the
    four-situation Present Perfect framework and the no-date-≠-
    automatically-Present-Perfect constraint before approval),
    `BASIC_PREPOSITION_PATTERNS` (`APPROVE` — required the explicit
    arrive-in/arrive-at examples), `COUNTABLE_UNCOUNTABLE` (`APPROVE WITH
    CAVEAT` — required the contextual-countability caveat naming
    countable senses for evidence/research/feedback/software/work/
    knowledge). The remaining 7 rules were **not** reviewed and stay
    `PENDING HUMAN REVIEW` — this decision is not extrapolated to rules
    the reviewer did not examine. **Human documentation `APPROVE` does
    not authorize production seed, publication, activation, or
    deployment**, and does not upgrade any rule's source-verification
    status past `PARTIALLY_VERIFIED` — the `good at`/`listen to`
    (`BASIC_PREPOSITION_PATTERNS`) and `feedback` (`COUNTABLE_UNCOUNTABLE`)
    evidence gaps remain open regardless of this documentation approval.
    See `grammar-rules-human-review.md` for the full per-rule table and
    `grammar-mvp-decision-pack.md` for the revised rule content.

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
10. **Treating any single layered legacy table (`CATEGORY_SIMPLIFIED_RULE`/
    `CATEGORY_RULE_FORMULA`/`CATEGORY_RULE_DETAILS`/
    `CATEGORY_ADDITIONAL_EXAMPLE`) as sufficient on its own, without
    external verification or decomposition to rule-level.** Rejected —
    each table is one paragraph per wide `MicroCategory`, not per
    `ruleCode`, and none carries a source citation. **Correction:** this
    was previously framed as "the two sources disagree" — they do not;
    `CATEGORY_RULE_DETAILS` is a re-export of `MICRO_LESSON_RULES`, the
    same object (see `phase-2a-audit.md`). The actual reason none of the
    four tables is canonical on its own is that they are category-level,
    unsourced, and unreviewed — not that they conflict.
    (`editorial-workflow.md`)
11. **CEFR sub-levels (`A1_PLUS`, `A2_PLUS`, `B1_PLUS`) invented for
    Grammar MVP drafts.** Not applicable — direct verification of
    `backend/prisma/schema.prisma` confirms `CefrLevel` already contains
    `A1`, `A1_PLUS`, `A2`, `A2_PLUS`, `B1`, `B1_PLUS`, `B2`, `C1` as real
    enum values, not invented ones. An instruction to avoid them in this
    review round was based on an incorrect premise about the schema;
    corrected here rather than silently followed — see
    `grammar-mvp-decision-pack.md` for the per-rule CEFR assignment,
    which continues to use these real enum values where they fit best.

## Open (non-blocking)

1. Whether `Phrase.cefrLevel` (currently unused by any retrieval filter)
   is activated for Phrase MVP retrieval filtering on day one, or stays
   decorative a while longer.
2. Whether `MicroCategory` needs two new enum values for
   `MODAL_BASE_VERB` (rule #7) and `DO_DOES_DID_QUESTIONS_NEGATIVES`
   (rule #10), which don't map cleanly to any of the current 12
   `MicroCategory` values — see `mvp-slices.md`. This is open for Phase
   2A documentation purposes and does not block writing these two rules'
   documentation or importing them as `DRAFT` rows via the editorial
   CLI; it will need resolving before the resolver can auto-activate or
   publish those two specific rules for real users (see "Blocking" →
   "Blocks publication/activation" for the corrected, narrower scope of
   this gap).
3. Whether `ReadingContent.tokenizedVocabularyProfile` should be
   recomputed whenever a learner's known-vocabulary signal changes, or
   whether coverage should be computed fully on-the-fly without any
   precomputed profile at all.
4. Whether a "content freshness" metric (time since a published item was
   last reviewed) is worth adding to `metrics-observability.md` now or
   later.

## Blocking (must be resolved before named implementation can start)

**Corrected this round:** blockers are now split by which stage they
actually block, per an explicit instruction that the `MicroCategory`
mapping gap for rules #7/#10 was previously mis-described as a single
undifferentiated blocker. It does not block drafting or importing those
two rules as `DRAFT` — only their resolver activation for real users.

### Blocks documentation commit

**Empty.** Nothing currently blocks committing the Phase 2A / Grammar
MVP documentation itself — that is what this round's work product is.

### Blocks Grammar implementation (schema, migration, code, tests)

1. **Canonical text per MVP rule** — content-documentation drafts and
   source-verification attempts are complete (status `PARTIAL`, see
   item #20 above); this alone does not unblock implementation.
2. **The `GrammarRuleResolver`'s final implementation** — the
   diff-specific precedence and morphology-safety design in
   `grammar-resolver-test-cases.md` is a plan, not code; nothing has
   been built or unit-tested yet.
3. **The migration itself** — `grammar-migration-dry-run-plan.md` is a
   plan only, explicitly `NOT EXECUTED`; no migration file exists.
4. **Tests** — none exist yet for any part of Grammar MVP (resolver,
   migration, editorial CLI).
5. **The editorial CLI** — does not exist yet; needed to import the 12
   `DRAFT` rows once documentation is human-approved.

### Blocks publication/activation (a rule going live for real users)

1. **Human-approved content** — `grammar-rules-human-review.md`'s human
   documentation decision is `PENDING HUMAN REVIEW` for all 12 rules; no
   human has acted yet.
2. **Source verification reaching a stronger tier than `PARTIAL`** — not
   strictly required to publish (a product owner could accept
   `PARTIALLY_VERIFIED` sourcing as sufficient), but should be an
   explicit part of the go/no-go decision, not silently assumed away.
3. **The `MicroCategory` mapping gap for `MODAL_BASE_VERB` (rule #7) and
   `DO_DOES_DID_QUESTIONS_NEGATIVES` (rule #10)** (see "Open" #2) —
   **corrected scope:** this blocks the resolver from ever
   auto-activating these two rules for a real user's error, and blocks
   publishing them as `PUBLISHED`. It does **not** block writing their
   documentation (already done) or importing them as `DRAFT` rows via
   the editorial CLI once it exists — those are documentation/import
   operations, not activation.
4. **Production seed/publish approval for all 12 Grammar MVP rules** —
   separate and later than the human documentation decision; **`NOT
   APPROVED`** for all 12 as of this round, tracked per rule in
   `grammar-rules-human-review.md`.

### Blocks Phrase MVP

1. **Confirmation that the Phrase MVP migration plan's guarantee
   (`UserPhrase`/`ReviewAttempt` untouched) has been dry-run and verified**
   before it touches any environment with real user data.
2. **The `PhraseScope` split must exist before Phrase MVP content
   migration**, otherwise governance fields would be meaninglessly
   applied to personal, non-curated phrases.

### Blocks Reading MVP

1. **The lexical-coverage/known-vocabulary-signal design task** — does
   not block Grammar or Phrase MVP.
