# Grammar MVP — Human review

**Status: AI documentation recommendation COMPLETE, human documentation
review PARTIAL — 5 of 12 rules reviewed, production publication
decision NOT APPROVED.** This document does not repeat the 12 rule
drafts — see `grammar-mvp-decision-pack.md` for the full text of each
rule (including the content revisions made in response to this round's
human review), and `grammar-source-verification.md` for per-rule source
verification status (all `PARTIALLY_VERIFIED` — see that document for
why none reaches a stronger tier in this environment; **human
documentation review does not change source verification status**).

## This round: first real human documentation decisions recorded

A product owner, reviewing as a learner/user, performed a human
documentation review of the 5 highest-risk rules flagged in the prior
round. **The other 7 rules have not been reviewed by a human and remain
`PENDING HUMAN REVIEW`** — this round's decisions are not extrapolated
to any rule the reviewer did not actually look at.

## Three separate gates (unchanged model, now with real gate-2 values for 5 rules)

| Gate | Who/what decides | Possible values | Current state |
| --- | --- | --- | --- |
| **1. AI documentation recommendation** | This review pass (AI-produced, not a human) | `RECOMMEND APPROVE` / `RECOMMEND REVISE` / `RECOMMEND REJECT` | Set per rule below — unchanged this round |
| **2. Human documentation decision** | An actual human reviewer (product owner, learner perspective) | `PENDING HUMAN REVIEW` / `APPROVE` / `APPROVE AFTER REVISION` / `APPROVE WITH CAVEAT` / `REVISE` / `REJECT` | **5 × `APPROVE`-family decision (2026-07-17), 7 × `PENDING HUMAN REVIEW`** |
| **3. Production publication decision** | Product owner, separate and later than gate 2 | `NOT APPROVED` / `APPROVED` | **`NOT APPROVED` for all 12 — no exceptions, regardless of gates 1 or 2** |

Gate 1 passing does not imply gate 2. **Gate 2 passing does not imply
gate 3** — a human `APPROVE` on documentation is not a seed/publish/
activation authorization; it says the *explanation* is accurate and
learner-ready, nothing about production readiness. All three gates are
tracked independently and none is inferred from another.

## Review metadata — this round's human review

| Field | Value |
| --- | --- |
| Reviewer role | Product owner / learner |
| Review type | Human documentation review |
| Rules reviewed | 5 of 12 (`ARTICLE_THE_SPECIFIC`, `ARTICLE_ZERO_GENERAL`, `PAST_SIMPLE_VS_PRESENT_PERFECT`, `BASIC_PREPOSITION_PATTERNS`, `COUNTABLE_UNCOUNTABLE`) |
| Review date | 2026-07-17 |
| Decisions issued | 5 × `APPROVE`-family (see per-rule table) |
| Production publication decision | `NOT APPROVED` for all 12, including the 5 just reviewed |

No reviewer name, quote, signature, or external approval-system
reference is recorded — none was provided, and none is invented here.

## Per-rule review table

| `ruleCode` | AI recommendation | Human documentation decision | Human review note | Production publication decision |
| --- | --- | --- | --- | --- |
| `ARTICLE_A_AN` | RECOMMEND APPROVE | **PENDING HUMAN REVIEW** | Not reviewed this round | NOT APPROVED |
| `ARTICLE_THE_SPECIFIC` | RECOMMEND APPROVE | **APPROVE** | Reviewer confirmed the draft already states *the* requires a specific/identifiable object — from prior mention, situation, a qualifying phrase, or shared reference — and explicitly does **not** reduce to "mentioned before = always use *the*." No content revision required; approval applies to the existing draft as-is. | NOT APPROVED |
| `ARTICLE_ZERO_GENERAL` | RECOMMEND APPROVE (upgraded from RECOMMEND REVISE once a 2nd source existed) | **APPROVE AFTER REVISION** | Reviewer required the pre-revision draft to be extended before approval: a four-way comparison table (`a report`/`the report`/`reports`/`the reports`), an explicit two-dimension framework (general vs. specific meaning × singular countable / plural countable / uncountable), the required `Employees need training.`/`The employees in our department need training.`/`Information is important.`/`The information in this report is important.` examples, and the constraint that a singular countable noun cannot drop its determiner just because the meaning is general (`Report is important.` incorrect → `A report is important.`/`Reports are important.` correct). "general = no article" now explicitly scoped to plural countable/uncountable only. **Approval applies to this revised version, not the pre-revision draft.** | NOT APPROVED |
| `PRESENT_SIMPLE_THIRD_PERSON` | RECOMMEND APPROVE | **PENDING HUMAN REVIEW** | Not reviewed this round | NOT APPROVED |
| `PAST_SIMPLE_FORM` | RECOMMEND APPROVE | **PENDING HUMAN REVIEW** | Not reviewed this round | NOT APPROVED |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | RECOMMEND APPROVE | **APPROVE AFTER REVISION** | Reviewer required the pre-revision draft to be restructured before approval: Past Simple explained via finished-period/completed-event/narrative-sequence framing (with the no-explicit-date example `I lost my passport during the trip.`); Present Perfect explained via the four situations (current result, life experience, unfinished period, started-in-past-continuing-now); the required `I worked here for five years.`/`I have worked here for five years.` contrast; explicit constraints that missing a date does not automatically mean Present Perfect, that "important result" alone is insufficient, and that finished-time markers (yesterday/last week/in 2024) are strong but not sole classifiers. **Approval applies to this revised version, not the pre-revision draft.** | NOT APPROVED |
| `MODAL_BASE_VERB` | RECOMMEND APPROVE | **PENDING HUMAN REVIEW** | Not reviewed this round | NOT APPROVED |
| `BASIC_PREPOSITION_PATTERNS` | RECOMMEND APPROVE (evidence gap flagged for `good at`/`listen to`) | **APPROVE** | Reviewer confirmed the "learn as a whole unit, not by literal translation" principle and the "no universal formula across verbs/adjectives/prepositions" warning are preserved; required the explicit arrive-in (city/country) vs. arrive-at (specific place) examples (`We arrived in London.` / `She arrived in Kazakhstan.` / `We arrived at the office.` / `He arrived at the airport.`), now added. **Human approval does not resolve the pre-existing `good at`/`listen to` source-evidence gap** — source verification remains `PARTIALLY_VERIFIED`, unchanged by this review. | NOT APPROVED |
| `BASIC_WORD_ORDER` | RECOMMEND APPROVE | **PENDING HUMAN REVIEW** | Not reviewed this round | NOT APPROVED |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | RECOMMEND APPROVE | **PENDING HUMAN REVIEW** | Not reviewed this round | NOT APPROVED |
| `COUNTABLE_UNCOUNTABLE` | RECOMMEND APPROVE (evidence gap flagged for `feedback`) | **APPROVE WITH CAVEAT** | Reviewer required an explicit caveat before approval: these nouns are "usually uncountable in the specific meaning this rule describes," not universally never countable. Required keeping the `some information`/`a piece of information`, `some advice`/`a piece of advice`, `equipment`/`pieces of equipment` examples and the `an information`/`advices`/`equipments` learner-error examples; required explicitly naming contextual countable senses for evidence, research, feedback, software, work, and knowledge (experience included by extension) rather than silently generalizing them away. **Human approval does not resolve the pre-existing `feedback` source-evidence gap** — source verification remains `PARTIALLY_VERIFIED`, unchanged by this review. | NOT APPROVED |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | RECOMMEND APPROVE | **PENDING HUMAN REVIEW** | Not reviewed this round | NOT APPROVED |

**Tally:**
- AI recommendation: 12 × `RECOMMEND APPROVE` (2 with an explicitly flagged follow-up evidence gap: `BASIC_PREPOSITION_PATTERNS`, `COUNTABLE_UNCOUNTABLE`) — unchanged this round.
- **Human documentation decision: 5 × `APPROVE`-family (2 plain `APPROVE`: `ARTICLE_THE_SPECIFIC`, `BASIC_PREPOSITION_PATTERNS`; 2 × `APPROVE AFTER REVISION`: `ARTICLE_ZERO_GENERAL`, `PAST_SIMPLE_VS_PRESENT_PERFECT`; 1 × `APPROVE WITH CAVEAT`: `COUNTABLE_UNCOUNTABLE`), 7 × `PENDING HUMAN REVIEW`** (`ARTICLE_A_AN`, `PRESENT_SIMPLE_THIRD_PERSON`, `PAST_SIMPLE_FORM`, `MODAL_BASE_VERB`, `BASIC_WORD_ORDER`, `DO_DOES_DID_QUESTIONS_NEGATIVES`, `SINGULAR_PLURAL_ARTICLE_AGREEMENT`).
- **Production publication decision: 12 × `NOT APPROVED`, no exceptions** — including all 5 rules just human-approved on documentation.

## The 5 flagged highest-risk rules — now also the 5 human-reviewed rules

These are the same 5 rules flagged "high-risk"/"highest-risk" in
`grammar-mvp-decision-pack.md`, and this round's human review targeted
exactly these 5, in order of risk:

1. **`PAST_SIMPLE_VS_PRESENT_PERFECT`** — the only non-A-level (B1) rule
   in the set. **Human decision: `APPROVE AFTER REVISION`** — required
   restructuring before approval, see table above.
2. **`ARTICLE_THE_SPECIFIC`** — pragmatic/discourse concept, risk of the
   country-name exception list growing without bound. **Human decision:
   `APPROVE`** — no revision required.
3. **`ARTICLE_ZERO_GENERAL`** — was the only rule resting on a single
   source (addressed in the AI-recommendation round); general-vs-specific
   remains pedagogically hard. **Human decision: `APPROVE AFTER
   REVISION`** — required the four-way comparison table and the
   singular-countable constraint before approval, see table above.
4. **`BASIC_PREPOSITION_PATTERNS`** — prepositions are the least
   rule-governed area of English grammar generally; `good at`/`listen to`
   evidence gap remains open. **Human decision: `APPROVE`** — required
   the explicit arrive-in/arrive-at examples, now added; the evidence
   gap itself is a source-verification matter, not resolved by this
   documentation approval.
5. **`COUNTABLE_UNCOUNTABLE`** — register nuance easy to oversimplify;
   `feedback` evidence gap remains open. **Human decision: `APPROVE WITH
   CAVEAT`** — required the contextual-countability caveat, now added;
   the evidence gap itself is a source-verification matter, not
   resolved by this documentation approval.

None of the 5 received `REJECT` or plain `REVISE` — the underlying
grammar content was judged sound by the reviewer, with 3 of the 5
requiring specific, named additions before approval (not a rubber
stamp).

## Blockers — see `decisions.md` for the full 5-category breakdown

Blocking questions are consolidated in `decisions.md` → "Blocking,"
split into: blocks documentation commit (empty), blocks Grammar
implementation, blocks publication/activation, blocks Phrase MVP, blocks
Reading MVP. **This round's 5 human `APPROVE`-family decisions do not
close any implementation or publication blocker** — they only advance
gate 2 (human documentation decision) for those 5 rules; gates covering
resolver code, migration execution, tests, editorial CLI, and
production publication are untouched by this round.

## Production publication gate — explicit statement (unchanged by this round's human review)

**Production publication decision is NOT APPROVED for all 12 rules, no
exceptions — including the 5 rules that just received a human `APPROVE`-
family documentation decision.** A human documentation `APPROVE` answers
"is this explanation accurate and learner-ready," not "is this cleared
to seed/publish/activate for real users." Gate 3 requires, at minimum:

- The `GrammarRuleResolver` actually implemented and unit-tested against
  every worked example in `grammar-resolver-test-cases.md` — none of
  that code exists yet.
- The `MicroCategory`-mapping gap for `MODAL_BASE_VERB` and
  `DO_DOES_DID_QUESTIONS_NEGATIVES` resolved (`decisions.md` → Blocks
  publication/activation).
- A real migration dry-run executed and verified, not just planned
  (`grammar-migration-dry-run-plan.md` — currently plan-only).
- Human documentation decisions actually made for the remaining 7 rules
  (currently `PENDING HUMAN REVIEW`).
- A separate, explicit go/no-go decision from the product owner, made
  after all of the above, not inferred from this document.

This gate is not expected to open as part of this documentation round.
