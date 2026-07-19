# Grammar MVP — Publication-readiness report (2026-07-18, updated 2026-07-19)

**Fourth pass (2026-07-19): incorporates additional external reviewer
evidence for `ARTICLE_A_AN` (upgraded) and `BASIC_WORD_ORDER` (recorded,
not upgraded), and produces the proposed Grammar MVP partial-publication
decision package — a first-launch subset using only rules whose
material claims are fully covered by direct authoritative evidence.**
Earlier passes' corrections (migration/import state, Gate A/B framing)
remain valid and are carried forward unchanged.

**Bottom line, updated this pass: 8 of 12 rules are now proposed
`VERIFIED_DIRECTLY`. The remaining 4 rules are proposed to stay
`PARTIALLY_VERIFIED` and hidden.** These remain **proposals only** — no
`sourceVerificationStatus` or `contentStatus` value in production has
been changed, no rule has been published, nothing has been deployed.
**Zero known factual contradictions** were found in any of the 12 rules
across all four verification passes; no content edit was made or is
warranted.

## Evidence provenance — read this before the rest of the report

Three evidence classes appear in this report and in
`grammar-source-verification.md`. They are never conflated:

- **Class A — directly accessed by this Claude session.** Never
  achieved. `WebFetch` has been blocked (proxy `CONNECT`/403) every time
  it was tried, across all four passes. No Class A evidence exists.
- **Class B — externally/directly verified by independent reviewer.**
  An external reviewer, outside this session and not subject to its
  egress block, directly opened a specific set of Cambridge Dictionary
  Grammar pages and reported which claims each supports. **This is the
  evidence basis for this report's `VERIFIED_DIRECTLY` proposals below.
  It is recorded as external reviewer evidence, never described as this
  session's own access.**
- **Class C — search-index/snippet corroboration only.** This session's
  own `WebSearch` tool, used across the first two passes, returning
  indexed snippets/short quotes without opening any page. This is the
  evidence basis for every rule not proposed `VERIFIED_DIRECTLY`, and for
  ancillary details noted as "not itemized" even within rules that are.

## External independent direct-source verification (Class B)

**Primary authoritative source organization: Cambridge Dictionary —
English Grammar Today.** Across the second and third passes, the
external reviewer reported directly accessing 14 Cambridge Dictionary
Grammar pages. Full page-by-page detail, exact URLs, and per-rule
coverage analysis are in `grammar-source-verification.md`.

### Methodology: material-claim coverage, not automatic upgrade

A rule is **not** upgraded merely because a URL exists against it. Each
rule's actual content in `grammar-rules.data.ts` was broken into its
distinct, separately-taught material claims — the mechanism its
`formula` field encodes, any named exception with its own worked
example, any curated list of individually-taught items. A rule is
proposed `VERIFIED_DIRECTLY` only when the reported reviewer coverage
explicitly addresses **every** such claim. Where a rule is built around
several **co-equal, independently-taught items** and the reported
coverage names only some of them, the rule stays `PARTIALLY_VERIFIED`
with the uncovered items named precisely.

No rule was proposed `VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`:
every citation in the reviewer's evidence is Cambridge itself — the
project's designated primary source — directly reached.

### `ARTICLE_A_AN` reassessment (2026-07-19, fourth pass): upgraded to `VERIFIED_DIRECTLY`

New evidence, same page as before ("A/an and the"), reported this pass
with additional specific detail:
- *"a is used before a consonant sound"* / *"an is used before a vowel
  sound"* → directly confirms the rule's core mechanism: sound, not
  letter, governs the choice.
- *"some vowel-letter words begin with a consonant sound," example "a
  university"* → directly confirms the rule's own `university`
  exception — the exact worked example the rule's `explanationRu`
  already uses.
- *"some consonant-letter words begin with a vowel sound," example "an
  hour"* → directly confirms the rule's own `hour` exception — again the
  exact worked example the rule already uses.
- *"a/an are used only with singular countable nouns"* → confirms the
  scope, consistent with the general indefinite-reference confirmation
  already reported in the second pass.

**All material claims in `ARTICLE_A_AN`'s final reviewed content are now
covered**: indefinite/singular-countable usage, the sound-vs-letter
mechanism, and both named exceptions (`university`, `hour`) — the exact
two worked examples the rule itself teaches. No unsupported material
claim remains. **Proposed `VERIFIED_DIRECTLY`.**

### `BASIC_WORD_ORDER` reassessment (2026-07-19, fourth pass): evidence recorded, NOT upgraded

New evidence, Cambridge "Adverbs and adverb phrases: position," reported
to state: mid position is between subject and main verb; with multiple
verbs, mid position is after the first auxiliary or modal; adverbs
usually follow main verb `be`; frequency adverbs usually occur in mid
position.

Compared against this rule's exact final content:
- **Now covered:** the core mid-position mechanism (before the main
  verb, after `to be`) that governs all 3 of the rule's `INCORRECT`
  examples.
- **Still NOT covered — two distinct, precisely-named claims remain:**
  1. **The `always`-in-negatives claim** — the rule's `explanationRu`
     states `always` behaves differently from most other frequency
     adverbs in negative constructions. The new evidence's bullets are
     generic mid-position/after-auxiliary statements and do not single
     out `always` at all.
  2. **The fronted-adverbial-is-not-an-error claim** — the rule's
     `EXCEPTION` example ("Yesterday, I finished the report") asserts
     that fronting a time/place adverbial for emphasis is legitimate,
     not an error. The new evidence is entirely about frequency-adverb
     position categories and does not address sentence-initial fronting
     of time/place adverbials at all.

Per explicit instruction, **this evidence is recorded but does not
upgrade this rule.** Independent of that instruction, the two named
claims above would keep this rule below full coverage under the same
material-claim-coverage standard applied to every other rule in this
document. **Verification status remains `PARTIALLY_VERIFIED`.**

## Reassessed publication-readiness matrix (all 12 rules)

| `ruleCode` | humanReview | technicalReadiness | externalDirectSourceEvidence | proposedSourceVerificationStatus | publicationReadyFromContentPerspective | Source pages (Class B) | Caveats / uncovered claims |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ARTICLE_A_AN` | APPROVED | READY | Full — mechanism + both exceptions (2026-07-19) | `VERIFIED_DIRECTLY` (upgraded 2026-07-19) | YES (content perspective only) | A/an and the | None |
| `ARTICLE_THE_SPECIFIC` | APPROVED | READY | Full — primary mechanism | `VERIFIED_DIRECTLY` | YES (content perspective only) | A/an and the | None |
| `ARTICLE_ZERO_GENERAL` | APPROVED | READY | Full — four-way table explicitly named | `VERIFIED_DIRECTLY` | YES (content perspective only) | A/an and the | None |
| `PRESENT_SIMPLE_THIRD_PERSON` | APPROVED | READY | Full — primary -s/-es mechanism | `VERIFIED_DIRECTLY` | YES (content perspective only) | Present simple (I work) | `have→has`/`do→does` not itemized by name (Class C corroborated, same URL) |
| `PAST_SIMPLE_FORM` | APPROVED | READY | Full — regular/irregular split | `VERIFIED_DIRECTLY` | YES (content perspective only) | Past simple (I worked) | Specific spelling sub-rules and irregular-verb list not itemized (standard elaboration, not a separate exception) |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | APPROVED | READY | Full — all 4 sub-categories + caveats named | `VERIFIED_DIRECTLY` | YES (content perspective only) | Past simple or present perfect?; Present perfect simple | None — most thorough coverage in the pack |
| `MODAL_BASE_VERB` | APPROVED | READY | Full — primary base-form mechanism | `VERIFIED_DIRECTLY` | YES (content perspective only) | Modality: forms | `ought to` exception not itemized by name (Class C corroborated, same URL) |
| `BASIC_PREPOSITION_PATTERNS` | APPROVED | READY | Partial — 2 of 7 curated patterns | `PARTIALLY_VERIFIED` (no change) | NO | At, in and to (movement); To; Phrasal verbs and multi-word verbs | 5 of 7 patterns not reported covered: `comply with`, `depend on`, `responsible for`, `interested in`, `good at` |
| `BASIC_WORD_ORDER` | APPROVED | READY | Partial — core mid-position mechanism only (2026-07-19) | `PARTIALLY_VERIFIED` (no change — recorded, not upgraded, per instruction) | NO | Word order and focus; Word order: structures; Adverbs and adverb phrases: position | `always`-in-negatives claim and the fronted-adverbial-is-not-an-error claim — neither covered even by the additional evidence |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | APPROVED | READY | Full — primary mechanism | `VERIFIED_DIRECTLY` | YES (content perspective only) | Do; Not | None |
| `COUNTABLE_UNCOUNTABLE` | APPROVED | READY | Partial — general framework only | `PARTIALLY_VERIFIED` (no change) | NO | Countable (dictionary entry) | All 11 individually-curated nouns + `work`'s dual-use behavior not reported covered — only the general countable/uncountable distinction is |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | APPROVED | READY | Partial — baseline a/an-singular mechanism only | `PARTIALLY_VERIFIED` (no change) | NO | A/an and the | The closed -s-ending-but-singular exception list (news, mathematics, etc.) and "one of the + plural" construction not reported covered |

**Totals: 8 proposed `VERIFIED_DIRECTLY`; 0 proposed
`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`; 4 remain
`PARTIALLY_VERIFIED`.**

## Proposed Grammar MVP partial-publication decision package

**The product architecture supports partial publication**: the
production Grammar read API (`GrammarService.listRules`/`getRuleDetail`)
returns only rows with `contentStatus = PUBLISHED`; every other rule
stays invisible regardless of `sourceVerificationStatus`. This lets the
safest possible first-launch set go out without waiting on the 4 rules
that need more evidence work. **This section is a proposal only — no
`contentStatus` or `sourceVerificationStatus` value has been changed,
and nothing has been published.**

### Group A — proposed safe for first launch (8 rules)

Rules whose material claims are fully covered by direct authoritative
(Class B) evidence, proposed `VERIFIED_DIRECTLY`, and — **pending the
separate approvals in "What this does not authorize" below** — eligible
to be marked `PUBLISHED`:

1. `ARTICLE_A_AN`
2. `ARTICLE_THE_SPECIFIC`
3. `ARTICLE_ZERO_GENERAL`
4. `PRESENT_SIMPLE_THIRD_PERSON`
5. `PAST_SIMPLE_FORM`
6. `PAST_SIMPLE_VS_PRESENT_PERFECT`
7. `MODAL_BASE_VERB`
8. `DO_DOES_DID_QUESTIONS_NEGATIVES`

### Group B — must remain `PARTIALLY_VERIFIED` and hidden (4 rules)

Rules with at least one uncovered material claim, per the matrix above.
These must **not** be published in this round regardless of any other
approval, since Gate B (source-verification) itself is unmet:

1. `BASIC_PREPOSITION_PATTERNS` — 5 of 7 curated patterns uncovered
2. `BASIC_WORD_ORDER` — `always`-in-negatives + fronted-adverbial claims uncovered
3. `COUNTABLE_UNCOUNTABLE` — 11 individually-curated nouns + `work` dual-use uncovered
4. `SINGULAR_PLURAL_ARTICLE_AGREEMENT` — exception-noun list + "one of the" construction uncovered

### What this proposed package does, and does not, authorize

It proposes: which 8 of 12 rules have their content-verification gate
(Gate B / `decisions.md` item #2) cleared, on the strength of the
external reviewer's Class B evidence, and which 4 do not.

It does **not** authorize, and this session has not performed:

- Any change to `sourceVerificationStatus` or `contentStatus` in the
  database — all 12 rules remain `REVIEWED`/`PARTIALLY_VERIFIED`,
  unchanged.
- Publishing any rule, including the 8 in Group A. `PUBLISHED` remains 0.
- Deployment of any kind.
- The separate, explicit product-owner go/no-go decision required by
  `grammar-rules-human-review.md` gate 3, which remains `NOT APPROVED`
  for all 12 rules, independent of source-verification tier, and is not
  something a documentation proposal can satisfy.

If a human reviewer accepts this proposal and gate 3 is separately
approved for Group A, the mechanical action to launch would be: update
`sourceVerificationStatus` to `VERIFIED_DIRECTLY` and `contentStatus` to
`PUBLISHED` for the 8 Group A `ruleCode`s only, leaving the 4 Group B
rows at `REVIEWED`/`PARTIALLY_VERIFIED`. **That action is out of scope
for this session and was not performed.**

## Corrections applied in the second pass (carried forward, still valid)

An earlier version of this report stated that production publication
was blocked by an un-executed migration dry-run and incomplete
production import. **That was stale and was corrected in the second
pass; the correction still holds:**

- Grammar MVP production schema migration: **EXECUTED**
- Production migration verification: **PASSED**
- `GrammarRule`/`GrammarRuleExample` production tables: **CREATED**
- Grammar production dry-run: **PASSED with ZERO writes**
- Real production Grammar import: **SUCCESS**
- Production `GrammarRule` count: **12**; `GrammarRuleExample` count: **91**
- `REVIEWED` count: **12**; `PARTIALLY_VERIFIED` count: **12**
- `PUBLISHED` count: **0**; `ARCHIVED` count: **0**
- User-facing Grammar MVP module: **MERGED**
- Grammar resolver core `grammar-mvp-v1`: **MERGED but INACTIVE**
- Render deploy of the Grammar module: **NOT YET EXECUTED**

Migration, dry-run, and import are **not** blockers and are not listed
as a `blockingReason` for any rule in this report's matrix.

## Gate A — Technical readiness: COMPLETE (unchanged)

Schema migrated and verified; tables created; content imported (12
rules, 91 examples); user-facing UI merged; resolver merged but
inactive; publication gate in the read API is fail-closed (production
returns `PUBLISHED` only; missing/unrecognized `NODE_ENV` also resolves
to `PUBLISHED`-only); `PUBLISHED` remains 0; Render deploy not yet
executed (not a content-verification blocker).

## Per-rule content re-verification findings — no contradiction in any pass

**No known factual contradiction was found in any rule, across any
pass.** The content in `grammar-rules.data.ts` is consistent with every
authoritative-source citation gathered — Class B and Class C alike. Full
per-rule citations, quotes, and coverage analysis are in
`grammar-source-verification.md`. No edit was made to
`grammar-rules.data.ts` — none was warranted.

## Recommendation

- **Do not change any `contentStatus` or `sourceVerificationStatus`
  value in production.** All 12 rules should remain
  `REVIEWED`/`PARTIALLY_VERIFIED`, exactly as before this report. The
  Group A / Group B proposal above is for a human to review and act on
  separately.
- **Do not publish any rule yet**, including Group A. Gate 3 (the
  separate product-owner publication decision) remains `NOT APPROVED`
  for all 12, independent of source-verification tier or this proposal.
- **No content changes are needed** — four passes of research found the
  existing 12-rule content consistent with every authoritative source
  checked.
- **For the 4 Group B rules**, the exact uncovered claim is named per
  rule (see matrix) — a future direct-source verification pass should
  target those specific gaps.

## Confirmation of scope compliance

- No production database write of any kind was made.
- No `contentStatus` or `sourceVerificationStatus` value was changed —
  all 12 rules remain `REVIEWED`/`PARTIALLY_VERIFIED` in the database;
  the matrix and Group A/B lists above record proposals only.
- No rule was published; `PUBLISHED` remains 0.
- Nothing was deployed.
- No content in `grammar-rules.data.ts` was edited (no contradiction
  found that would have warranted it).
- The resolver (`grammar-mvp-v1`) was not touched and remains inactive.
- Only documentation was changed in this pass: this file and
  `grammar-source-verification.md`. No code, schema, migration, or
  database change was made.
