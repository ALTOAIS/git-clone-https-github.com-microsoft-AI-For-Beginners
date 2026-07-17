# Grammar MVP — Human review

**Status: AI documentation recommendation COMPLETE, human documentation
review COMPLETE — 12 of 12 rules reviewed, human documentation approval
COMPLETE — 12 of 12 approved, production publication decision NOT
APPROVED.** This document does not repeat the 12 rule drafts — see
`grammar-mvp-decision-pack.md` for the full text of each rule (including
every content revision made in response to human review), and
`grammar-source-verification.md` for per-rule source verification status
(all `PARTIALLY_VERIFIED` — see that document for why none reaches a
stronger tier in this environment; **human documentation review does not
change source verification status**).

**Read this status carefully — it is one gate among several, not a
green light:** "human documentation review COMPLETE" means every rule's
*explanation* has been read and approved by a human as accurate and
learner-ready. It does **not** mean: direct source verification is
complete (it stays `PARTIAL`); production publication is approved (it
stays `NOT APPROVED`); implementation is approved; resolver activation is
approved; seeding is approved; or deployment is approved. See "Three
separate gates" below and `decisions.md` → "Blocking" for what each
status does and does not authorize.

## This round: human documentation review completed for all 12 rules

A product owner, reviewing as a learner/user, completed review of the
remaining 7 rules this round (the first 5 highest-risk rules were
reviewed in the prior round and their decisions are unchanged — see
below). The product owner's stated basis for the remaining 7: **"All
remaining rules are OK."** No reviewer name, quote, signature, or
external approval-system reference is recorded — none was provided, and
none is invented here.

## Three separate gates (unchanged model, now with real gate-2 values for all 12 rules)

| Gate | Who/what decides | Possible values | Current state |
| --- | --- | --- | --- |
| **1. AI documentation recommendation** | This review pass (AI-produced, not a human) | `RECOMMEND APPROVE` / `RECOMMEND REVISE` / `RECOMMEND REJECT` | 12 × `RECOMMEND APPROVE` — unchanged this round |
| **2. Human documentation decision** | An actual human reviewer (product owner, learner perspective) | `PENDING HUMAN REVIEW` / `APPROVE` / `APPROVE AFTER REVISION` / `APPROVE WITH CAVEAT` / `REVISE` / `REJECT` | **12 × `APPROVE`-family decision (2026-07-17). 0 × `PENDING HUMAN REVIEW` remaining.** |
| **3. Production publication decision** | Product owner, separate and later than gate 2 | `NOT APPROVED` / `APPROVED` | **`NOT APPROVED` for all 12 — no exceptions, regardless of gates 1 or 2** |

Gate 1 passing does not imply gate 2. **Gate 2 being complete for all 12
rules does not imply gate 3** — a human `APPROVE` on documentation says
the *explanation* is accurate and learner-ready; it says nothing about
production readiness, resolver correctness, or seed authorization. All
three gates are tracked independently and none is inferred from another.

## Review metadata — this round (7 rules) and the prior round (5 rules)

| Field | This round (7 rules) | Prior round (5 rules, unchanged) |
| --- | --- | --- |
| Reviewer role | Product owner / learner | Product owner / learner |
| Review type | Human documentation review | Human documentation review |
| Rules reviewed | `ARTICLE_A_AN`, `PRESENT_SIMPLE_THIRD_PERSON`, `PAST_SIMPLE_FORM`, `MODAL_BASE_VERB`, `BASIC_WORD_ORDER`, `DO_DOES_DID_QUESTIONS_NEGATIVES`, `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | `ARTICLE_THE_SPECIFIC`, `ARTICLE_ZERO_GENERAL`, `PAST_SIMPLE_VS_PRESENT_PERFECT`, `BASIC_PREPOSITION_PATTERNS`, `COUNTABLE_UNCOUNTABLE` |
| Review date | 2026-07-17 | 2026-07-17 |
| Decisions issued | 7 × `APPROVE` | 2 × `APPROVE`, 2 × `APPROVE AFTER REVISION`, 1 × `APPROVE WITH CAVEAT` |
| Production publication decision | `NOT APPROVED` for all 7 | `NOT APPROVED` for all 5 (unchanged) |

No reviewer name, quote, signature, or external approval-system
reference is recorded for either round.

## Per-rule review table (final — 12 of 12)

| `ruleCode` | AI recommendation | Human documentation decision | Human review note | Production publication decision |
| --- | --- | --- | --- | --- |
| `ARTICLE_A_AN` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft covers: one indefinite singular countable noun; a/an choice depends on sound, not letter (`a university`, `an hour`, `an MBA`); cannot be used with plural nouns; cannot be used with the ordinary uncountable meaning; a specific, identifiable object usually requires *the* instead. No content revision required. | NOT APPROVED |
| `ARTICLE_THE_SPECIFIC` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft already states *the* requires a specific/identifiable object — from prior mention, situation, a qualifying phrase, or shared reference — and explicitly does **not** reduce to "mentioned before = always use *the*." No content revision required. | NOT APPROVED |
| `ARTICLE_ZERO_GENERAL` | RECOMMEND APPROVE | **APPROVE AFTER REVISION** | Reviewer required the pre-revision draft to be extended before approval: a four-way comparison table (`a report`/`the report`/`reports`/`the reports`), the two-dimension framework (general vs. specific meaning × singular countable / plural countable / uncountable), and the constraint that a singular countable noun cannot drop its determiner just because the meaning is general. **Approval applies to this revised version, not the pre-revision draft.** | NOT APPROVED |
| `PRESENT_SIMPLE_THIRD_PERSON` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft covers: he/she/it + -s/-es; consonant + y → -ies; do → does; have → has; after `does` the main verb returns to base form (`Does he work?`, not `Does he works?`). No content revision required. | NOT APPROVED |
| `PAST_SIMPLE_FORM` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft covers: regular verbs with -ed; the main spelling patterns; a curated list of frequent irregular verbs; after `did` the base form is used (`Did she complete?`, not `Did she completed?`); confirmed no unsupported quantitative claim about the total number of irregular verbs was reintroduced. No content revision required. | NOT APPROVED |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | RECOMMEND APPROVE | **APPROVE AFTER REVISION** | Reviewer required the pre-revision draft to be restructured before approval: Past Simple explained via completed-past-period/narrative framing; Present Perfect explained via the four situations (present result, life experience, unfinished period, continuing situation); explicit statement that signal words are not a self-sufficient universal classifier. **Approval applies to this revised version, not the pre-revision draft.** | NOT APPROVED |
| `MODAL_BASE_VERB` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft covers: after can/could/may/might/must/should/will/would the base form is used, without `to`, without `-s`, without past-form marking; questions/negatives are built without do/does/did; `have to` is treated separately and may use do/does/did. **Human approval does not resolve the existing `MicroCategory` mapping gap** — that gap continues to block automatic resolver activation, independent of this documentation approval. | NOT APPROVED |
| `BASIC_PREPOSITION_PATTERNS` | RECOMMEND APPROVE (evidence gap flagged for `good at`/`listen to`) | **APPROVE** | Reviewer confirmed the "learn as a whole unit, not by literal translation" principle and the "no universal formula" warning are preserved; required the explicit arrive-in (city/country) vs. arrive-at (specific place) examples, now added. **Human approval does not resolve the pre-existing `good at`/`listen to` source-evidence gap** — source verification remains `PARTIALLY_VERIFIED`. | NOT APPROVED |
| `BASIC_WORD_ORDER` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft covers: basic Subject + Verb + Object order; place/time positioning after the action as a learner guideline, not an absolute rule; correctly-formed fronted adverbials are not an error; questions have a separate word order; confirmed the resolver must not classify by sentence length or by an adverbial appearing at the start of a sentence alone. No content revision required. | NOT APPROVED |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft covers: Present Simple `do/does + subject + base verb`; Past Simple `did + subject + base verb`; no `-s`/past-form marking on the main verb after do-support; negatives `do not`/`does not`/`did not`; do-support not used with ordinary modal verbs; confirmed the diff-specific precedence against `MODAL_BASE_VERB` is unchanged. No content revision required. | NOT APPROVED |
| `COUNTABLE_UNCOUNTABLE` | RECOMMEND APPROVE (evidence gap flagged for `feedback`) | **APPROVE WITH CAVEAT** | Reviewer required an explicit caveat before approval: these nouns are "usually uncountable in the specific meaning this rule describes," not universally never countable; required naming contextual countable senses for evidence, research, feedback, software, work, and knowledge rather than silently generalizing them away. **Human approval does not resolve the pre-existing `feedback` source-evidence gap** — source verification remains `PARTIALLY_VERIFIED`. | NOT APPROVED |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft covers: a/an only with a singular countable noun; a plural countable noun is never used with a/an; determiner and noun number must agree; a bare `-s`/`-es` suffix alone does not prove plurality; the counterexamples news, mathematics, species, analysis, business, class are retained; confirmed a suffix-only signal cannot give the resolver `HIGH` confidence. No content revision required. | NOT APPROVED |

**Tally:**
- AI recommendation: 12 × `RECOMMEND APPROVE` (2 with an explicitly flagged follow-up evidence gap: `BASIC_PREPOSITION_PATTERNS`, `COUNTABLE_UNCOUNTABLE`) — unchanged across both rounds.
- **Human documentation decision: 12 of 12 rules reviewed, 12 of 12 approved (as an `APPROVE`-family decision), 0 `PENDING HUMAN REVIEW` remaining.** Breakdown: 7 × plain `APPROVE` from this round (`ARTICLE_A_AN`, `PRESENT_SIMPLE_THIRD_PERSON`, `PAST_SIMPLE_FORM`, `MODAL_BASE_VERB`, `BASIC_WORD_ORDER`, `DO_DOES_DID_QUESTIONS_NEGATIVES`, `SINGULAR_PLURAL_ARTICLE_AGREEMENT`) + 2 × plain `APPROVE` from the prior round (`ARTICLE_THE_SPECIFIC`, `BASIC_PREPOSITION_PATTERNS`) = 9 × `APPROVE`; 2 × `APPROVE AFTER REVISION` (`ARTICLE_ZERO_GENERAL`, `PAST_SIMPLE_VS_PRESENT_PERFECT`); 1 × `APPROVE WITH CAVEAT` (`COUNTABLE_UNCOUNTABLE`).
- **Production publication decision: 12 × `NOT APPROVED`, no exceptions** — including all 12 rules now human-approved on documentation.

## What "human documentation review COMPLETE" does not mean

Explicitly, to prevent gate-conflation:

- It does **not** mean direct source verification is complete —
  `grammar-source-verification.md` remains `PARTIAL`; all 12 rules stay
  `PARTIALLY_VERIFIED`, and the `good at`/`listen to`
  (`BASIC_PREPOSITION_PATTERNS`) and `feedback`
  (`COUNTABLE_UNCOUNTABLE`) evidence gaps are unresolved by this review.
- It does **not** mean production publication is approved — gate 3 stays
  `NOT APPROVED` for all 12, no exceptions.
- It does **not** mean implementation is approved, resolver code exists,
  or the `MicroCategory` mapping gap for `MODAL_BASE_VERB`/
  `DO_DOES_DID_QUESTIONS_NEGATIVES` is resolved.
- It does **not** mean seeding or activation is approved.
- It does **not** mean deployment is approved.

## The 5 originally-flagged highest-risk rules — decisions unchanged this round

1. **`PAST_SIMPLE_VS_PRESENT_PERFECT`** — **`APPROVE AFTER REVISION`**, unchanged.
2. **`ARTICLE_THE_SPECIFIC`** — **`APPROVE`**, unchanged.
3. **`ARTICLE_ZERO_GENERAL`** — **`APPROVE AFTER REVISION`**, unchanged.
4. **`BASIC_PREPOSITION_PATTERNS`** — **`APPROVE`**, unchanged; `good at`/`listen to` evidence gap still open.
5. **`COUNTABLE_UNCOUNTABLE`** — **`APPROVE WITH CAVEAT`**, unchanged; `feedback` evidence gap still open.

## Blockers by stage (see `decisions.md` for the full breakdown)

### Documentation
**No longer a blocker.** Human documentation review is complete for all
12 rules.

### Source verification
**Remains a blocker before production publication.** Direct source
verification is still `PARTIAL` — no rule has been directly read from
its official page (session egress policy blocks `WebFetch` to external
hosts, see `grammar-source-verification.md`); all 12 rules rest on
search-indexed snippets only.

### Grammar implementation
Still outstanding, untouched by this round's human review:
- final Prisma/additive migration implementation;
- migration dry-run (currently plan-only, `NOT EXECUTED`);
- `GrammarRuleResolver` implementation;
- resolver unit/integration tests;
- editorial CLI;
- observability and rollback validation.

### Publication/activation
Still outstanding, untouched by this round's human review:
- direct authoritative source verification (beyond this session's
  egress-policy limitation);
- final mapping/activation strategy for `MODAL_BASE_VERB` and
  `DO_DOES_DID_QUESTIONS_NEGATIVES`;
- a successful, executed migration dry-run;
- explicit production seed/publish approval.

**Completing human documentation review does not authorize starting any
of the above.**

## Production publication gate — explicit statement (unchanged by this round's human review)

**Production publication decision is NOT APPROVED for all 12 rules, no
exceptions — including all 12 rules now human-approved on
documentation.** Gate 3 requires, at minimum:

- The `GrammarRuleResolver` actually implemented and unit-tested against
  every worked example in `grammar-resolver-test-cases.md` — none of
  that code exists yet.
- The `MicroCategory`-mapping gap for `MODAL_BASE_VERB` and
  `DO_DOES_DID_QUESTIONS_NEGATIVES` resolved (`decisions.md` → Blocks
  publication/activation).
- A real migration dry-run executed and verified, not just planned
  (`grammar-migration-dry-run-plan.md` — currently plan-only).
- A separate, explicit go/no-go decision from the product owner, made
  after all of the above, not inferred from this document.

This gate is not expected to open as part of this documentation round.
