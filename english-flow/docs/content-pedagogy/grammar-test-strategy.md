# Grammar MVP — Test strategy

**Status: strategy only. No test files exist for any Grammar MVP code —
none of that code exists either.** This document defines the minimum
test matrix required before merge of the eventual implementation PR(s).
Test patterns below mirror the actual existing style in this repo
(confirmed by reading `micro-category.classifier.spec.ts`,
`errors.service.spec.ts`, and `errors.service.daily-session.spec.ts` in
full) — plain Jest `describe`/`it`, Russian test descriptions, direct
function calls for pure logic, no test framework change proposed.

## Schema/migration tests

**Corrected this round:** the migration is now **5 steps, not 6**
(`GrammarRule.microCategories`/`.resolverHints` removed entirely,
`.reviewedBy`/`.reviewedAt` removed, `.exerciseSchemaVersion` added,
`ErrorRecord.grammarResolverVersion` added, `MicroLesson.sourceRuleCodes`
dropped from this migration — see `grammar-migration-execution-plan.md`).

| Test | What it verifies |
| --- | --- |
| Fresh database — run all migrations including the 5 new steps from a blank DB | The full migration set applies cleanly with no ordering error |
| Database with all existing migrations, then the new 5 | The realistic upgrade path — confirms the new steps apply cleanly on top of the current 5 migrations without conflicting with any existing column/index name |
| Rollback rehearsal | Each step's documented rollback SQL (`grammar-migration-execution-plan.md`) actually executes without error on a copy of the post-migration schema, and leaves the schema identical to the pre-migration snapshot |
| Legacy `ErrorRecord` rows | Insert rows shaped like pre-Grammar-MVP data (all context fields `null`), then run the migration — confirm `grammarRuleId` **and** `grammarResolverVersion` are both `NULL` on every one, zero rows touched by an `UPDATE` |
| Duplicate `ruleCode` | Attempt `INSERT INTO "GrammarRule"` twice with the same `ruleCode` — confirm the unique constraint rejects the second insert, not a silent overwrite |
| `GrammarRule` row without `exerciseSchemaVersion` | Confirm the `NOT NULL` constraint rejects an insert missing this field — it has no default, every CLI-created row must supply it explicitly |
| Invalid status transitions | Confirm the *application-layer* validation (editorial CLI) rejects a `publish` attempt when the import manifest shows no matching human-approved, reviewed content-version entry for that `ruleCode` — corrected this round: the gate is the manifest match, not a `reviewedBy`/`reviewedAt` column pair (those columns no longer exist on `GrammarRule` — review metadata is Git-only, see `grammar-prisma-model-proposal.md`) — this is a CLI unit test, not a migration test |

## Resolver unit tests — minimum 3–5 cases per rule, all re-derived from the actual classifier this round

Every case below was verified against the real `classifyMicroCategory()`
output in this session (see `grammar-resolver-contract.md`'s precedence
matrix for the full trace) — test expectations are written to match
observed behavior, not assumed behavior.

**Corrected framing this round:** the legacy classifier's per-case
output shown below (`ARTICLES`, `THIRD_PERSON_SINGULAR`, etc.) is a
**compatibility/regression-test data point**, not the mechanism by which
a rule actually resolves. Under the corrected candidate-set design (see
`grammar-resolver-contract.md`), every `PUBLISHED` rule is a candidate
regardless of `existingMicroCategory`; a rule resolves because its own
TypeScript matcher (see `grammar-resolver-contract.md`'s `RuleMatcher`
interface) matches the structural diff, never because a legacy
category happened to be assigned. Table cells below that mention a
legacy category are documenting a **known compatibility fact worth a
regression test**, not a routing dependency.

| `ruleCode` | Positive | Negative | Ambiguous | False-positive guard | Legacy fallback |
| --- | --- | --- | --- | --- | --- |
| `ARTICLE_A_AN` | `a hour`→`an hour` resolves `HIGH` | `a university`→ no error (correct as-is), resolver never invoked | `a report`/`the report` diff with no other signal → could match `ARTICLE_A_AN` or `ARTICLE_THE_SPECIFIC` depending on which article appears — must not default to `HIGH` on either without the specific hint firing | Plural noun ending in `-s` must not be treated as a candidate for `a/an` insertion (guards against `SINGULAR_PLURAL_ARTICLE_AGREEMENT`'s known suffix trap leaking into this rule) | Category `ARTICLES` with no `PUBLISHED` `ARTICLE_A_AN` row → legacy `CATEGORY_SIMPLIFIED_RULE.ARTICLES` fires |
| `ARTICLE_THE_SPECIFIC` | `I read report. Report was long.`→`I read a report. The report was long.` (2nd-mention diff) resolves `MEDIUM` (no `HIGH` signal defined for this rule per the contract) | First-mention `a report` inserted, no `the` involved → not a candidate | Same-diff ambiguity as `ARTICLE_A_AN` above | `the` following a superlative must not be mistaken for a generic "mentioned before" case without the qualifying-phrase signal | Falls back identically to above |
| `ARTICLE_ZERO_GENERAL` | `The compliance is important`→`Compliance is important` (uncountable, general) resolves | `The regulator reviewed`→ (already correct, specific) not a candidate | `Regulators check reports.`/`The regulators...` — general vs. specific hinges on qualifying clause presence, ambiguous without it | Must not fire on a **singular countable** noun losing its article (that's `SINGULAR_PLURAL_ARTICLE_AGREEMENT`/`ARTICLE_A_AN` territory, per this round's human-review-mandated distinction) | Falls back to newly-authored `ARTICLE_ZERO_GENERAL` legacy text (no pre-existing legacy table covers zero-article, confirmed by grep in `phase-2a-audit.md`) |
| `PRESENT_SIMPLE_THIRD_PERSON` | `He work`→`He works` resolves `HIGH` (structural: he/she/it + suffix change, **no modal present**) | `He can works`→ (already wrong, but modal present) must **not** resolve here | — | **Confirmed real guard needed:** `she can works`→`she can work` classifies as `THIRD_PERSON_SINGULAR` by the raw classifier — this rule's own TypeScript matcher must explicitly check for absence of a modal token before assigning `HIGH`, or this rule would wrongly claim a `MODAL_BASE_VERB` case | `THIRD_PERSON_SINGULAR` category, no `PUBLISHED` rule → legacy fallback |
| `PAST_SIMPLE_FORM` | `I go`→`I went` (in a finished-past context) resolves | `did went`→ do-support present, must not resolve here | `for three years` case — could be Past Simple or Present Perfect, ambiguous without more context | Must not fire on a `did`+irregular pair (that's `DO_DOES_DID_QUESTIONS_NEGATIVES`, confirmed to classify as `null`, so this guard is moot for that specific pattern but matters for do-support cases that DO get a `PAST_SIMPLE` category) | Legacy fallback via `CATEGORY_RULE_DETAILS.PAST_SIMPLE` |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | `I finished it yesterday.`→ correct as-is (Past Simple, finished-time marker) vs. `I have finished it.`→ correct as-is (Present Perfect, no marker) — test the resolver picks the right rule for **both** directions, since the classifier's `PRESENT_PERFECT` branch only fires when `have`/`has` is **added** (confirmed gap in `grammar-resolver-contract.md`) | `I lost my passport during the trip.` — Past Simple, no explicit date, must not default to `PRESENT_PERFECT` just because no date-string is present | `I worked here for five years.`/`I have worked here for five years.` — the required contrast pair from this round's human review; both must resolve correctly to `PAST_SIMPLE_VS_PRESENT_PERFECT`, evidence differing (`for`+finished vs. `for`+continuing) | Signal word alone (`for`) must never yield `HIGH` without the have/has structural signal | Legacy fallback via `CATEGORY_RULE_DETAILS.PRESENT_PERFECT` |
| `MODAL_BASE_VERB` | `must to call`→`must call`, `can works`→`can work`, `should reported`→`should report` — **3 positive cases**, resolved purely by this rule's own structural hint (modal retained + following verb's form changed); the legacy classifier's per-case output (`PREPOSITIONS`/`THIRD_PERSON_SINGULAR`/`PAST_SIMPLE` respectively) is **not** what makes these resolve — it is unrelated compatibility trivia, tested separately as a regression-test input, not as the resolution mechanism | `want to go`→ correct as-is, `want` is not a modal, `to` legitimately required | `Does she can work?`→`Can she work?` — could be `MODAL_BASE_VERB` (secondary) or `DO_DOES_DID_QUESTIONS_NEGATIVES` (primary) — Case B precedence must resolve to the latter as primary | `must to comply`-style sentences containing compliance vocabulary must not be claimed by this rule at all — they legacy-classify as `COMPLY_VS_COMPLIANCE`, confirmed empirically; **regression test:** confirm this rule's own matcher still fires correctly via structural diff even when `existingMicroCategory = COMPLY_VS_COMPLIANCE` (a rule with no genuine category tag must not be structurally excluded by an unrelated legacy label) | No `PUBLISHED` `MODAL_BASE_VERB` row → legacy fallback keyed by whatever `microCategory` the legacy classifier separately assigned (`PREPOSITIONS`/`THIRD_PERSON_SINGULAR`/`PAST_SIMPLE`/`COMPLY_VS_COMPLIANCE` text, as applicable) — not a modal-specific fallback (none exists) |
| `BASIC_PREPOSITION_PATTERNS` | `responsible of`→`responsible for` resolves `HIGH` (exact curated pattern) | `arrive home`→ correct as-is, no preposition needed (the no-preposition edge case) must not be flagged as an error at all | `comply to`/`comply with` — legacy-classifies as `COMPLY_VS_COMPLIANCE`, not `PREPOSITIONS`, confirmed empirically — test must assert this rule's own structural hint still resolves it correctly regardless of which legacy category the diff happened to land in | Must not fire `HIGH` on a preposition swap outside the 7 curated patterns (e.g. a genuinely free preposition choice) | Legacy fallback keyed by whatever `microCategory` was assigned (`PREPOSITIONS` or `COMPLY_VS_COMPLIANCE`, as applicable) |
| `BASIC_WORD_ORDER` | `Always I check`→`I always check` (reordering, same multiset) resolves | `Yesterday, I finished the report.`→ correct as-is (fronted adverbial, not an error) must not be flagged | `I yesterday finished` — genuinely awkward mid-sentence placement vs. stylistically-valid fronting, requires context judgment | Must not classify every same-length sentence pair as a word-order error — only actual multiset-preserving reorderings | Legacy fallback via `CATEGORY_RULE_DETAILS.WORD_ORDER` |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | `doesn't works`→`doesn't work`, `does she has`→`does she have` — **2 positive cases**, resolved by this rule's own structural hint (do-support retained + main verb's double-marking removed), independent of whichever legacy category the diff happens to land in | `Is she here?`→ correct as-is, `be`-verb, do-support not applicable | `Can she work?`/`Does she can work?` — Case B, must resolve here as primary, `MODAL_BASE_VERB` as logged secondary | **Corrected this round — no longer a "confirmed non-case," a real test of the corrected pipeline's improvement:** `did went`→`did go` legacy-classifies as `null`, but under the corrected candidate-set (no category gate, `PUBLISHED`-only), this rule **is** a candidate for this diff — whether it actually resolves depends on whether the matcher correctly matches "did retained + irregular verb form changed" structurally. **This test's purpose is to prove that specific match works**, not to assert permanent unreachability. If it fails, that's a resolver-implementation/matcher-design gap (an activation-quality issue, `grammar-resolver-contract.md`'s "Reclassified" section), not a schema or classifier blocker | If the positive case above doesn't resolve (hint gap), legacy fallback is the only path for that specific pattern — no legacy category is relevant to this pipeline's resolution mechanism either |
| `COUNTABLE_UNCOUNTABLE` | `many evidences`→`a lot of evidence` resolves `HIGH` (known-uncountable-noun-from-lexicon signal) | `a work of art`→ correct as-is (countable sense of `work`) must not be flagged as an uncountable-noun error | `much`/`a lot of` register choice — both grammatically valid, ambiguous which the resolver should "prefer" (neither is wrong; this is a content question, not a resolver-confidence question) | Must not fire on `feedback` pluralized with the same `HIGH` confidence as `information`/`advice` given `feedback`'s weaker source-evidence status (`grammar-source-verification.md` #11) — confidence should reflect evidence strength, `MEDIUM` not `HIGH`, until that gap closes | Legacy fallback via `CATEGORY_RULE_DETAILS.COUNTABLE_VS_UNCOUNTABLE` |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | `a documents`→`documents` resolves | `the news is good`→ correct as-is, `news` ends in `-s` but is singular — **must not** be flagged as a plural-article mismatch | `an employees`→`employees` vs. a legitimate but rare countable use — low ambiguity in practice, included for completeness | **The mandatory guard from this round's correction:** `business`, `class`, `analysis`, `series`, `species`, `news`, `mathematics` ending in `-s` must never yield `HIGH` confidence for a plural-article mismatch from the suffix alone — every one of these must be an explicit test case, not just `news`/`species` (the two with a dedicated source citation) | Legacy fallback — no pre-existing table covers this rule's exact scope, confirmed by grep |

**Total minimum unit tests implied by this table:** 12 rules × (1
positive + 1 negative + 1 ambiguous + 1 false-positive guard + 1 legacy
fallback) = **60 test cases minimum**, several rows requiring more than
one case per column (noted inline) pushing the realistic minimum toward
**70+**.

### The specific examples named in this round's brief — mapped to the table above

`business`, `class`, `analysis`, `species`, `news`, `mathematics` →
`SINGULAR_PLURAL_ARTICLE_AGREEMENT` false-positive guard row.
`Does he work?`/`Does he works?` → `PRESENT_SIMPLE_THIRD_PERSON`
negative case (the `works` form is the error `PRESENT_SIMPLE_THIRD_PERSON`
would wrongly accept without the do-support guard) and
`DO_DOES_DID_QUESTIONS_NEGATIVES` positive case (`does he works`→`does
he work`, structurally identical to the already-verified `doesn't
works`→`doesn't work`). `Can she work?`/`Does she can work?` → Case B,
`DO_DOES_DID_QUESTIONS_NEGATIVES` ambiguous row.
`I worked here for five years`/`I have worked here for five years` →
`PAST_SIMPLE_VS_PRESENT_PERFECT` ambiguous row, the exact required
contrast pair. Signal word without sufficient context → covered across
multiple rows' "ambiguous" and "false-positive guard" columns, not one
single test — this pattern recurs per-rule, not as a single global case.
Fronted adverbials → `BASIC_WORD_ORDER` negative case. Countable senses
of normally-uncountable nouns → `COUNTABLE_UNCOUNTABLE` negative case
(`work`) plus the contextual-countability caveat from this round's human
review (evidence/research/feedback/software/knowledge) as additional
negative cases beyond the one the brief named explicitly.

## Integration tests

| Test | What it verifies |
| --- | --- |
| `ErrorRecord` creation with `grammarRuleId` staying `null` | The default, expected path when the resolver finds no match — `recordErrors()` in `errors.service.ts` continues to create rows exactly as today, with the new field simply unset |
| Automatic assignment — all conditions met | `grammarRuleId` is set **only** when every one of the automatic-assignment-policy conditions holds simultaneously: `resolvedRuleCode` unambiguous, `confidence = HIGH`, `ambiguity = false`, a matching `GrammarRule` row exists, `contentStatus = PUBLISHED`, not `ARCHIVED`, and the diff's `reliability = HIGH` — requires a `PUBLISHED` `GrammarRule` fixture in the test DB, which per this round's status (`production publication NOT APPROVED`) does not exist in any real environment yet — this test necessarily runs against a fixture, not production-shaped data |
| Automatic assignment — each condition tested as an independent negative case | `confidence = MEDIUM` or `LOW`, `ambiguity = true`, or diff `reliability` not `HIGH` — each individually must leave `grammarRuleId` **and** `grammarResolverVersion` both `null`, even when every other condition is satisfied; confidence is never a publication or assignment permission on its own (`grammar-resolver-contract.md`'s automatic assignment policy) |
| `grammarResolverVersion` persisted alongside `grammarRuleId` | **Corrected this round — no longer log-only.** On a successful automatic assignment, `ErrorRecord.grammarResolverVersion` is set together with `grammarRuleId` in the same write, not only emitted to observability logs; test asserts both fields are non-null after the same `recordErrors()` call and both stay `null` together whenever assignment doesn't happen |
| Assignment attempt against an unknown `ruleCode` | Confirms the resolver never fabricates a `ruleCode` that doesn't exist in `GrammarRule` — resolves with `grammarRuleId = null`, `fallbackReason = 'UNKNOWN_RULE_CODE'`, and a structured warning metric emitted (not a runtime exception); the FK constraint is the backstop for any accidental write, but this path should never reach it in practice — test exists to confirm the invariant holds and the fallback reason is specifically `UNKNOWN_RULE_CODE`, not a generic failure |
| Assignment attempt against an `ARCHIVED` rule | Confirms `ARCHIVED` rules are excluded from the candidate-set query (`WHERE contentStatus = 'PUBLISHED'`) — an archived rule must never be newly assigned to an `ErrorRecord`, even though existing `ErrorRecord` rows that already reference it (if the rollback path was ever exercised) keep their FK per `onDelete: SetNull` only firing on delete, not on archive |
| Word-order diff represented without `MOVE` | **Corrected this round:** the diff contract has no `MOVE` operation type — a reordering like `Always I check`→`I always check` must arrive as a paired `DELETE`+`INSERT` (or multiple `REPLACE`s), never a single `MOVE` op; test asserts the diff extractor's output for a reordering case only ever uses `INSERT`/`DELETE`/`REPLACE`, and that `BASIC_WORD_ORDER`'s matcher correctly recognizes the paired-operation shape as its structural signal |
| Diff `reliability` below `HIGH` blocks automatic assignment even with a strong rule match | A matcher may still return a candidate `ruleCode` when `diffSchemaVersion`/`extractorVersion` metadata indicates `reliability = MEDIUM`/`LOW`, but `grammarRuleId` must stay `null` regardless of how strong the structural match looks — resolver confidence can never exceed the diff's own reliability tier |
| Resolver version logging | Every resolved (or fallback) `ErrorRecord` write logs `resolverVersion` per the observability contract, in addition to the `grammarResolverVersion` DB persistence above — test asserts the log call happens exactly once per `recordErrors()` invocation, matching the one-call-per-error loop already in that function |
| Existing Errors flow unchanged | The full existing `errors.service.spec.ts` and `errors.service.daily-session.spec.ts` suites (57 tests total, confirmed passing in this session as a baseline) must continue to pass unmodified after the resolver is wired in — this is the regression backstop, not a new test, but its continued green status is a hard merge gate |

## Editorial validation tests (the CLI's own test suite, not the resolver's)

| Test | What it verifies |
| --- | --- |
| Invalid `ruleCode` (doesn't match the 12 fixed codes, or malformed casing/characters) | Import command rejects it before any DB write |
| Duplicate `ruleCode` within one import batch | Rejected before the DB-level unique constraint would even be reached — a friendlier error at the CLI layer |
| Missing `explanationRu`/`shortExplanationRu` | Rejected — these are `NOT NULL` at the schema level too, but the CLI should fail with a clear message rather than surfacing a raw Postgres constraint error |
| Invalid `cefrLevel` (not one of the 8 real enum values) | Rejected at the CLI's validation layer before hitting Postgres's own enum-type rejection |
| Malformed `exerciseTemplates` JSON shape | Rejected by the Zod schema mentioned in `grammar-prisma-model-proposal.md` — since Postgres's `JSONB` column accepts any valid JSON, this validation exists **only** at the CLI layer, making this test non-optional (there is no DB-level backstop for it). **Corrected this round:** `resolverHints` no longer exists as a JSON/DB concept at all — matcher logic is version-controlled TypeScript, so its correctness is covered by the plain Jest unit tests in the "Resolver unit tests" table above, not by JSON schema validation |
| `REVIEWED`/`PUBLISHED` content status attempted with no matching entry in the import manifest | Rejected — **corrected this round:** `reviewedBy`/`reviewedAt` no longer exist as `GrammarRule` columns (review metadata is Git-only, see `grammar-prisma-model-proposal.md`'s "Review metadata stays in Git" section); the CLI instead requires a machine-readable import manifest entry for that `ruleCode` recording `humanDecision`/`sourceVerificationStatus`/`reviewedContentVersion`, and rejects the transition when no matching approved entry exists — there is no DB `CHECK` constraint doing this, it is CLI-layer only |
| `contentStatus = PUBLISHED` attempted while `sourceVerificationStatus` is `NOT_VERIFIED` or `PARTIALLY_VERIFIED` | **Corrected this round — hard block, not a warning.** Retracts the earlier "warn, don't block" position as contradicting the accepted publication blockers (`grammar-prisma-model-proposal.md`'s "Source verification — corrected to a hard publication gate" section). Only `VERIFIED_DIRECTLY`/`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE` may pass; the CLI rejects the `publish` operation outright for the other two statuses, with no `--force` override in MVP. Applying this to the current 12 rules: since source verification is presently `PARTIAL` project-wide (`grammar-source-verification.md`), this test also confirms that **no rule in its current state could pass `publish` today** — DRAFT/REVIEWED import remains possible, publication does not |
| `publish` attempted with any one of the 5 required conditions missing (`contentStatus≠REVIEWED`, invalid source status, invalid exercise JSON, no explicit production-publish approval, `contentVersion`/manifest mismatch) | Rejected for each condition independently — five separate test cases, not one combined case, since the gate is a simultaneous-AND of all five (`grammar-prisma-model-proposal.md`) |
| `publish` attempted against an `ARCHIVED` rule (reactivation) without a fresh, explicit publish approval | Rejected — reactivation (`ARCHIVED → PUBLISHED`) must re-pass the full gate (validation, source-verification, production approval) exactly like a first publication; it is not a lighter-weight status flip |

## What this test strategy does not cover (explicitly out of scope this round)

Frontend test coverage for any Grammar MVP UI (none has been designed —
this round is backend/data-model only); load/performance testing (12
rows, non-issue at MVP scale, matches the already-accepted "no premature
optimization" position in `retrieval-architecture.md`); Phrase MVP and
Reading MVP test strategies (separate, later documents).
