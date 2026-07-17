# Grammar MVP — Human review

**Status: AI documentation recommendation COMPLETE, human documentation
decision PENDING, production publication decision NOT APPROVED.** This
document does not repeat the 12 rule drafts — see
`grammar-mvp-decision-pack.md` for the full text of each rule, and
`grammar-source-verification.md` for per-rule source verification
status (all `PARTIALLY_VERIFIED` this round — see that document for why
none reaches a stronger tier in this environment).

## Correction this round: "APPROVE" was used prematurely

The previous version of this document assigned `APPROVE FOR
DOCUMENTATION` decisions directly. **That was wrong** — those were AI
recommendations, not decisions made by a human reviewer, and labeling
them "APPROVE" blurred that distinction. This version separates three
states explicitly, and no rule is marked approved by anyone but the AI
recommendation pass:

| Gate | Who/what decides | Possible values | Current state for all 12 rules |
| --- | --- | --- | --- |
| **1. AI documentation recommendation** | This review pass (AI-produced, not a human) | `RECOMMEND APPROVE` / `RECOMMEND REVISE` / `RECOMMEND REJECT` | Set per rule below |
| **2. Human documentation decision** | An actual human reviewer, not yet performed | `PENDING HUMAN REVIEW` (until a human acts) / `APPROVED` / `REVISE REQUESTED` / `REJECTED` | **`PENDING HUMAN REVIEW` for all 12 — no exceptions** |
| **3. Production publication decision** | Product owner, separate and later than gate 2 | `NOT APPROVED` / `APPROVED` | **`NOT APPROVED` for all 12 — no exceptions, regardless of gates 1 or 2** |

Gate 1 passing does not imply gate 2. Gate 2 passing would not imply
gate 3. All three are tracked independently and none is inferred from
another.

## Per-rule review table

| `ruleCode` | Final proposed CEFR (proposal, not verified — see `grammar-mvp-decision-pack.md`) | Content corrections applied this round | Source verification status | Resolver verification status | Remaining reviewer concern | AI documentation recommendation | Human documentation decision | Production publication decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ARTICLE_A_AN` | `A1` | None needed — draft was already accurate; edge-case note cross-referenced to the resolver-safety fix | `PARTIALLY_VERIFIED` (#1) | Reviewed — depends on `SINGULAR_PLURAL_ARTICLE_AGREEMENT`'s number-signal fix | None beyond the shared number-signal dependency | **RECOMMEND APPROVE** | PENDING HUMAN REVIEW | NOT APPROVED |
| `ARTICLE_THE_SPECIFIC` | `A1_PLUS` | Reframed into 3 explicit cases; `(context: ...)` annotations added to all pairs | `PARTIALLY_VERIFIED` (#2, now 2 independent publishers, still snippet-based) | Reviewed — MEDIUM confidence, no structural HIGH signal | Confirmed this round: rule does **not** reduce to "mentioned once → always *the*" — shared/identifiable reference remains the explicit condition. Country-name exception list must stay narrow | **RECOMMEND APPROVE** | PENDING HUMAN REVIEW | NOT APPROVED |
| `ARTICLE_ZERO_GENERAL` | `A2` | Newly authored; explicit contrast pairs against `ARTICLE_THE_SPECIFIC` | `PARTIALLY_VERIFIED` (#3, **second independent source added this round** — Oxford/OUP, addressing the prior single-source gap) | Reviewed — MEDIUM/LOW, no structural HIGH signal | Second-source gap that drove the earlier `REVISE` is now addressed; general-vs-specific remains a genuinely hard distinction for A2 learners, worth a closer look at the human-review stage | **RECOMMEND APPROVE** (upgraded from `RECOMMEND REVISE` now that a second source exists) | PENDING HUMAN REVIEW | NOT APPROVED |
| `PRESENT_SIMPLE_THIRD_PERSON` | `A1` | Removed the "only tense where verb form changes by person" overclaim; narrower, sourced claim about ordinary affirmative he/she/it forms | `PARTIALLY_VERIFIED` (#4, 2 publishers, plus a more precise spelling detail found this round — quiz→quizzes doubling) | Reviewed — precedence against `MODAL_BASE_VERB` documented | None beyond standard resolver-precedence testing already planned | **RECOMMEND APPROVE** | PENDING HUMAN REVIEW | NOT APPROVED |
| `PAST_SIMPLE_FORM` | `A1_PLUS` | Removed the unsourced "~150 irregular verbs" figure; split into main rule / spelling changes / curated frequent-forms list | `PARTIALLY_VERIFIED` (#5, single publisher, not cross-checked by a second source this round) | Reviewed — precedence below `DO_DOES_DID_QUESTIONS_NEGATIVES` and `PAST_SIMPLE_VS_PRESENT_PERFECT` | Single-source citation, lower priority than `ARTICLE_ZERO_GENERAL`'s gap since content is uncontroversial A1 material; curated irregular-verb list (9 verbs) is intentionally minimal | **RECOMMEND APPROVE** | PENDING HUMAN REVIEW | NOT APPROVED |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | `B1` | Signal words reframed as "reliable but not absolute"; since/for explained as context-dependent | `PARTIALLY_VERIFIED` (#6, strongest single citation in the whole set) | Reviewed — explicit HIGH/MEDIUM split, never a standalone classifier | Re-checked this round: draft still avoids treating finished-time markers as a universal NLP-style classifier and keeps the explicit context-dependency caveat — confirmed, no change needed. Most linguistically demanding rule in the set (only non-A-level rule) | **RECOMMEND APPROVE** | PENDING HUMAN REVIEW | NOT APPROVED |
| `MODAL_BASE_VERB` | `A2` | New content — no legacy table covered modal verbs at all | `PARTIALLY_VERIFIED` (#7) | Reviewed — explicit diff-specific precedence vs. `DO_DOES_DID_QUESTIONS_NEGATIVES` | No `MicroCategory` maps to this rule — **does not block this rule's documentation or DRAFT import; blocks resolver auto-activation/publication only, see `decisions.md` "Blocking" for the corrected wording** | **RECOMMEND APPROVE** | PENDING HUMAN REVIEW | NOT APPROVED |
| `BASIC_PREPOSITION_PATTERNS` | `A2_PLUS` | Added the arrive-home/here/there no-preposition nuance | `PARTIALLY_VERIFIED` (#8 — **each of the 7 curated patterns checked individually this round**; 5 of 7 confirmed via dedicated pages, `good at` and `listen to` confirmed only indirectly/generally) | Reviewed — exact curated-pattern match required for HIGH | Two of seven patterns (`good at`, `listen to`) rest on weaker evidence than the other five — flagged specifically, not glossed over; curated list intentionally narrow, scope caveat must stay visible to learners | **RECOMMEND APPROVE**, with the `good at`/`listen to` evidence gap noted for a follow-up targeted search before publication | PENDING HUMAN REVIEW | NOT APPROVED |
| `BASIC_WORD_ORDER` | `A1` | Removed the absolute-rule framing for time/place position; fronted adverbials now explicitly correct, not an error | `PARTIALLY_VERIFIED` (#9) | Reviewed — no HIGH confidence claim rests on word-order flexibility | None significant remaining | **RECOMMEND APPROVE** | PENDING HUMAN REVIEW | NOT APPROVED |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | `A1_PLUS` | New content — no legacy table covered do-support at all | `PARTIALLY_VERIFIED` (#10) | Reviewed — most complex precedence logic in the set (3 distinct diff cases vs. `MODAL_BASE_VERB`) | Same `MicroCategory`-mapping gap as `MODAL_BASE_VERB` — **does not block documentation or DRAFT import, blocks activation/publication only**; 3-case precedence logic needs real unit-test coverage, not just documentation | **RECOMMEND APPROVE** | PENDING HUMAN REVIEW | NOT APPROVED |
| `COUNTABLE_UNCOUNTABLE` | `A2` | Replaced "much evidence" as the lead affirmative example with "a lot of"/"substantial evidence" | `PARTIALLY_VERIFIED` (#11 — **each of the 12 curated nouns checked individually this round**; 11 of 12 confirmed via dedicated/general Cambridge pages, `feedback` confirmed only indirectly) | Reviewed — known-uncountable-noun-from-reviewed-lexicon required for HIGH | `feedback`'s evidence is the weakest in the noun list — flagged, not silently included at equal confidence; `work`'s dual countable/uncountable behavior is now explicitly documented rather than hidden | **RECOMMEND APPROVE**, with the `feedback` evidence gap noted for a follow-up targeted search before publication | PENDING HUMAN REVIEW | NOT APPROVED |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | `A1_PLUS` | Removed "physically cannot" and historical a/an origin explanation; removed suffix-only number determination; explicit news/mathematics/species counterexample list | `PARTIALLY_VERIFIED` (#12) | Reviewed — **most heavily corrected resolver hints in the set**; bare `-s`/`-es` suffix no longer sufficient for HIGH | Resolver-hint correction is documented but not yet implemented or tested in code — this rule's safety claim rests entirely on the plan in `grammar-resolver-test-cases.md`, not on running tests; `business`/`class`/`analysis` counterexamples are not individually source-confirmed (only `news`/`species` are) | **RECOMMEND APPROVE**, resolver-hint fix must be verified in code before this rule is trusted for HIGH-confidence auto-resolution | PENDING HUMAN REVIEW | NOT APPROVED |

**Tally:** 12 × `RECOMMEND APPROVE` (2 with an explicitly flagged
follow-up evidence gap: `BASIC_PREPOSITION_PATTERNS`,
`COUNTABLE_UNCOUNTABLE`); 0 × `RECOMMEND REVISE`; 0 × `RECOMMEND REJECT`.
`ARTICLE_ZERO_GENERAL`'s earlier `RECOMMEND REVISE` is upgraded this
round now that a second independent source was added.
**Human documentation decision: `PENDING HUMAN REVIEW` for all 12, no
exceptions — this document does not and cannot substitute for that
step.** **Production publication decision: `NOT APPROVED` for all 12, no
exceptions.**

## The 5 flagged highest-risk rules — why (unchanged from the prior round, re-confirmed)

These are the same 5 rules flagged "high-risk"/"highest-risk" inline in
`grammar-mvp-decision-pack.md`. The flag survives this round's
corrections because each has a *structural* reason for extra scrutiny,
not just a wording issue that got fixed:

1. **`PAST_SIMPLE_VS_PRESENT_PERFECT`** — the only non-A-level (B1) rule
   in the set; genuinely requires judgment (result-now vs. finished-time),
   not a lookup table. Re-checked this round — the context-dependency
   caveat is intact.
2. **`ARTICLE_THE_SPECIFIC`** — "already known to both speakers" is a
   pragmatic/discourse concept; re-checked this round and confirmed not
   reduced to "mentioned once → always *the*"; risk of the country-name
   exception list growing without bound if not kept disciplined.
3. **`ARTICLE_ZERO_GENERAL`** — was the only rule resting on a single
   source; **addressed this round** with a second independent citation.
   Kept in the flagged list because general-vs-specific remains
   pedagogically hard, not because the source gap is still open.
4. **`BASIC_PREPOSITION_PATTERNS`** — prepositions are the least
   rule-governed area of English grammar generally; this round's
   per-pattern check found 2 of 7 curated patterns (`good at`,
   `listen to`) resting on weaker evidence than the other 5 — a new,
   more precise finding than the prior round's generic flag.
5. **`COUNTABLE_UNCOUNTABLE`** — despite good overall coverage, the
   register nuance (`much` vs. `a lot of`) is exactly the kind of
   subtlety easy to oversimplify; this round's per-noun check found
   `feedback` resting on weaker evidence than the other 11 nouns — same
   kind of new, more precise finding.

None of the 5 are `RECOMMEND REJECT` — the underlying grammar content is
sound. The flag means: give these five a closer second read (and, for
#4/#5, a targeted follow-up search on the specific weak items named
above) at the human-review stage specifically.

## Blockers — see `decisions.md` for the full 5-category breakdown

This document previously stated blocking questions inline; they are now
consolidated in `decisions.md` → "Blocking," split into: blocks
documentation commit (empty), blocks Grammar implementation, blocks
publication/activation, blocks Phrase MVP, blocks Reading MVP — so the
`MicroCategory`-mapping gap for `MODAL_BASE_VERB`/
`DO_DOES_DID_QUESTIONS_NEGATIVES` is no longer described as blocking
documentation or `DRAFT` creation, only resolver activation/publication.

## Production publication gate — explicit statement (unchanged)

**Production publication decision is NOT APPROVED for all 12 rules, no
exceptions, regardless of any AI recommendation or future human
documentation decision above.** Gate 3 requires, at minimum:

- The `GrammarRuleResolver` actually implemented and unit-tested against
  every worked example in `grammar-resolver-test-cases.md` — none of
  that code exists yet.
- The `MicroCategory`-mapping gap for `MODAL_BASE_VERB` and
  `DO_DOES_DID_QUESTIONS_NEGATIVES` resolved (`decisions.md` → Blocks
  publication/activation).
- A real migration dry-run executed and verified, not just planned
  (`grammar-migration-dry-run-plan.md` — currently plan-only).
- A human documentation decision actually made (gate 2, currently
  `PENDING HUMAN REVIEW` for all 12) — not inferred from the AI
  recommendation.
- A separate, explicit go/no-go decision from the product owner, made
  after all of the above, not inferred from this document.

This gate is not expected to open as part of this documentation round.
