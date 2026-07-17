# Grammar MVP — Implementation readiness

**Status: docs-only design pass. Grammar MVP implementation remains NOT
STARTED.** This document is the entry point for this round's technical
design work — it states the final decisions directly, then points to
the 4 detailed sibling documents for the full reasoning:
`grammar-prisma-model-proposal.md`, `grammar-resolver-contract.md`,
`grammar-migration-execution-plan.md`, `grammar-test-strategy.md`.

## Architecture correction, stated up front

**An earlier version of this document's decision #5 was wrong and is
retracted, not merely reworded.** It proposed tagging
`MODAL_BASE_VERB.microCategories = [PREPOSITIONS, THIRD_PERSON_SINGULAR,
PAST_SIMPLE]` and `DO_DOES_DID_QUESTIONS_NEGATIVES.microCategories =
[THIRD_PERSON_SINGULAR, PRESENT_SIMPLE]` as a **semantic mapping
recommendation**. It is not one. Those legacy categories are not true of
either rule pedagogically — they are an artifact of the legacy
classifier's coarse, vocabulary-driven heuristics misrouting certain
error *shapes*. Presenting that observation as a mapping to apply would
have created a fake multi-category relationship, which is exactly the
class of error (one fact, two silently-diverging representations) this
whole document set exists to eliminate.

**This round goes one step further than the correction above and
removes `microCategories` from `GrammarRule` entirely — see "Final
decisions" #5.** The prior round's fallback position (keep the field,
leave it an empty/valid array for these two rules) was itself a smaller
version of the same mistake: persisting a field with no confirmed reader
just for "analytical symmetry." Nothing reads it, so nothing stores it.

Every technical claim in this round's documents was checked against the
actual code, not against prior documentation — including running the
real, unmodified `classifyMicroCategory()` function via a temporary Jest
spec, created and deleted in this session. `npx jest src/modules/errors
src/modules/micro-lessons` was run as a baseline: **57 tests passing**.

## Final decisions

### 1. Final MVP Prisma model
**Minimal, corrected this round.** `GrammarRule` persists exactly 16
scalar fields (`id`, `ruleCode`, `titleRu`, `titleEn`,
`shortExplanationRu`, `explanationRu`, `formula`, `cefrLevel`,
`contentStatus`, `sourceVerificationStatus`, `contentVersion`,
`exerciseSchemaVersion`, `exerciseTemplates`, `publishedAt`,
`createdAt`, `updatedAt`) plus 2 relations (`examples`,
`errorRecords`). Full field-by-field rationale in
`grammar-prisma-model-proposal.md`. Explicitly **not** persisted, each
with a stated future trigger in that document: `microCategories`,
`resolverHints`, `isActive`, `publicationVersion`, `reviewNotes`,
`sourceRefs`, `publishedBy`, `reviewedBy`, `reviewedAt`. `GrammarRuleExample`
(FK `onDelete: Cascade`, 5-value `GrammarExampleType` enum) unchanged.
Additive field on `ErrorRecord`: `grammarRuleId` (nullable, `onDelete:
SetNull`, no backfill) **and**, new this round, `grammarResolverVersion`
(nullable `String?`, durable audit trail, not a FK — see #8 below).
`MicroLesson.sourceRuleCodes` is **not** added this round — see #3. No
existing field, model, or enum value renamed, retyped, or removed.

### 2. JSON or separate model for exercises
**JSON field, not a separate model — reaffirmed, with `reorder`
definitively excluded from MVP.** `GrammarRule.exerciseTemplates: Json`,
versioned (`exerciseSchemaVersion: '1.0'`), Zod-validated at import and
publish time, discriminated union of the 3 real, existing
`fill_blank`/`choice`/`correct_sentence` types (matching `ai.types.ts`'s
`MicroLessonExercise` union exactly — no fourth type). **Corrected this
round:** `BASIC_WORD_ORDER`'s draft, which informally described a
reorder-style exercise, must be rephrased as `correct_sentence` before
import — no exercise type named `'reorder'` exists in any current
renderer, and none may be imported until a TypeScript type, a Zod
schema, backend validation, a frontend renderer, and tests all exist for
it. An unknown/invalid type is rejected at both import and publish; the
runtime never receives it.

### 3. `MicroLesson` linkage — final decision: deferred entirely
**`sourceRuleCodes` is not added to `MicroLesson` in this migration.**
Re-examined against `micro-lessons.service.ts`'s actual `serialize()`
method this round: no current MVP flow reads any lesson→rule linkage —
traceability, learner-facing source display, and a regeneration/audit
workflow are all unconfirmed future needs, not documented present ones.
Per this round's explicit instruction, a field with no reader is
deferred rather than added speculatively. Future trigger: one of those
three use cases becomes a real, scoped requirement. If it is added
later, the same safety rule applies as before: informational only, CLI
validates all codes at import time, `ruleCode` immutable after first
publication, `ARCHIVED` `ruleCode`s stay valid for historical rows, no
index without a confirmed query pattern.

### 4. `ErrorRecord` relation
**`grammarRuleId: String?`, `onDelete: SetNull`, no backfill — unchanged,
reconfirmed.** Three-way distinction (`grammar-prisma-model-proposal.md`):
a database **delete** cascades `SetNull` and should be operationally
prohibited for any ever-`PUBLISHED` row; **`ARCHIVED` status** is the
normal retirement path and leaves existing `ErrorRecord` references
untouched (historical accuracy); **deactivation/publication rollback**
is not a separate mechanism, it *is* the `ARCHIVED` transition — no
`isActive` field exists to create a second, competing signal.
**New this round:** `grammarResolverVersion: String?` added alongside
`grammarRuleId` — see #8.

### 5. `MicroCategory` strategy — corrected further this round
**Legacy `MicroCategory` stays exactly as-is: coarse, backward-compatible,
unrenamed, unextended, and never treated as an accurate grammar-rule
identifier.** `GrammarRule.ruleCode` is a genuinely separate, more
precise axis of classification with no obligation to map cleanly onto
`MicroCategory` — several rules can share one category (the 4 article
rules), and a rule can have **no** category affiliation at all.

**Corrected this round: `GrammarRule` has no `microCategories` field at
all — not even an empty array for `MODAL_BASE_VERB` and
`DO_DOES_DID_QUESTIONS_NEGATIVES`.** The absence of a clean category
does not block their `GrammarRule` `DRAFT` rows, does not block the
nullable `grammarRuleId` column, does not require a new enum value, and
is not solved by storing an array of legacy categories their error
shapes happen to trigger — nor by storing an empty array "for
consistency." Legacy compatibility is fully provided by the existing,
untouched `ErrorRecord.microCategory` column; the new
`ErrorRecord.grammarRuleId` exists as a fully independent classification
axis. Future trigger for adding any `GrammarRule`↔`MicroCategory` link
back: a proven analytics/query use case, an approved semantic taxonomy,
or an admin-search requirement — none exists today.

What this round's classifier tracing actually produced (re-verified,
kept, and correctly labeled as compatibility trivia, not a schema
decision): running `classifyMicroCategory()` against `MODAL_BASE_VERB`'s
typical errors shows `to`-removal legacy-classifying as `PREPOSITIONS`,
`-s`-removal as `THIRD_PERSON_SINGULAR`, past-tense-removal as
`PAST_SIMPLE`; `DO_DOES_DID_QUESTIONS_NEGATIVES`'s errors show
`-s`-double-marking as `THIRD_PERSON_SINGULAR`, `has`/`have`-double-
marking as `PRESENT_SIMPLE`, and one pattern (`did`+irregular verb) as
`null`. **These are legacy classifier compatibility findings and
regression-test inputs — not semantic tags, not a mapping
recommendation, not grounds to link a `GrammarRule` to any
`MicroCategory` value, and not the new resolver's target behavior.**

The architectural fix this enables (detailed in
`grammar-resolver-contract.md`): the resolver's candidate-set query is
**not filtered by category at all** —
`SELECT * FROM "GrammarRule" WHERE "contentStatus" = 'PUBLISHED'`, full
stop, evaluated against each rule's own version-controlled TypeScript
matcher function. At MVP scale (12–15 rows) this has no performance
cost, and it is what actually makes
`MODAL_BASE_VERB`/`DO_DOES_DID_QUESTIONS_NEGATIVES` reachable — not a
category tag of any shape. `existingMicroCategory` is available to any
matcher as **one weak optional signal**, never a mandatory filter.

### 6. Resolver interface and matcher logic — corrected this round
`GrammarRuleResolver.resolve(input): GrammarRuleResolverOutput`, pure
deterministic, no AI call inside it. Candidate generation is
`contentStatus = 'PUBLISHED'` only (no category filter);
`existingMicroCategory` is one input signal a rule's own matcher may
optionally check, never a precondition for candidacy. **Corrected this
round: `GrammarRule` has no `resolverHints` field — matching logic for
each `ruleCode` lives in version-controlled TypeScript matcher functions**
(`RuleMatcher` interface, `grammar-resolver-contract.md`), not in a DB
JSON column. This keeps deterministic structural logic under code review
and test coverage rather than editable-without-review DB data.
`GrammarRule` stores learner-facing content only; `resolverVersion`
versions the resolver's *behavior* as a whole. Future trigger for a
data-driven, DB-editable hints model: an editorial UI exists,
non-developer editors need pattern control without a code deploy, a
versioned schema plus a safe rollout mechanism exist, and regression
tests exist for content-driven rule changes — none of that exists today.

Input's `detectedDifferences` is the concrete, versioned `GrammarDiff`
contract (`grammar-resolver-contract.md`) — `DiffOperation[]` using only
`INSERT`/`DELETE`/`REPLACE` over token spans (**`MOVE` removed this
round** — no tested move-detector exists; word-order changes are
represented as a paired `DELETE`+`INSERT` or multiple `REPLACE`s),
carrying `diffSchemaVersion`, `extractorVersion`, and a `reliability:
HIGH|MEDIUM|LOW` tag. Buildable today with plain token-diffing, no new
NLP dependency (confirmed: none exists in `backend/package.json`).
Grammatical features (POS, lemma) are explicitly deferred, not included.
**Rule, new this round: resolver confidence can never exceed the diff's
own `reliability` tier** — if `reliability` is not `HIGH`, a matcher may
still return a candidate, but automatic assignment is forbidden.

### 7. Ambiguity and fallback behavior
`resolvedRuleCode = null`, `ambiguous = true`, `candidateRuleCodes`
populated, `fallbackReason = 'AMBIGUOUS_TIE'`, confidence `LOW`.
`NO_CANDIDATES` means the `PUBLISHED` catalog itself is empty, true for
all 12 rules today given production publication is `NOT APPROVED`.
**New this round:** an unresolvable `ruleCode` (one that doesn't match
any `GrammarRule` row) yields `grammarRuleId = null`,
`fallbackReason = 'UNKNOWN_RULE_CODE'`, and a structured warning metric
— never a runtime exception.

### 8. `ErrorRecord.grammarResolverVersion` — new, persisted this round
**Reversed from the prior round's log-only position.** Observability
logs alone are insufficient: log retention is bounded, while
`ErrorRecord` persists far longer, and after a resolver-logic change
there would be no way to explain a historical assignment from logs
alone. `ErrorRecord.grammarResolverVersion: String?` — null for legacy
rows and for any row where the resolver didn't assign `grammarRuleId`;
filled only when an actual assignment happens. Not a foreign key, no
index without a confirmed query need. Reserves value space for a future
non-resolver assignment path (e.g. `"manual:v1"`) if one is ever built —
not built now. `confidence` is explicitly **not** added to `ErrorRecord`
— no concrete product/query use case exists for storing it per-row; the
resolver's confidence is used once, at assignment time, and is not
retained.

### 9. Automatic assignment policy — corrected/concretized this round
Automatic `grammarRuleId` assignment happens **only if all of the
following hold simultaneously**: `resolvedRuleCode` is unambiguous,
`confidence = HIGH`, `ambiguity = false`, a matching `GrammarRule` row
exists, its `contentStatus = PUBLISHED`, it is not `ARCHIVED`, and its
`sourceVerificationStatus` has passed the publication gate (#10 below —
a rule can only be `PUBLISHED` if it already passed that gate, so this
is really a restatement that only genuinely-published rules qualify).
`MEDIUM`/`LOW` confidence: `grammarRuleId` stays `null`;
`candidateRuleCodes` may reach privacy-safe observability; the legacy
`MicroCategory` flow is unaffected either way. Confidence is never a
publication permission, and publication status is never inferred from
confidence.

### 10. Source verification — corrected to a hard publication gate
**Reversed from the prior round's "warn, don't block" position, which
contradicted the publication blockers already accepted elsewhere in this
document set.** `NOT_VERIFIED` and `PARTIALLY_VERIFIED` **forbid**
publication outright; only `VERIFIED_DIRECTLY` or
`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE` may pass. `publish`
requires five conditions simultaneously: `contentStatus = REVIEWED`, a
passing source-verification status, valid `exerciseTemplates` JSON, an
explicit production-publish approval, and a valid `contentVersion`/import-
manifest match. No hidden override, no `--force`, in MVP. Applied to the
current 12 rules: source verification is presently `PARTIAL`
project-wide (`grammar-source-verification.md`) — `DRAFT`/`REVIEWED`
import can be designed and executed, but **publication must be rejected
for all 12 rules today**, and resolver activation is therefore
impossible until that changes. Full source URLs and evidence stay in
Git; the DB stores only the compact status enum. **Known residual
cross-document note:** `grammar-mvp-decision-pack.md` (outside this
round's editable scope) still contains earlier "a product owner could
accept `PARTIALLY_VERIFIED`" language from a prior round — flagged here
as a stale cross-reference to reconcile the next time that file is in
scope, not fixed this round.

### 11. Publication lifecycle — corrected this round, no `PUBLISHED → DRAFT`
**The prior round's design (`PUBLISHED → (bump version) → DRAFT` to
correct a published rule, accepting a temporary "content gap" while the
resolver stops matching it) is rejected as an avoidable regression.**
Primary publication: `DRAFT → REVIEWED → PUBLISHED` (sets `publishedAt`;
the resolver's candidate query only ever considers `PUBLISHED` rows).
**Correcting an already-published rule:** a new edition is prepared and
reviewed entirely in Git while the existing `PUBLISHED` DB row keeps
serving the resolver throughout; once fully re-approved, `publish`
atomically updates that same row's learner-facing content in place,
increments `contentVersion`, updates `publishedAt`, and the row's
`contentStatus` stays `PUBLISHED` the entire time — it never visibly
passes through `DRAFT`/`REVIEWED` in the database. Git retains the old
edition's history; the DB holds only the current runtime version.
**Archive:** `PUBLISHED → ARCHIVED`, excluded from the resolver's
candidate query, existing `ErrorRecord` relations preserved. **Reactivation:**
`ARCHIVED → PUBLISHED` only via a fresh, explicit `publish` operation
that fully re-passes validation, the source gate, and production
approval; `contentVersion` increments if content changed. There is no
`ARCHIVED → REVIEWED` or `ARCHIVED → DRAFT` path. No `isActive` field —
`contentStatus` is the single runtime-truth source. This does not
conflict with the pre-existing rule that "`PUBLISHED` content is never
edited directly" — that rule targets ad hoc, out-of-band edits; the
CLI's own sanctioned `publish` write path is the one designed exception.

### 12. Review metadata — stays in Git, corrected this round
**Corrected: `GrammarRule` has no `reviewedBy`/`reviewedAt` columns.**
Git documents (`grammar-rules-human-review.md`) remain the single source
of truth for reviewer role, decision, and history. The DB's
`contentStatus = REVIEWED` is the compact signal that the gate passed;
detailed reviewer identity is not duplicated in the DB. The publish CLI
is described as checking a **conceptual, not-yet-built** machine-readable
import manifest (one entry per `ruleCode`: `{ ruleCode, humanDecision,
sourceVerificationStatus, reviewedContentVersion }`) that links the
Git-approved content to what gets imported — this is a proposed
mechanism, not a new document added this round, and no user identity is
invented anywhere in this design.

### 13. Migration order
**5 steps, corrected this round (was 6):** 1. enums
(`GrammarContentStatus`/`SourceVerificationStatus`/`GrammarExampleType`,
unchanged); 2. `GrammarRule` (corrected field set — no
`microCategories`/`resolverHints`/`reviewedBy`/`reviewedAt`, `titleEn`
nullable, `exerciseSchemaVersion TEXT NOT NULL` with no default since
the table is new); 3. `GrammarRuleExample` (unchanged); 4.
`ErrorRecord.grammarRuleId` (unchanged, nullable, indexed, FK
`onDelete: SetNull`); 5. `ErrorRecord.grammarResolverVersion` (new,
nullable, no FK, no index). `MicroLesson.sourceRuleCodes` is not a step
this round (#3). Exact SQL and rollback plan in
`grammar-migration-execution-plan.md`. Ordering and Render deploy-shape
reasoning unchanged from the prior round.

### 14. Draft import / publish / activation separation
Unchanged three-operation split: import (safe now, human documentation
review `COMPLETE` 12/12), publish (gated per #10/#11, `NOT APPROVED`
for all 12 today), activation (gated further — resolver code must
exist). Activation for the 2 category-less rules depends only on the
resolver existing and its matcher being correctly designed for those
rules' structural patterns, same as any other rule — not on any
`MicroCategory` tagging decision, which was retracted and then removed
entirely.

### 15. Test minimum before merge
~70+ resolver unit test cases plus a corrected schema/migration and
editorial-validation set, full existing 57-test suite as a hard
regression gate — see `grammar-test-strategy.md`, fully updated this
round for the 5-step migration, the hard source gate, matcher-based
(not `resolverHints`-based) unit tests, `grammarResolverVersion`
persistence, `UNKNOWN_RULE_CODE` fallback, and `MOVE`-free diff cases.
The `did`+irregular-verb test case
(`DO_DOES_DID_QUESTIONS_NEGATIVES` row) remains framed as "assert it
resolves correctly" — a real positive-case test of the corrected
pipeline, not a permanently-expected-to-fail case.

### 16. Observability minimum
Unchanged 8-field structured log per `resolve()` call, no learner
sentence content logged. **Corrected this round:** `resolverVersion` is
logged **and**, new this round, persisted on `ErrorRecord` as
`grammarResolverVersion` when an assignment happens (#8) — this reverses
the prior round's log-only position.

## Acceptance gates — reframed this round

### Ready for schema implementation
- Minimal persisted `GrammarRule` field set — decided (#1,
  `grammar-prisma-model-proposal.md`).
- Source-verification hard publication gate — decided (#10).
- Publication lifecycle with no `PUBLISHED → DRAFT` — decided (#11).
- Exercise JSON schema, `reorder` excluded from MVP — decided (#2).
- `MicroLesson` linkage: deferred entirely — decided (#3).
- `resolverVersion` persistence on `ErrorRecord` — decided (#8).
- MVP diff contract, `MOVE` removed, `reliability` tag added — decided
  (#6).
- `MicroCategory` strategy: no `microCategories` field, no
  category-gated candidate query — decided (#5).

All of the above are **decided**, not open. None require further design
discussion before schema work could begin — only the actual writing of
the migration/code/CLI, which has **not started**. Current human
documentation approval (12/12 rules reviewed) does **not** authorize
this stage or any later one; it is a separate, earlier gate that has
already passed.

### Ready for migration execution
- Schema code actually written (Prisma models, not just this document).
- Generated SQL reviewed against the exact statements in
  `grammar-migration-execution-plan.md`.
- Fresh-database migration test passes.
- Existing-database upgrade-path test passes (on top of the current 5
  migrations, no naming conflicts).
- Rollback/deactivation rehearsal executed on a copy of the
  post-migration schema.
- Backup/recovery check confirmed for the target environment before
  running against any real-data database.

None of this has happened. Schema implementation has not started, so
none of these can be true yet.

### Ready for resolver activation
- All rules intended for activation are `PUBLISHED` and have passed the
  hard source-verification gate (#10) — **not true for any of the 12
  rules today**, since source verification is `PARTIAL` project-wide.
- The diff extractor (`computeGrammarDiff`/`GrammarDiff`) is actually
  implemented, `MOVE`-free, and its `reliability` tagging validated
  against real error text, not just the worked examples in this
  document set.
- Automatic assignment is wired to the full policy in #9 (HIGH
  confidence, unambiguous, `PUBLISHED`, not `ARCHIVED`, diff
  `reliability = HIGH`) — no partial implementation of the policy.
- Full resolver unit + integration test suite passing (~70+ cases,
  `grammar-test-strategy.md`), including the `did`+irregular-verb
  positive-case test actually passing, not just present.
- False-positive guards (per-rule, `grammar-test-strategy.md`) passing.
- Observability wired and confirmed producing the 8-field log shape,
  plus `grammarResolverVersion` confirmed persisted on assignment.
- The separate, explicit production-publication approval — still `NOT
  APPROVED`, still not granted by this document or any document in this
  set.

Current human documentation approval must not be read as authorizing
any of these three stages — it only closes the human-review gate
tracked in `grammar-rules-human-review.md`.

## Open questions

- Whether/how to eventually fix the `did`+irregular-verb legacy-classifier
  gap in `micro-category.classifier.ts` — application-code change, not
  decided here, and not required for the new resolver to reach this
  pattern (the resolver no longer depends on the legacy classifier's
  output for candidacy).
- Whether the `COMPLY_VS_COMPLIANCE` short-circuit's interaction with
  `MODAL_BASE_VERB`/`BASIC_PREPOSITION_PATTERNS` warrants any future
  content or matcher refinement — flagged as a real question in
  `risk-register.md`, not resolved here.
- The stale "warn, don't block" language remaining in
  `grammar-mvp-decision-pack.md` (out of this round's scope) — noted in
  #10 above, to be reconciled when that document is next in scope.
- Pre-existing unrelated open items from `decisions.md` unchanged.

## Publication blockers

Human documentation review `COMPLETE` (12/12) — not a blocker on its
own. Remaining, all still open: direct/stronger source verification
(`PARTIAL`, and now a **hard** gate per #10, not a warning); a
successfully **executed** migration dry-run (still `NOT EXECUTED`, and
schema implementation itself has not started); resolver activation
readiness (see the 3rd acceptance-gate tier above); the separate,
explicit production-publication go/no-go, never claimed here.

## Self-review

- No document in this set describes a legacy misclassification as a
  semantic mapping or a reason to link a `GrammarRule` to any
  `MicroCategory` value — verified by grep and by re-reading every
  corrected section.
- `GrammarRule` contains no `microCategories` field anywhere in the
  schema proposal or migration plan — confirmed.
- `GrammarRule` contains no `resolverHints` field anywhere — matching
  logic lives in TypeScript matcher functions, confirmed in
  `grammar-resolver-contract.md`.
- `GrammarRule` contains no duplicated review/publication fields
  (`reviewedBy`, `reviewedAt`, `publishedBy`, `publicationVersion`,
  `isActive`) — confirmed against the 15-scalar-field final list.
- Source verification `PARTIAL`/`NOT_VERIFIED` blocks publication — hard
  gate, no warning-only path, confirmed in #10 and in
  `grammar-prisma-model-proposal.md`.
- No `PUBLISHED → DRAFT` transition exists anywhere in the corrected
  lifecycle — confirmed in #11.
- `contentStatus` is the sole activation-truth source, no `isActive`
  field exists — confirmed.
- `resolverVersion` is persisted in `ErrorRecord.grammarResolverVersion`,
  not log-only — confirmed in #8.
- Automatic `grammarRuleId` assignment requires `HIGH` confidence and
  `PUBLISHED` status simultaneously with the other conditions in #9 — no
  partial-condition assignment path described anywhere.
- `MOVE` is not a mandatory MVP diff operation — the contract uses only
  `INSERT`/`DELETE`/`REPLACE`, confirmed in #6 and
  `grammar-resolver-contract.md`.
- The unsupported `reorder` exercise type is not in the MVP JSON
  contract — confirmed in #2.
- No fake semantic `MicroCategory` mapping exists anywhere in this
  document set — confirmed.
- Grammar MVP implementation status: unchanged, `NOT STARTED`.
- Migration dry-run status: unchanged, `NOT EXECUTED`.
- Production publication status: unchanged, `NOT APPROVED`.
- Human documentation review status: unchanged, `COMPLETE — 12 of 12`.
- Source verification status: unchanged, `PARTIAL`.
- **No `schema.prisma` change, no migration file, no application code
  change, no seed file, no test file left behind anywhere in this
  session** — confirmed via `git status` immediately before finalizing
  this document.
- Markdown links, conflict markers, `git diff --check` — verified in the
  final report.
