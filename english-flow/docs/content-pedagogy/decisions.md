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
    knowledge). At the time of this decision the remaining 7 rules were
    **not** reviewed and stayed `PENDING HUMAN REVIEW` — that decision
    was not extrapolated to rules the reviewer had not examined. **See
    item #23 below: the remaining 7 rules have since been reviewed and
    approved in a later round** — this item is kept as the historical
    record of round 1 and is not itself edited to reflect that. **Human
    documentation `APPROVE` does not authorize production seed,
    publication, activation, or deployment**, and does not upgrade any
    rule's source-verification status past `PARTIALLY_VERIFIED` — the
    `good at`/`listen to` (`BASIC_PREPOSITION_PATTERNS`) and `feedback`
    (`COUNTABLE_UNCOUNTABLE`) evidence gaps remain open regardless of
    documentation approval. See `grammar-rules-human-review.md` for the
    full per-rule table and `grammar-mvp-decision-pack.md` for the
    revised rule content.
23. **Human documentation review completed for all 12 rules — round 2.**
    The same product owner, reviewing as a learner/user, reviewed the
    remaining 7 rules (`ARTICLE_A_AN`, `PRESENT_SIMPLE_THIRD_PERSON`,
    `PAST_SIMPLE_FORM`, `MODAL_BASE_VERB`, `BASIC_WORD_ORDER`,
    `DO_DOES_DID_QUESTIONS_NEGATIVES`, `SINGULAR_PLURAL_ARTICLE_AGREEMENT`)
    and issued `APPROVE` for all 7, stated basis: "All remaining rules
    are OK." **Human documentation review is now `COMPLETE` — 12 of 12
    rules reviewed, 12 of 12 approved as an `APPROVE`-family decision, 0
    remaining `PENDING HUMAN REVIEW`.** This does **not** change: source
    verification (`grammar-source-verification.md`, remains `PARTIAL`);
    production publication decision (remains `NOT APPROVED` for all 12,
    no exceptions); the `MicroCategory` mapping gap for `MODAL_BASE_VERB`/
    `DO_DOES_DID_QUESTIONS_NEGATIVES` (`MODAL_BASE_VERB`'s human review
    note explicitly restates this gap is unresolved); or any
    implementation/resolver/migration blocker. See
    `grammar-rules-human-review.md` for the complete 12-row table and
    `grammar-mvp-decision-pack.md` for each rule's human review note.
24. **`MicroCategory` strategy for `MODAL_BASE_VERB`/`DO_DOES_DID_QUESTIONS_NEGATIVES` — corrected within this same round, not carried forward as written.**
    ~~The initial version of this item recommended tagging
    `MODAL_BASE_VERB.microCategories = [PREPOSITIONS,
    THIRD_PERSON_SINGULAR, PAST_SIMPLE]` and
    `DO_DOES_DID_QUESTIONS_NEGATIVES.microCategories =
    [THIRD_PERSON_SINGULAR, PRESENT_SIMPLE]` as a mapping to apply.~~
    **That recommendation was wrong and is retracted, not softened.**
    Those legacy categories are not semantically true of either rule —
    they are an artifact of the legacy classifier's coarse,
    vocabulary-short-circuited heuristics misrouting specific error
    *shapes*, not evidence of a real grammatical relationship. Presenting
    them as a tagging recommendation would have created a fake
    multi-category mapping, the same class of error
    (`CATEGORY_RULE_DETAILS`/`MICRO_LESSON_RULES`, applied to schema
    instead of content) this whole document set exists to eliminate.

    **Corrected decision:** legacy `MicroCategory` stays exactly as-is —
    coarse, backward-compatible, unrenamed, unextended, never treated as
    an accurate grammar-rule identifier. `GrammarRule.ruleCode` is a
    genuinely independent, more precise classification with no
    obligation to align with `MicroCategory` at all.
    `MODAL_BASE_VERB.microCategories` and
    `DO_DOES_DID_QUESTIONS_NEGATIVES.microCategories` stay **empty
    arrays** — correct, not unresolved. This is made possible by a
    corresponding pipeline correction (`grammar-resolver-contract.md`):
    the resolver's candidate-set query is no longer filtered by
    `microCategories` at all (`WHERE contentStatus = 'PUBLISHED'` only,
    trivial at 12–15 rows) — `existingMicroCategory` becomes one weak,
    optional input signal a rule's own `resolverHints` may reference,
    never a mandatory filter that gates candidacy.

    The classifier-tracing work itself (running the real, unmodified
    `classifyMicroCategory()` against worked examples via a temporary
    Jest spec, created and deleted in this session) is **kept and
    correctly relabeled**: `MODAL_BASE_VERB`'s errors legacy-classify as
    `PREPOSITIONS`/`THIRD_PERSON_SINGULAR`/`PAST_SIMPLE` depending on
    pattern; `DO_DOES_DID_QUESTIONS_NEGATIVES`'s legacy-classify as
    `THIRD_PERSON_SINGULAR`/`PRESENT_SIMPLE`/`null`. These are **legacy
    classifier compatibility findings and regression-test inputs**, not
    semantic tags and not a mapping recommendation — see
    `grammar-resolver-contract.md`'s corrected precedence matrix.

    The `null` case (`did`+irregular verb) is **reclassified from
    "implementation blocker" to "activation-quality risk."** Under the
    corrected (non-category-gated) pipeline, `DO_DOES_DID_QUESTIONS_NEGATIVES`
    *is* a structural candidate for this diff — whether it resolves
    depends on `resolverHints` design and diff-extraction quality, an
    implementation/test question addressed once real code exists, not a
    schema-level unreachability. See "Blocking" below for the corrected
    scope.
25. **`GrammarRuleResolver` interface accepted as a design contract, not
    implemented — candidate-set logic corrected within this round (see
    item #24).** `resolve(input): output`, pure deterministic function,
    no AI call inside it anywhere, 3 distinct `fallbackReason` values
    (`NO_CANDIDATES`/`AMBIGUOUS_TIE`/`NO_STRUCTURAL_MATCH`) replacing the
    single implicit "no match" case in earlier drafts.
    `NO_CANDIDATES`'s meaning corrected: it now means the `PUBLISHED`
    catalog is empty, not "no rule tagged this category" (that framing
    assumed the now-removed category filter). Input's diff contract
    concretized as `GrammarDiff`/`DiffOperation[]` — token-level
    insert/delete/replace/move, buildable without any new NLP dependency
    (confirmed none exists in `backend/package.json`); grammatical
    features explicitly deferred. See `grammar-resolver-contract.md`.
26. **Exact additive migration SQL drafted, matching the real style of
    the 5 existing migration files — still not executed, field list
    corrected to 19 Tier-1 fields (see item #28 below), then further
    corrected to 16 scalar fields and 5 steps, not 6 (see item #29).**
    Original 6 steps: 3 new enums (governance × 2 + example types × 1),
    `GrammarRule`, `GrammarRuleExample`, `ErrorRecord.grammarRuleId`,
    `MicroLesson.sourceRuleCodes`. See
    `grammar-migration-execution-plan.md`, which now also states the
    Postgres enum-value-rollback limitation and splits rollback into 4
    categories (application/feature-deactivation/data-preserving/schema),
    explicitly warning that the per-step `DROP` SQL is safe only in a
    genuine pre-data rehearsal, never once real editorial content
    exists. This is additive detail on top of the already-accepted
    `grammar-migration-dry-run-plan.md`, not a replacement for it.
27. **Import / publish / activation formally defined as three separate,
    idempotent operations — no single seed command does all three.**
    Import is keyed by `ruleCode` and safe to design against now (human
    documentation review is `COMPLETE`); publish requires the
    still-`NOT APPROVED` production-publication gate; activation
    additionally requires resolver code to exist. See
    `grammar-implementation-readiness.md` decision #9.
28. **`GrammarRule` field count corrected from 22 to 19 Tier-1 fields —
    not a cosmetic trim, each remaining field tied to a stated runtime
    need, each removed field given a concrete future trigger.**
    `reviewNotes`, `sourceRefs` (full citation text), and `publishedBy`
    moved out of the runtime schema (Git/editorial-metadata-only, each
    with a named trigger for re-adding); `publicationVersion` and
    `isActive` remain explicitly rejected, not deferred (both would
    create a second, competing source of truth alongside
    `contentVersion`/`contentStatus` respectively). Publication state
    machine formalized: `DRAFT → REVIEWED → PUBLISHED → ARCHIVED`, no
    `PUBLISHED → REVIEWED` backward step, correcting a published rule
    re-enters at `DRAFT` on the **same** row via a `contentVersion` bump
    (never a new row, never an `ARCHIVED → REVIEWED` transition). Source
    verification storage: Option B (compact DB enum, full citations
    Git-only) explicitly chosen over Option A (Git-only, no DB gate) and
    Option C (full metadata duplicated into DB). Exercise JSON given a
    concrete versioned schema (`exerciseSchemaVersion`, discriminated
    union) with one real gap flagged (`BASIC_WORD_ORDER`'s informal
    `reorder` exercise has no matching type in `ai.types.ts`'s existing
    `MicroLessonExercise` union — not resolved, flagged). `MicroLesson.sourceRuleCodes`
    re-evaluated on its own integrity trade-offs (not assumed from the
    `sourceErrorIds` precedent alone) and declared explicitly
    informational, not authoritative, made safe by a new rule:
    **`ruleCode` is immutable once a row has ever reached `PUBLISHED`.**
    See `grammar-prisma-model-proposal.md` for the full field-by-tier
    breakdown and every sub-decision's reasoning.
29. **Final architecture closure pass — corrects items #26 and #28 above
    on five specific points, each a deliberate reversal, not a
    refinement.** All five are detailed in
    `grammar-implementation-readiness.md` and their respective sibling
    documents; recorded here as the decision-log entry.

    - **`GrammarRule.microCategories` removed entirely, not kept as an
      empty array.** Item #24's "empty arrays, correct not unresolved"
      position is itself superseded: with no confirmed reader for the
      field, even for the 10 rules that do have a genuine category, it
      is not persisted at all. Legacy compatibility is fully carried by
      the untouched `ErrorRecord.microCategory`; `ErrorRecord.grammarRuleId`
      is the independent new axis. Future trigger: a proven
      analytics/query use case, an approved semantic taxonomy, or an
      admin-search requirement.
    - **`GrammarRule.resolverHints` removed entirely.** Deterministic
      matching logic for each `ruleCode` lives in version-controlled
      TypeScript matcher functions, not a DB JSON column — this narrows
      item #4's general "governance fields live on the content model"
      framing specifically for `GrammarRule`'s matching logic, which is
      code, not editorial content. Future trigger: an editorial UI, non-
      developer editors needing pattern control, a versioned schema with
      a safe rollout mechanism, and regression tests for content-driven
      rules.
    - **Field count corrected again, 19 Tier-1 fields (item #28) → 16
      scalar fields.** `reviewedBy`/`reviewedAt` are removed from the DB
      entirely, not merely deferred to a "Tier 2, Git-metadata" bucket as
      item #28 described — `contentStatus = REVIEWED` is the compact DB
      signal, full reviewer identity and history stay in Git, and a
      conceptual (not yet built) machine-readable import manifest is what
      a future publish CLI would check. `microCategories` and
      `resolverHints` also removed (see above). `titleEn` is nullable,
      not required. `exerciseSchemaVersion` added as a required field
      with no default.
    - **Source verification is a hard publication gate, reversing the
      "not strictly required to publish" position in "Blocks
      publication/activation" item #2 below.** `NOT_VERIFIED`/
      `PARTIALLY_VERIFIED` forbid `publish` outright; only
      `VERIFIED_DIRECTLY`/`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`
      may pass. No `--force`. Since all 12 rules are currently `PARTIAL`,
      none can pass `publish` today under this corrected rule — a
      stricter, more accurate statement than the earlier "could accept
      `PARTIALLY_VERIFIED`" framing. `grammar-mvp-decision-pack.md` (out
      of this round's editable scope) still contains the older framing —
      a known, flagged, not-yet-fixed cross-document inconsistency.
    - **Publication lifecycle: no `PUBLISHED → DRAFT`, reversing item
      #28's "re-enters at DRAFT on the same row via a contentVersion
      bump."** That design would have temporarily removed a rule from
      the resolver's candidate set while it was being corrected. Corrected:
      the existing `PUBLISHED` row keeps serving throughout Git-side
      review of a correction; `publish` then atomically updates the same
      row's content in place, bumps `contentVersion`, and the row's
      `contentStatus` never leaves `PUBLISHED`. Archive
      (`PUBLISHED → ARCHIVED`) and gated reactivation
      (`ARCHIVED → PUBLISHED`, full re-gate required) are otherwise
      unchanged from item #28.
    - **`ErrorRecord.grammarResolverVersion` added, reversing the prior
      log-only position for `resolverVersion`.** Persisted alongside
      `grammarRuleId` on assignment — nullable, no FK, no index — because
      observability-log retention is shorter than `ErrorRecord`'s
      lifetime and a resolver-logic change would otherwise leave no way
      to explain a historical assignment. `confidence` is explicitly not
      added to `ErrorRecord` — no concrete use case.
    - **`MicroLesson.sourceRuleCodes` deferred entirely, reversing item
      #12's original recommendation and item #28's "informational, not
      authoritative" refinement of it.** Re-checked against
      `micro-lessons.service.ts`'s actual `serialize()` method: no
      current MVP flow reads any lesson→rule linkage. A field with no
      confirmed reader is not added speculatively; the migration is 5
      steps, not 6 (this field's step is removed, not just reordered).
    - **`GrammarDiff`'s `MOVE` operation type removed**, narrowing item
      #25's `insert/delete/replace/move` list to `INSERT`/`DELETE`/
      `REPLACE` only — no tested move-detector exists; word-order changes
      are represented as a paired `DELETE`+`INSERT`. Added
      `diffSchemaVersion`/`extractorVersion`/`reliability` fields; a
      diff's `reliability` below `HIGH` now forbids automatic assignment
      regardless of matcher confidence.
    - **Exercise JSON's `reorder` gap (flagged, not resolved, in item
      #28) is now definitively excluded from MVP**, not merely flagged —
      `BASIC_WORD_ORDER` must be represented using the 3 real, existing
      types (`fill_blank`/`choice`/`correct_sentence`) until a new type
      has a TypeScript type, Zod schema, backend validation, frontend
      renderer, and tests, none of which exist.
    - **Automatic `grammarRuleId` assignment policy concretized**: `HIGH`
      confidence, unambiguous, a matching `PUBLISHED` and non-`ARCHIVED`
      row, and diff `reliability = HIGH`, all required simultaneously.
      `MEDIUM`/`LOW` leaves `grammarRuleId` null; an unresolvable
      `ruleCode` yields `fallbackReason = 'UNKNOWN_RULE_CODE'`, not a
      runtime exception — a new fallback reason alongside item #25's
      original three.

    None of the above changes the status of Grammar MVP implementation
    (`NOT STARTED`), the migration dry-run (`NOT EXECUTED`), production
    publication (`NOT APPROVED`), or human documentation review
    (`COMPLETE — 12 of 12`) — this item corrects the technical design
    only. See `grammar-prisma-model-proposal.md`,
    `grammar-resolver-contract.md`, `grammar-migration-execution-plan.md`,
    and `grammar-test-strategy.md` for full detail.

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
2. ~~Whether `MicroCategory` needs two new enum values for
   `MODAL_BASE_VERB`/`DO_DOES_DID_QUESTIONS_NEGATIVES`~~ — **fully closed
   this round, no longer open, see item #24 in "Accepted."** No new enum
   values, and — corrected from an earlier same-round draft — **no
   tagging of either rule's `microCategories` with legacy categories
   either**; both stay empty arrays, by design, permanently, not as an
   interim state awaiting an "implementation task." What remains
   genuinely open is unrelated to this closed question: whether to ever
   fix the separate, confirmed legacy-classifier gap for the `did`+
   irregular-verb do-support pattern (routes to no category at all —
   see `grammar-resolver-contract.md`), which has no proposed fix in
   scope for this round and, per the pipeline correction, is no longer
   even a `MicroCategory`-mapping question — it's a diff-matching
   question for whenever resolver code is written.
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

1. ~~**Canonical text per MVP rule**~~ — content-documentation drafts,
   source-verification attempts, and human documentation review are all
   complete (`PARTIAL`/`COMPLETE`/`COMPLETE` respectively, see items
   #20/#23 above); this alone does not unblock implementation, but it is
   no longer itself a gap.
2. **The `GrammarRuleResolver`'s final implementation** — a full
   interface contract now exists (`grammar-resolver-contract.md`, item
   #25), including a code-verified precedence matrix; nothing has been
   built or unit-tested yet. The contract does not reduce this blocker,
   it makes what needs building precise.
3. **The migration itself** — exact expected SQL for all 6 steps now
   exists (`grammar-migration-execution-plan.md`, item #26), matching
   the real style of the 5 existing migrations; `prisma migrate
   dev`/`deploy` has still not been run against any database.
4. **Tests** — a full minimum test matrix now exists
   (`grammar-test-strategy.md`, ~70+ resolver unit cases alone); no test
   *files* exist yet for any part of Grammar MVP (resolver, migration,
   editorial CLI).
5. **The editorial CLI** — does not exist yet; needed to import the 12
   `DRAFT` rows now that human documentation review is `COMPLETE`
   (12/12) — import itself remains safe to build against, per item #27's
   three-operation separation; publish/activate remain separately
   gated.
6. ~~**The `did`+irregular-verb do-support classifier gap — blocks implementation.**~~
   **Reclassified this round (item #24's correction): this is not an
   implementation blocker.** Under the corrected, non-category-gated
   resolver pipeline, `DO_DOES_DID_QUESTIONS_NEGATIVES` is a structural
   candidate for this diff regardless of the legacy classifier's `null`
   output — whether it actually resolves is a matcher-design (item #29:
   matching logic is TypeScript, not a `resolverHints` DB field) and
   diff-extraction-quality question, addressable once resolver code
   exists, not something that prevents building the schema, migration,
   `DRAFT` import, resolver interface, or unit test suite. Moved to
   "Blocks or limits activation quality" — see
   `grammar-resolver-contract.md`'s "Reclassified" section for the full
   does-not-block/does-block split.

### Blocks publication/activation (a rule going live for real users)

1. ~~**Human-approved content**~~ — **no longer blocking as of item #23
   above.** `grammar-rules-human-review.md`'s human documentation
   decision is now `APPROVE`-family for all 12 rules (9 × `APPROVE`, 2 ×
   `APPROVE AFTER REVISION`, 1 × `APPROVE WITH CAVEAT`), 0 remaining
   `PENDING HUMAN REVIEW`. Documentation approval does **not** itself
   unblock publication — items 2–4 below remain fully in force
   regardless of this one closing.
2. **Source verification reaching `VERIFIED_DIRECTLY` or
   `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`** — **corrected in
   item #29: this is now a hard publication gate, not a judgment call.**
   `NOT_VERIFIED`/`PARTIALLY_VERIFIED` forbid `publish` outright, no
   override. Since all 12 rules are currently `PARTIAL`
   (`grammar-source-verification.md`), none can pass `publish` today.
3. ~~**The `MicroCategory` mapping gap for `MODAL_BASE_VERB`/`DO_DOES_DID_QUESTIONS_NEGATIVES`**~~
   — **fully resolved this round, corrected (item #24): there is no gap
   to close.** `microCategories` staying empty for these two rules is
   the correct, final design — not a placeholder awaiting an
   "implementation task" to apply tags (an earlier same-round draft of
   this item said exactly that, and was itself wrong — no tags are ever
   applied, by design). What blocks activation for these two rules is
   identical to what blocks every rule: the resolver doesn't exist yet,
   and (specifically for `DO_DOES_DID_QUESTIONS_NEGATIVES`'s `did`+
   irregular-verb pattern) its own TypeScript matcher's (item #29:
   matching logic is code, not a `resolverHints` DB field) quality for
   that pattern is unverified until real code and tests exist — an activation-quality
   question (see "Blocks Grammar implementation," reclassified item
   above), not a documentation or schema blocker.
4. **The `GrammarRuleResolver`'s diff-extractor
   (`computeGrammarDiff`/`GrammarDiff`) must actually be implemented and
   validated against real error text before activation** — a concrete
   contract exists (`grammar-resolver-contract.md`) but no code.
5. **Production seed/publish approval for all 12 Grammar MVP rules** —
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
