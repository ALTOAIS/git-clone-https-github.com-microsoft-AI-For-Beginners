# Grammar MVP — Prisma model proposal

**Status: PROPOSAL ONLY. `schema.prisma` has not been changed.** Every
field below was checked against the actual file at
`english-flow/backend/prisma/schema.prisma` (438 lines, read in full)
and the actual migration history (5 migrations) — not against prior
documentation.

**Correction this round — a second, deeper cut than the prior round's
Tier split:** `microCategories` and `resolverHints` are **removed
entirely** from `GrammarRule`, not merely reclassified as "optional."
Neither belongs in the persisted MVP model at all. See the two dedicated
sections below for why each is gone, not just deprioritized.

## Enums confirmed in `schema.prisma` (re-verified)

```prisma
enum CefrLevel { A1 A1_PLUS A2 A2_PLUS B1 B1_PLUS B2 C1 }
enum ErrorType { ARTICLE VERB_TENSE VERB_FORM WORD_ORDER PREPOSITION VOCABULARY COLLOCATION PRONUNCIATION LITERAL_TRANSLATION MISSING_WORD UNNATURAL_PHRASE OTHER }
enum MicroCategory { ARTICLES THIRD_PERSON_SINGULAR PRESENT_SIMPLE PRESENT_PERFECT PAST_SIMPLE PREPOSITIONS WORD_ORDER COMPLY_VS_COMPLIANCE MAKE_VS_DO COUNTABLE_VS_UNCOUNTABLE COLLOCATIONS COMPLIANCE_VOCABULARY }
```

## `MicroCategory` and `GrammarRule.ruleCode` — the relationship, stated precisely

Two independent axes of classification, not one refined into the other:

- **Legacy `MicroCategory`** (on `ErrorRecord.microCategory`): coarse,
  backward-compatible, computed by the existing `classifyMicroCategory()`,
  unchanged. Not renamed, not removed, not extended, never treated as an
  accurate grammar-rule identifier.
- **`GrammarRule.ruleCode`**: a separate, more precise, rule-level
  classification with no obligation to map onto `MicroCategory` at all —
  neither in data (see "Removed: `microCategories`" below) nor in logic.

## Removed: `GrammarRule.microCategories`

**Not persisted anywhere in the MVP schema.** Re-evaluated this round
against the corrected pipeline (`grammar-resolver-contract.md`): once
the resolver's candidate-set query stopped being category-filtered
(`WHERE contentStatus = 'PUBLISHED'` only, no category clause), the
field had no remaining runtime reader. Restated precisely:

- The resolver does not filter candidates by `MicroCategory` — never
  did need the column for that once the filter itself was removed.
- Storing empty arrays for `MODAL_BASE_VERB`/`DO_DOES_DID_QUESTIONS_NEGATIVES`
  specifically (the prior round's interim position) added a column with
  no reader for those two rows and an unused, always-empty value for
  most of the rest — a field that exists but nothing queries is exactly
  the kind of speculative schema surface this whole correction pass
  exists to remove.
- **Not creating this mapping "for analytical symmetry" either** — no
  confirmed analytics/reporting requirement reads `GrammarRule` grouped
  by legacy `MicroCategory` today.
- Backward compatibility for the existing daily-practice/micro-lesson
  flows is fully provided by the **existing, untouched**
  `ErrorRecord.microCategory` column — nothing about removing this field
  from `GrammarRule` affects that column's behavior in any way.
- The new `ErrorRecord.grammarRuleId` (below) exists **independently** —
  it does not need `GrammarRule.microCategories` to exist, was never
  populated from it, and its presence/absence is unaffected by this
  removal.

**Future trigger to reintroduce a mapping (any form — array field,
join table, or otherwise):** a demonstrated analytics/query use case
(e.g. "show me all `GrammarRule`s under legacy category X" as a real
product or admin-tooling requirement); an approved semantic taxonomy
that assigns real, non-classifier-artifact categories to rules (not
what the retracted array attempted); or an administrative search
requirement to find rules by `MicroCategory`. None of these exist today.
Until one does, this stays entirely outside the persisted model — not
"empty by default," genuinely **absent**.

## Removed: `GrammarRule.resolverHints`

**Not persisted anywhere in the MVP schema — reconsidered from first
principles this round, not merely re-scoped.** The prior round's design
had the resolver read a `Json` column per rule at request time (or via
in-process cache) to know which structural pattern to match. That
creates a second source of resolver logic living in the database,
independent of and potentially diverging from the TypeScript
implementation that actually evaluates it — precisely the
two-representations-of-one-fact risk this document set exists to avoid,
this time applied to *behavior* rather than *content*.

**Corrected MVP position:**

- **Deterministic resolver logic — the actual structural-matching
  code for each `ruleCode` — lives in version-controlled TypeScript,**
  not in a JSON column. Concretely: a per-`ruleCode` matcher function
  (or a small typed table of matcher functions keyed by `ruleCode`),
  committed to the same repository as `micro-category.classifier.ts`,
  reviewed via the same PR process, covered by the same Jest test
  suite style already used throughout this codebase.
- **`GrammarRule` stores learner-facing content only:** titles,
  explanations, formula, exercises, governance/status fields. It does
  **not** store or configure how classification happens.
- **`resolverVersion`** (see `ErrorRecord.grammarResolverVersion` below)
  is what versions the resolver's *behavior* — bumped whenever the
  TypeScript matcher logic changes, exactly the way `micro-category.classifier.ts`
  itself has no DB-configurable behavior today and is versioned purely
  by its own commit history.
- **Any change to matching logic goes through code review and the
  existing test suite** — the same guarantee every other piece of
  deterministic classification logic in this codebase already has
  (`classifyMicroCategory()` is not configurable via the DB either).

**Future trigger for a data-driven, DB-configurable resolver:** an
editorial UI exists (not planned for MVP — CLI-only, already accepted);
non-developer editors need to manage matching patterns without a code
deploy; a versioned schema and a safe rollout/rollback mechanism for
*behavior* changes exists (not just content changes, which Git+CLI
already handle); and regression tests specifically for content-driven
rule changes exist. None of these exist or are planned for MVP. Until
then, resolver logic is code, not data.

## `GrammarRule` — final minimal MVP field set

| Field | Prisma type | Nullable | Default | Rationale |
| --- | --- | --- | --- | --- |
| `id` | `String` | No | `@default(cuid())` | Standard PK style, matches every existing model. |
| `ruleCode` | `String` | No | — | `@unique`. Stable identifier; the editorial CLI's natural key. **Immutable once a row has ever reached `PUBLISHED`** (see state machine below). |
| `titleRu` | `String` | No | — | Learner-facing, Russian UI — primary label. |
| `titleEn` | `String?` | **Yes** | — | Supplementary/optional English label — not every surface requires it; `titleRu` is the primary learner-facing identifier throughout this bilingual app. |
| `shortExplanationRu` | `String` | No | — | Inline error-card text. |
| `explanationRu` | `String` | No | — | Fuller "Подробнее" text. |
| `formula` | `String?` | Yes | — | Not every rule reduces to a terse formula. |
| `cefrLevel` | `CefrLevel` | No | — | Reuses the existing enum; the "product proposal, not certified" nuance lives in editorial process, not the column type. |
| `contentStatus` | `GrammarContentStatus` | No | `DRAFT` | Gates the CLI's state machine and the resolver's candidate query. |
| `sourceVerificationStatus` | `SourceVerificationStatus` | No | `NOT_VERIFIED` | **Corrected this round: a hard publication gate, not a warning** — see below. |
| `contentVersion` | `Int` | No | `1` | Bumped by the CLI on every content-affecting write. |
| `exerciseSchemaVersion` | `String` | No | — | Tags which version of the exercise JSON contract `exerciseTemplates` conforms to — required, not nullable, every row has exercises written under some schema version. |
| `exerciseTemplates` | `Json` | No | — | See "Exercise JSON contract" below. |
| `publishedAt` | `DateTime?` | Yes | — | Minimal publication metadata — audit/ordering. |
| `createdAt` | `DateTime` | No | `@default(now())` | Standard. |
| `updatedAt` | `DateTime` | No | `@updatedAt` | Standard. |

```prisma
examples     GrammarRuleExample[]
errorRecords ErrorRecord[]
```

**16 persisted scalar fields + 2 relations.** (`id`, `ruleCode`,
`titleRu`, `titleEn`, `shortExplanationRu`, `explanationRu`, `formula`,
`cefrLevel`, `contentStatus`, `sourceVerificationStatus`,
`contentVersion`, `exerciseSchemaVersion`, `exerciseTemplates`,
`publishedAt`, `createdAt`, `updatedAt` — counted directly against the
table above; an earlier pass in this same round undercounted this as
15, corrected here.) Removed from the prior 19-field proposal in this
round: `microCategories`, `resolverHints` (both eliminated entirely,
not deferred — see above), `reviewedBy`, `reviewedAt` (moved to "Review
metadata stays in Git," below). Added: `exerciseSchemaVersion` (was
implicit inside the JSON payload before, now a first-class queryable
column, consistent with `titleEn` also being explicitly nullable this
round rather than assumed required).

**Prisma naming/relation check:** `examples`/`errorRecords` back-relations
require `GrammarRuleExample.grammarRuleId`+`@relation` (present, unchanged
below) and `ErrorRecord.grammarRuleId`+`@relation` (present, unchanged
below) — both already correctly declared, this round's removals don't
affect either relation's validity. `@@unique([ruleCode])` and
`@@index([contentStatus])` retained; the `@@index([microCategories], type: Gin)`
index is **removed** along with the column it indexed.

## `GrammarRuleExample`

Unchanged from the prior round — already minimal.

| Field | Prisma type | Nullable | Default | Rationale |
| --- | --- | --- | --- | --- |
| `id` | `String` | No | `@default(cuid())` | Standard. |
| `grammarRuleId` | `String` | No | — | FK, `onDelete: Cascade`. |
| `exampleType` | `GrammarExampleType` | No | — | Fixed 5-value enum. |
| `sentence` | `String` | No | — | Example text. |
| `correction` | `String?` | Yes | — | Paired correct form, `INCORRECT` only. |
| `explanation` | `String?` | Yes | — | Optional note. |
| `context` | `String?` | Yes | — | Free-text label. |
| `sortOrder` | `Int` | No | `0` | Display order. |
| `createdAt`/`updatedAt` | `DateTime` | No | standard | Standard. |

```prisma
@@index([grammarRuleId, sortOrder])
```

## Review metadata stays in Git — `reviewedBy`/`reviewedAt` removed from `GrammarRule`

**Corrected this round.** The real human review already happened and is
fully recorded in version-controlled documentation
(`grammar-rules-human-review.md`: reviewer role, decision, per-rule
notes, dates — all Git-tracked, all real). Duplicating `reviewedBy`/
`reviewedAt` into the runtime DB restates facts Git already owns, with
the usual divergence risk if the two are ever updated independently.

**Corrected design:**

- **Git documentation is the source of truth** for reviewer role,
  decision notes, and full review history — nothing about this changes.
- **`contentStatus = REVIEWED` in the DB is the compact signal that the
  gate was passed** — it doesn't need to also carry *who*/*when* in the
  runtime table; that detail is one Git lookup away (`grammar-rules-human-review.md`,
  or the Git commit that recorded the review) and doesn't need
  duplicating for any confirmed runtime read path.
- **Detailed reviewer metadata is not duplicated into the runtime DB.**
- **The publication CLI's actual precondition is a machine-readable
  import manifest, not a DB column pair.** Concretely: a structured,
  Git-tracked manifest (e.g. a small YAML/JSON file, one entry per
  `ruleCode`, containing `{ ruleCode, humanDecision, sourceVerificationStatus,
  reviewedContentVersion }`) — generated from, or maintained alongside,
  the human-readable `grammar-rules-human-review.md` table, so the CLI
  has something reliable to parse instead of scraping Markdown prose.
  This manifest is **conceptual/proposed, not created in this round** —
  no such file exists yet; it is described here as the mechanism the
  `import`/`publish` commands would read, not as a new document being
  added (the brief for this round explicitly says not to add new
  documents; this is a future tooling input, not a design document).
  **No reviewer identity is invented or stored in `GrammarRule`** — the
  manifest's `humanDecision`/`reviewedContentVersion` fields answer "was
  this specific version of this rule approved," which is what the CLI
  actually needs to gate on; *who* approved it stays exclusively in Git
  history and the human-review document's own table.

## Source verification — corrected to a hard publication gate

**Corrected this round — retracts the "warn, not block" position stated
in the prior round.** That position is now understood to have
contradicted the actually-accepted publication blockers (`decisions.md`)
and is replaced:

| `sourceVerificationStatus` | Publication allowed? |
| --- | --- |
| `NOT_VERIFIED` | **No — publication forbidden.** |
| `PARTIALLY_VERIFIED` | **No — publication forbidden.** |
| `VERIFIED_DIRECTLY` | May pass the source gate. |
| `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE` | May pass the source gate. |

The `publish` command requires **all five**, simultaneously, with no
hidden override and no `--force` flag in MVP:

1. `contentStatus = REVIEWED`.
2. `sourceVerificationStatus` ∈ {`VERIFIED_DIRECTLY`,
   `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`}.
3. `exerciseTemplates` validates against the current
   `exerciseSchemaVersion`'s schema.
4. Explicit production-publication approval recorded (the existing
   separate human gate, `grammar-rules-human-review.md` — still `NOT
   APPROVED` for all 12 rules).
5. A valid `contentVersion`/import-manifest match — the row being
   published corresponds to the exact reviewed version in the manifest,
   not a stale or since-edited one.

**Direct consequence for the current 12 rules:** source verification is
`PARTIAL` for all 12 (`grammar-source-verification.md`) — none reaches
`VERIFIED_DIRECTLY`/`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`.
**Publication is therefore rejected by the gate itself for all 12, not
merely withheld by a separate human decision that happens to agree.**
`DRAFT`/`REVIEWED` import remains fully designable and safe (nothing
about the source gate blocks getting content into the DB for editorial
review); resolver activation remains impossible (no row can reach
`PUBLISHED`, so the candidate query returns nothing regardless of
resolver code existing).

Storage split unchanged: **full source URLs, publisher names, and
citation notes stay Git-only** (`grammar-source-verification.md`); only
the compact enum lives in DB, written exclusively by the CLI from the
Git file (or its manifest), never hand-edited, one-directional flow
(Git → DB, never the reverse).

## Publication lifecycle — corrected this round, no `PUBLISHED → DRAFT`

**The prior round's "correcting content resets `PUBLISHED` to `DRAFT`"
design is retracted.** It would have temporarily removed a live rule
from the resolver's candidate pool during every content correction — an
avoidable regression the corrected design below eliminates.

### Primary publication (first time a `ruleCode` goes live)

```
DRAFT ──(manifest shows human decision = APPROVE-family + reviewed version)──► REVIEWED ──(publish: all 5 gate conditions pass)──► PUBLISHED
```

`publish` sets `publishedAt`. The resolver's candidate query considers
`PUBLISHED` rows only.

### Correcting an already-`PUBLISHED` rule

**No intermediate runtime `DRAFT`/`REVIEWED` state for the same row.**
Instead:

1. A new edition of the content is prepared and reviewed **in Git**
   (`grammar-mvp-decision-pack.md`-style content file, new human review
   entry) — exactly like any other content review, entirely outside the
   runtime DB.
2. The existing `PUBLISHED` row **keeps serving learners, unchanged,**
   for the entire duration of that Git-side review — no content gap, no
   temporary fallback-to-legacy window.
3. Once the new edition passes full re-approval (all 5 gate conditions
   again, using the new content), the CLI's `publish` operation
   **atomically updates the same row's content fields** (`titleRu`,
   `explanationRu`, `exerciseTemplates`, etc.), **bumps `contentVersion`,
   updates `publishedAt`, and leaves `contentStatus = PUBLISHED`
   throughout** — it never visibly transitions through `DRAFT`/`REVIEWED`
   in the database for this update.
4. Git retains full history of the prior edition (Git-backed versioning,
   already accepted). The MVP database holds only the current runtime
   version — this was already the accepted model, restated precisely
   for the correction path specifically.

**Reconciling this with "PUBLISHED content is never edited directly"
(`decisions.md` #17):** that rule prohibits *ad hoc, out-of-band* edits
— a human or admin panel writing to a `PUBLISHED` row outside the CLI.
The CLI's own `publish` operation, driven by a fully Git-reviewed new
edition and passing every gate again, **is** the sole sanctioned write
path (already-accepted: "the CLI is the only writer to `PUBLISHED`
rows," `decisions.md` #15) — this is that same principle applied
specifically to a correction cycle, not an exception to it.

### Archive

`PUBLISHED → ARCHIVED` — excludes the row from the resolver's automatic
candidate query going forward; existing `ErrorRecord.grammarRuleId`
references are left untouched (historical accuracy preserved, not
retroactively nulled).

### Reactivation

`ARCHIVED → PUBLISHED` — allowed **only** via a separate, explicit
publish operation, never automatic and never implicit. Re-passes **all
5** gate conditions from scratch (source verification, exercise
validation, production approval, manifest match). `contentVersion`
increments if content changed as part of the reactivation, stays as-is
if reactivating unchanged content. There is no `ARCHIVED → REVIEWED` or
`ARCHIVED → DRAFT` transition — reactivation goes straight to
`PUBLISHED` or does not happen.

### `isActive`

Not used anywhere in this lifecycle — `contentStatus` alone is the
single source of runtime truth for whether a rule is live.

## `ErrorRecord.grammarRuleId` and `ErrorRecord.grammarResolverVersion` — durable resolver audit trail

**`grammarResolverVersion` added this round** — the prior round's
decision to keep `resolverVersion` in observability logs only is
corrected: logs typically have bounded retention, `ErrorRecord` rows
persist indefinitely, and without a durable per-row marker, a future
resolver-logic change makes historical assignments unexplainable ("why
was this error matched to this rule, under which version of the
matching logic?").

```prisma
model ErrorRecord {
  // ...existing fields, unchanged...
  grammarRuleId         String?
  grammarRule            GrammarRule? @relation(fields: [grammarRuleId], references: [id], onDelete: SetNull)
  grammarResolverVersion String?

  @@index([grammarRuleId])
}
```

- **`grammarResolverVersion`**: `String?`, no default, **not a FK**, no
  index (no confirmed query filters `ErrorRecord` by this field — adding
  one would be speculative, same reasoning applied consistently
  throughout this document).
- **`null` for every legacy row** and for any row where the resolver
  never assigned a `grammarRuleId` — populated **only** at the moment a
  `grammarRuleId` is actually set.
- **Reserved value space for future manual workflows:** if a manual or
  imported (non-resolver) assignment mechanism is ever built, it can use
  a distinguishable value (e.g. `"manual:v1"`) in the same column rather
  than requiring a second field — not built now, just noted as a
  compatible extension point, not a commitment.
- **`grammarRuleId` itself is unchanged** from every prior round:
  nullable, `onDelete: SetNull`, no default, no mandatory backfill,
  indexed. The delete/archive/deactivation three-way distinction from
  the prior round stands unmodified.
- **`confidence` is explicitly not added to `ErrorRecord`.** No concrete
  product or query use case was identified for persisting per-error
  confidence — it is observability/log data (see
  `grammar-resolver-contract.md`), not durable audit metadata the way
  the resolver *version* is. Confidence describes a point-in-time
  judgment about a specific match; the resolver version describes which
  code produced it — the latter has lasting explanatory value for
  historical rows in a way the former, alone, does not.

## Automatic assignment policy (moved here from the resolver contract for schema-adjacent visibility, full detail in `grammar-resolver-contract.md`)

The resolver may automatically write `ErrorRecord.grammarRuleId` only
when **all** of: `resolvedRuleCode` is unambiguous (`ambiguous = false`);
`confidence = 'HIGH'`; the referenced `GrammarRule` row exists; its
`contentStatus = 'PUBLISHED'` (re-checked at write time, defense in
depth); it is not `ARCHIVED`. `MEDIUM`/`LOW` confidence: `grammarRuleId`
stays `null`; `candidateRuleCodes` may reach privacy-safe observability;
the legacy `MicroCategory` flow is completely unaffected either way.
Unknown `ruleCode` at resolution time: no runtime exception,
`grammarRuleId = null`, a new `fallbackReason = 'UNKNOWN_RULE_CODE'`
value, a structured warning metric — never a thrown error. **Confidence
is never a publication permission** — a `HIGH`-confidence match against
an already-`PUBLISHED` rule says nothing about whether that rule itself
should have been published; the two are permanently orthogonal, gated
separately, by design.

## Exercise JSON contract — `reorder` finally excluded, not just flagged

**Corrected this round: `'reorder'` is definitively excluded from the
MVP exercise-type union, not merely "flagged as a gap."** The three
supported MVP types are the actual existing union already defined in
`ai.types.ts` — `'fill_blank' | 'choice' | 'correct_sentence'` — referred
to informally in product/design conversation as fill-blank,
multiple-choice, and correction-style exercises respectively, but the
literal type strings used in the schema below are the real ones already
implemented, not renamed for this document.

```typescript
interface GrammarExerciseTemplateSet {
  exerciseSchemaVersion: '1.0';
  exercises: GrammarExerciseTemplate[];
}

type GrammarExerciseTemplate =
  | { id: string; type: 'fill_blank'; prompt: string; answer: string }
  | { id: string; type: 'choice'; prompt: string; options: string[]; answer: string }
  | { id: string; type: 'correct_sentence'; prompt: string; answer: string };
  // 'reorder' excluded from MVP entirely — see below, not deferred as a gap,
  // decided: BASIC_WORD_ORDER's exercises are authored using the 3 types above.
```

`BASIC_WORD_ORDER`'s draft exercise set (`grammar-mvp-decision-pack.md`)
must be authored using only `choice`/`correct_sentence` — e.g. its
existing `choice` exercise ("Choose the correctly ordered sentence")
already fits the supported union without modification; its informal
"reorder" example needs rephrasing into a `correct_sentence` form
(present the misordered sentence as the prompt, the correctly-ordered
one as the answer) before import. **A new type cannot be imported until
all of:** a TypeScript type addition, a Zod schema update, backend
validation support, a frontend renderer, and dedicated tests exist —
none of which are in scope for a docs-only round.

**Canonical example** (unchanged from prior round, still valid under the
narrowed union):

```json
{
  "exerciseSchemaVersion": "1.0",
  "exercises": [
    { "id": "article-a-an-fill-1", "type": "fill_blank", "prompt": "She works as ___ auditor.", "answer": "an" },
    { "id": "article-a-an-choice-1", "type": "choice", "prompt": "He bought ___ car.", "options": ["a", "an", "the"], "answer": "a" },
    { "id": "article-a-an-correct-1", "type": "correct_sentence", "prompt": "I need a hour to review this.", "answer": "I need an hour to review this." }
  ]
}
```

**Import/publish behavior for an invalid or unknown exercise type:**
import rejected (CLI validation fails before any DB write); publish
rejected (re-validated, same schema); the runtime never receives a
template of an unsupported type under any circumstance — both gates
enforce the same fixed 3-type union, no partial/best-effort acceptance.

## `MicroLesson.sourceRuleCodes` — final decision: deferred entirely, not added

**Corrected this round — a definitive single decision, not two options
left open.** Re-examined against actual current read paths: no MVP flow
— not `micro-lessons.service.ts`'s `serialize()` method (confirmed by
re-reading it: returns `id`/`category`/`status`/`aiMode`/`content`/
`userExamples`, nothing rule-code-shaped), not any documented frontend
component, not any named MVP slice spec — actually reads a
lesson-to-grammar-rule linkage today. The three candidate use cases
named for this round (lesson→rule traceability, learner source display,
regeneration/audit workflow) are all **plausible future needs, not
confirmed present ones.**

**Decision: do not add `sourceRuleCodes` (or any lesson↔rule linkage) to
`MicroLesson` in this migration.** Adding a column with default `[]`
that nothing reads is exactly the same speculative-schema-surface
problem as the removed `microCategories`/`resolverHints` fields above,
applied to a different model — this round's correction pass is
consistent in rejecting it here too, not just on `GrammarRule`.

**Future trigger:** a confirmed product requirement for one of the three
named use cases — a learner-facing "this lesson covers rules: X, Y"
display actually designed and approved; a regeneration/audit workflow
that needs to look up a lesson's source rules; or an analytics need to
report lesson generation by `ruleCode`. When one of these becomes real,
add the column then, informed by which actual read pattern drove it
(which may change the right shape — array vs. join table — from what
was speculated here).

`MicroLesson.category`/`sourceErrorIds` remain completely unchanged —
this decision only concerns the *new*, not-yet-existing linkage field.

## Migration surface — final, corrected

```prisma
enum GrammarContentStatus { DRAFT REVIEWED PUBLISHED ARCHIVED }
enum SourceVerificationStatus { NOT_VERIFIED PARTIALLY_VERIFIED VERIFIED_DIRECTLY VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE }
enum GrammarExampleType { CORRECT INCORRECT CONTRAST CONTEXT EXCEPTION }

model GrammarRule {
  id                       String                    @id @default(cuid())
  ruleCode                 String                    @unique
  titleRu                  String
  titleEn                  String?
  shortExplanationRu       String
  explanationRu            String
  formula                  String?
  cefrLevel                CefrLevel
  contentStatus            GrammarContentStatus      @default(DRAFT)
  sourceVerificationStatus SourceVerificationStatus  @default(NOT_VERIFIED)
  contentVersion           Int                       @default(1)
  exerciseSchemaVersion    String
  exerciseTemplates        Json
  publishedAt              DateTime?
  createdAt                DateTime                  @default(now())
  updatedAt                DateTime                  @updatedAt

  examples     GrammarRuleExample[]
  errorRecords ErrorRecord[]

  @@index([contentStatus])
}

model GrammarRuleExample {
  id            String             @id @default(cuid())
  grammarRuleId String
  grammarRule   GrammarRule        @relation(fields: [grammarRuleId], references: [id], onDelete: Cascade)
  exampleType   GrammarExampleType
  sentence      String
  correction    String?
  explanation   String?
  context       String?
  sortOrder     Int                @default(0)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  @@index([grammarRuleId, sortOrder])
}

// Additions to existing models — everything else in these models unchanged:
model ErrorRecord {
  // ...
  grammarRuleId          String?
  grammarRule             GrammarRule? @relation(fields: [grammarRuleId], references: [id], onDelete: SetNull)
  grammarResolverVersion  String?
  @@index([grammarRuleId])
}

// MicroLesson: NO changes proposed in this round (sourceRuleCodes deferred, see above).
```

No existing field, model, or enum value is renamed, retyped, or removed
anywhere in this proposal — only additive columns on `ErrorRecord`, and
two entirely new tables.
