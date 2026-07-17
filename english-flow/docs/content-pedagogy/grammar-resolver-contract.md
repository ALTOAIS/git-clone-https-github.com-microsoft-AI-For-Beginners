# Grammar MVP — `GrammarRuleResolver` contract

**Status: interface design only. No resolver code exists.** This
document defines a TypeScript interface and a precedence matrix; it does
not implement either.

**Two corrections carried in from the prior round, both retracted and
fixed (see `grammar-implementation-readiness.md` for the full history):**
(1) the earlier "tag `MODAL_BASE_VERB`/`DO_DOES_DID_QUESTIONS_NEGATIVES`
with legacy `MicroCategory` values" recommendation was wrong and stays
retracted; (2) **new this round:** matching logic itself no longer lives
in a DB `resolverHints` JSON column at all — it lives in version-controlled
TypeScript, reviewed and tested like any other code in this repository.

Every classifier behavior claim below was verified by actually running
`classifyMicroCategory()` via a temporary Jest spec created and deleted
in this session — not assumed from documentation.

## Legacy classifier vs. new resolver — kept explicitly separate

| Concern | Legacy `classifyMicroCategory()` | New `GrammarRuleResolver` |
| --- | --- | --- |
| Status | Existing, unmodified, shipping code | Does not exist; interface design only |
| Where matching logic lives | Hardcoded TypeScript in the classifier itself | **Hardcoded TypeScript per `ruleCode`** — corrected this round, not a DB `Json` column |
| Input | `original: string, corrected: string` | Structural diff (`GrammarDiff`, concretized below) + the legacy classifier's output as one weak optional signal |
| Output | `MicroCategoryString \| null` | `resolvedRuleCode`, `candidateRuleCodes`, `confidence`, `ambiguous` |
| Method | Priority-ordered regex/keyword heuristics | Per-`ruleCode` matcher functions evaluated against the structural diff |
| Compatibility role | The existing `ErrorRecord.microCategory` write path — untouched | Additive only — writes `ErrorRecord.grammarRuleId`/`grammarResolverVersion`, never touches `microCategory` |
| Configuration surface | None — behavior is fixed by the function's own code | None — corrected this round to match; no DB-driven configuration for MVP |
| Uses AI | No | No |

## Where matching logic lives — corrected this round

**Not `GrammarRule.resolverHints` (removed, see `grammar-prisma-model-proposal.md`).**
The structural pattern each `ruleCode` matches — e.g. "modal token
retained unchanged AND the following verb's form changed" for
`MODAL_BASE_VERB` — is expressed as ordinary TypeScript, one matcher per
rule (or grouped where genuinely shared, e.g. the 4 article rules could
share a common helper), living alongside `micro-category.classifier.ts`
in the same module structure:

```typescript
// Proposed location: english-flow/backend/src/modules/grammar/rule-matchers/
// Nothing at this path exists yet — design only.

export interface RuleMatcher {
  ruleCode: string;
  /** Pure function — no DB read, no I/O. Returns null if this rule's pattern doesn't match this diff. */
  match(diff: GrammarDiff, existingMicroCategory: MicroCategoryString | null): MatchResult | null;
}

interface MatchResult {
  confidence: ResolverConfidence;
  evidence: string[];
}

// Example shape, not implementation:
export const modalBaseVerbMatcher: RuleMatcher = {
  ruleCode: 'MODAL_BASE_VERB',
  match(diff, existingMicroCategory) {
    // structural check: modal token retained unchanged in both spans,
    // AND the following verb's form changed (to-removed / -s-removed / past-form-removed)
    // existingMicroCategory referenced only as an optional secondary signal, never required
    // returns null if the structural pattern isn't present
  },
};
```

Why this is a real, not cosmetic, correction: a DB `Json` column that
the resolver reads at request time means the *actual matching behavior*
could change by editing a database row — no code review, no test suite
enforcement, no type safety, and a second place (alongside the
TypeScript interpreter that evaluates the JSON) where a bug or drift
could live. Moving matchers into TypeScript means: every matcher change
goes through the same PR review and Jest test suite as
`micro-category.classifier.ts` already does; there is exactly one place
matching logic can live, not two; `resolverVersion` (bumped on every
matcher-logic change) has an unambiguous meaning — "which commit of this
TypeScript module produced this result" — rather than describing a
mix of code version and mutable DB content.

**Future trigger for a DB-configurable, data-driven resolver:** stated
in `grammar-prisma-model-proposal.md` — an editorial UI, non-developer
editors needing to manage patterns, a versioned+safely-rollable
behavior-change mechanism, and dedicated regression tests for
content-driven changes. None exist or are planned for MVP.

## Corrected pipeline

```
ErrorRecord.originalText / correctedText
        │
        ▼
[1] classifyMicroCategory(original, corrected) — EXISTING, UNCHANGED
        │  returns MicroCategoryString | null — written to ErrorRecord.microCategory exactly as today
        ▼
[2] computeGrammarDiff(original, corrected) — NEW, concretized below
        │  returns GrammarDiff — token-level structural diff
        ▼
[3] candidate GrammarRule set
    SELECT * FROM "GrammarRule" WHERE "contentStatus" = 'PUBLISHED'
        │  no category filter — see grammar-implementation-readiness.md's architecture correction
        ▼
[4] for each candidate, run its TypeScript matcher(diff, existingMicroCategory)
        │
        ├── unambiguous HIGH match ──► service layer: grammarRuleId = rule.id, grammarResolverVersion = <matcher module version>
        └── no match / ambiguous / <HIGH ─► grammarRuleId stays null, legacy fallback
```

## TypeScript interface (design only, not implemented)

```typescript
export interface GrammarRuleResolverInput {
  originalText: string;
  correctedText: string;
  existingMicroCategory: MicroCategoryString | null;
  detectedDifferences: GrammarDiff;
  contextMetadata?: {
    sourcePrompt?: string | null;
    sourceContext?: string | null;
  };
}

export type ResolverConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface GrammarRuleResolverOutput {
  resolvedRuleCode: string | null;
  candidateRuleCodes: string[];
  confidence: ResolverConfidence | null;
  ambiguous: boolean;
  evidence: string[];
  fallbackReason:
    | 'NO_CANDIDATES'        // PUBLISHED catalog is empty
    | 'AMBIGUOUS_TIE'        // 2+ candidates matched at equal confidence
    | 'NO_STRUCTURAL_MATCH'  // candidates existed, no matcher matched this diff
    | 'UNKNOWN_RULE_CODE'    // resolved code did not correspond to a real row at write time (defensive case)
    | null;
  resolverVersion: string;
}

export interface GrammarRuleResolver {
  resolve(input: GrammarRuleResolverInput): GrammarRuleResolverOutput;
}
```

**`UNKNOWN_RULE_CODE` added this round** — the defensive case where a
resolved code fails to match a real row at write time (should not
happen structurally, since candidates are already real rows fetched in
step [3], but handled explicitly rather than silently).

## Resolver input contract — `GrammarDiff`, `MOVE` removed from MVP

**Corrected this round: `MOVE` is not part of the MVP diff contract.**
No tested move-detector exists (no resolver code exists at all yet), and
introducing an operation type with no implementation plan to detect it
reliably would be exactly the kind of unverified schema surface this
whole pass removes elsewhere. Word-order differences (the only pattern
that would have used `MOVE`) are represented instead as paired
`DELETE`+`INSERT` operations, or as one or more `REPLACE` operations —
both fully expressible with the 3 remaining operation types and
buildable with plain sequence-alignment diffing, no new component.

```typescript
export const GRAMMAR_DIFF_SCHEMA_VERSION = '1.0' as const;

export type DiffOperationType = 'INSERT' | 'DELETE' | 'REPLACE';
export type DiffReliability = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DiffOperation {
  operation: DiffOperationType;
  originalStart: number;
  originalEnd: number;
  correctedStart: number;
  correctedEnd: number;
  originalText: string;
  correctedText: string;
  /** Lowercased, whitespace-trimmed — same normalization classifyMicroCategory() already applies. */
  normalizedOriginal: string;
  normalizedCorrected: string;
}

export interface GrammarDiff {
  diffSchemaVersion: '1.0';
  operations: DiffOperation[];
  extractorVersion: string;
  /** How trustworthy this specific diff extraction is judged to be — see below. */
  reliability: DiffReliability;
}
```

**Minimum fields, as specified:** `operation`, `originalStart`,
`originalEnd`, `correctedStart`, `correctedEnd`, `originalText`,
`correctedText`, `normalizedOriginal`, `normalizedCorrected`, plus
`diffSchemaVersion` and `extractorVersion` at the envelope level.

**Reliability, and how it interacts with resolver confidence:**
`reliability` is a property of the *diff extraction itself* — is the
computed operation list a trustworthy structural representation of what
changed (e.g. did length/complexity/non-English-content push the
extractor outside conditions it was designed for)? **Resolver `confidence`
can never exceed the input diff's `reliability` tier** — a matcher
cannot legitimately claim `HIGH` confidence from a diff the extractor
itself only trusts at `MEDIUM`. If `reliability` is not `HIGH`:
individual matchers may still run and report `candidateRuleCodes`, but
**automatic `grammarRuleId` assignment is forbidden** regardless of what
confidence a matcher would otherwise compute (see "Automatic assignment
policy" below) — the legacy `MicroCategory` flow is entirely unaffected
either way.

### Minimum text-diff input for MVP (buildable today, no new dependency)

Token-level `INSERT`/`DELETE`/`REPLACE` via a standard sequence-alignment
diff over the same lowercased-token arrays `classifyMicroCategory()`
already produces internally — string/array diffing, not NLP.

### Optional enriched linguistic features (deferred, not in MVP contract)

Grammatical features (POS, lemma, tense) remain explicitly deferred —
confirmed no NLP/POS/lemmatization library exists in
`backend/package.json`. `resolverHints`-equivalent structural checks
(e.g. "is this token a modal verb") use curated word lists inside the
matcher functions themselves, matching the existing style already used
throughout `micro-category.classifier.ts`.

### Who produces `GrammarDiff`, and reliability grading

A new utility, `computeGrammarDiff(original, corrected): GrammarDiff`
(not yet written), alongside `classifyMicroCategory()`. `reliability`
grading itself (not fully specified here — an implementation detail for
whoever writes the extractor) would reasonably consider: whether the
alignment found a clean, small operation set vs. a degenerate
near-total-rewrite; whether both texts passed the existing language gate
cleanly; whether operation count is within an expected range for the
sentence lengths involved. **Not decided in this round** — flagged as an
implementation task, not a design gap, since the actual grading heuristic
can only be tuned against real diff output, which doesn't exist yet.

## Automatic assignment policy

The resolver may automatically write `ErrorRecord.grammarRuleId` (via
the service layer, see below) only when **all** of the following hold:

- `resolvedRuleCode` is unambiguous (`ambiguous = false`).
- `confidence = 'HIGH'`.
- The input `GrammarDiff.reliability = 'HIGH'` (confidence cannot
  legitimately exceed this, per above, but checked explicitly as a
  second gate for clarity).
- The referenced `GrammarRule` row exists.
- Its `contentStatus = 'PUBLISHED'` — re-checked at write time
  (defense-in-depth; the candidate set already filtered on this).
- It is not `ARCHIVED` (implied by the above, stated for clarity).

**`MEDIUM`/`LOW` confidence:** `grammarRuleId` stays `null`;
`candidateRuleCodes` may reach privacy-safe observability; the legacy
`MicroCategory` flow is completely unaffected.

**Unknown `ruleCode`:** never a runtime exception — `grammarRuleId =
null`, `fallbackReason = 'UNKNOWN_RULE_CODE'`, a structured warning
metric logged.

**Confidence is never a publication permission.** A `HIGH`-confidence
match against an already-`PUBLISHED` rule says nothing about whether
that rule itself should have been published — publication is gated
separately and earlier (`grammar-prisma-model-proposal.md`'s hard
source-verification gate), by design, permanently orthogonal to
per-error match confidence.

## Resolver output and persistence — service-layer responsibilities

1. Call `resolve()` with the diff and the legacy classifier's output.
2. Apply the automatic assignment policy above — all conditions, not a
   subset.
3. If assigned: write `ErrorRecord.grammarRuleId = resolvedRuleCode`
   **and** `ErrorRecord.grammarResolverVersion = resolverVersion`
   (corrected this round — durable, not log-only, see
   `grammar-prisma-model-proposal.md`) in the same write.
4. Log `candidateRuleCodes` separately from the single persisted
   `grammarRuleId` — the full candidate list is observability data,
   never persisted on `ErrorRecord` itself.
5. `resolverVersion` is **both** logged (per call, for observability
   aggregation) **and** persisted per-row on assignment (for durable,
   long-retention audit trail) — corrected from the prior round's
   log-only decision specifically because log retention is typically
   bounded while `ErrorRecord` persists indefinitely, and a future
   resolver-logic change would otherwise make historical assignments
   unexplainable.
6. Unknown `ruleCode` at write time never causes a runtime failure —
   graceful `null` + `fallbackReason`, matching the existing style
   throughout `errors.service.ts`.

## Layering — deterministic vs. AI, source of truth

| Layer | Deterministic or AI | Source of truth |
| --- | --- | --- |
| `classifyMicroCategory()` (step 1) | Deterministic, existing, unmodified | `ErrorRecord.microCategory` only |
| `computeGrammarDiff()` (step 2) | Deterministic, new, not yet built | The diff itself; `reliability` bounds downstream confidence |
| Candidate-set query (step 3) | Deterministic — `contentStatus = 'PUBLISHED'` only | Which rows are even eligible |
| Per-`ruleCode` TypeScript matchers (step 4) | Deterministic only, no LLM call anywhere, version-controlled code | Final — nothing downstream overrides an assignment |
| AI (optional, later, out of MVP scope) | Only adapts wording of an already-resolved rule's `explanationRu` | Never the source of truth for *which* rule is correct |

**AI is never permitted to select or publish a `ruleCode` on its own.**

## Candidate logging (observability)

Every `resolve()` call logs `{ errorRecordId, existingMicroCategory,
diffReliability, candidateRuleCodes, resolvedRuleCode, confidence,
ambiguous, fallbackReason, resolverVersion }` — no `originalText`/
`correctedText` content in the log line.

## Backward compatibility

Unchanged from the prior round: `classifyMicroCategory()` called exactly
as today; `ErrorRecord.microCategory` written unconditionally,
independent of `grammarRuleId`; every existing category continues to
work exactly as today for the legacy fallback path.

---

## Diff-specific precedence — legacy classifier compatibility findings, correctly labeled

This section documents what the legacy `classifyMicroCategory()`
produces for each rule's typical errors — **regression-test inputs and
false-classification-risk documentation, never a semantic mapping and
never the mechanism by which a rule actually resolves** (that mechanism
is each rule's own TypeScript matcher, evaluated against the structural
diff, independent of the legacy category).

| `ruleCode` | Matcher's own structural signal | Legacy `classifyMicroCategory()` observed output (compatibility finding only) |
| --- | --- | --- |
| `ARTICLE_A_AN` | Article token inserted/removed + reliable singular-number signal | `ARTICLES` |
| `ARTICLE_THE_SPECIFIC` | `the` inserted/removed + shared-reference marker | `ARTICLES` |
| `ARTICLE_ZERO_GENERAL` | Article removed before confirmed plural/uncountable noun + general-meaning signal | `ARTICLES` |
| `PRESENT_SIMPLE_THIRD_PERSON` | `-s`/`-es` added/removed on main verb, no modal present | `THIRD_PERSON_SINGULAR` |
| `PAST_SIMPLE_FORM` | `-ed`/irregular pair, no do-support auxiliary present | `PAST_SIMPLE` |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | `have`/`has` inserted/removed as auxiliary before past participle, either direction | `PRESENT_PERFECT` (added direction only — confirmed asymmetry, classifier's own gap, not a resolver design issue) / `PAST_SIMPLE` (removed direction, falls through) |
| `MODAL_BASE_VERB` | Modal retained unchanged + following verb's form changed | `to`-removal → `PREPOSITIONS`; `-s`-removal → `THIRD_PERSON_SINGULAR`; past-tense-removal → `PAST_SIMPLE`; compliance-vocabulary sentences → `COMPLY_VS_COMPLIANCE` (short-circuit, confirmed to run before any structural check) |
| `BASIC_PREPOSITION_PATTERNS` | Exact curated preposition swap | `PREPOSITIONS` (most patterns); `COMPLY_VS_COMPLIANCE` (`comply with`/`comply to` specifically) |
| `BASIC_WORD_ORDER` | Same token multiset, different order (represented as paired DELETE+INSERT, not `MOVE`) | `WORD_ORDER` |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | `do`/`does`/`did` retained unchanged + main verb double-marking removed | `-s` double-marking → `THIRD_PERSON_SINGULAR`; `has`/`have` double-marking → `PRESENT_SIMPLE`; `did`+irregular verb → `null` (confirmed gap, no branch catches it) |
| `COUNTABLE_UNCOUNTABLE` | Known-uncountable noun pluralized, or `much`/`many`/`a lot of` swapped | `COUNTABLE_VS_UNCOUNTABLE` |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | Article inserted/removed + reliable number signal | `ARTICLES` |

### Case A — Modal-form error
`can works`→`can work`, `should reported`→`should report`, `must to
call`→`must call`. Resolved by `MODAL_BASE_VERB`'s own matcher —
**never** by trusting whichever legacy category the diff happened to
land in.

### Case B — Unnecessary do-support before a retained modal
`Does she can work?`→`Can she work?`, `Did we must submit?`→`Must we
submit?`. Primary `DO_DOES_DID_QUESTIONS_NEGATIVES`; `MODAL_BASE_VERB`
logged as secondary candidate. Both rules' matchers run unconditionally
against every diff (no category gate) — the tiebreaker is whether the
`do`-family token or the modal itself was the one actually removed.

### Case C — Double-marking after `did`/`does`
`did went`→`did go`, `doesn't works`→`doesn't work`, `does she has`→
`does she have`. Primary `DO_DOES_DID_QUESTIONS_NEGATIVES`. The `did
went` case is a real, structurally reachable candidate under the
corrected (non-category-gated) pipeline — whether it resolves depends
on the matcher's own structural check (did retained + irregular verb
form changed) and the diff's `reliability`, not on the legacy
classifier's `null` output, which is irrelevant to this pipeline.

### Case D — No reliable distinction
`resolvedRuleCode = null`, `ambiguous = true`, `confidence = 'LOW'`,
`fallbackReason = 'AMBIGUOUS_TIE'` — when multiple matchers report equal
confidence with no modal-presence structural signal to break the tie.

## Morphology-safety restatement

No `HIGH` confidence from: a bare `-s`/`-es` suffix alone; one signal
word; sentence length; a legacy `COLLOCATIONS` classification (the
classifier's last-resort catch-all, never evidence for any specific
rule); or a diff whose own `reliability` is below `HIGH`.

## Reclassified: what actually blocks what

**Does not block implementation:** `GrammarRule`/`GrammarRuleExample`
models; the additive migration; `DRAFT` import; this resolver interface;
the ~70+ unit test suite (most cases don't involve the `did`+irregular
pattern); the nullable `ErrorRecord.grammarRuleId`/`grammarResolverVersion`
integration.

**Blocks or limits activation quality:** the diff extractor's actual
reliability grading (untested until built); legacy-classifier
compatibility risk (documented above, mitigated by each matcher's own
structural check, independent of category); the `did`+irregular-verb
pattern specifically (structurally reachable now, resolution quality
depends on matcher design and diff reliability — an implementation/test
question); absence of a reliable modal/do-support signal beyond curated
word lists (works for the 12 MVP rules' worked examples, unproven at
scale); ambiguity behavior in real traffic (untested until real traffic
exists); and — new this round — the **hard source-verification gate**
means no amount of resolver quality matters until at least one rule
reaches `VERIFIED_DIRECTLY`/`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`
and is actually `PUBLISHED`.
