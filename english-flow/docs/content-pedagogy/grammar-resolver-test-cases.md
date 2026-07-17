# Grammar MVP — Resolver test cases

Covers `GrammarRuleResolver` per-rule deterministic signals, **diff-specific
precedence** (corrected — not one single global ordering), conflict examples,
the HIGH/MEDIUM/LOW confidence rule, and fallback behaviour. Read together
with `retrieval-architecture.md` (overall pipeline) and
`phase-2a-audit.md` → "`micro-category.classifier.ts` — precise coverage"
(the existing deterministic classifier this resolver builds on).

## The morphology-safety rule (applies to every signal below)

**No `HIGH` confidence from a single weak signal.** Specifically prohibited
as a sole basis for `HIGH`:

- a word merely ending in `-s`/`-es` (confirmed unsafe: `business`, `class`,
  `analysis`, `news`, `series`, `species` end in `-s`/are irregular without
  being plural for agreement purposes — `grammar-source-verification.md` #12);
- the presence of one signal word alone (e.g. one time expression);
- sentence length;
- landing in the generic `COLLOCATIONS` fallback bucket (the existing
  classifier's residual catch-all, not a positive signal for anything).

`HIGH` confidence requires a **structural diff**: a modal verb retained
alongside a changed following-verb form; `do`/`does`/`did` retained
alongside a changed main-verb form; an explicit article insertion/removal
combined with a reliable number signal (not suffix alone); a known-
uncountable noun from the reviewed lexicon; an exact curated preposition
pattern; the same token set in a changed order. Anything short of that is
capped at `MEDIUM` or `LOW`, with fallback to the existing legacy static
text (`context-examples.ts`/`ai/fallbacks.ts`, see `phase-2a-audit.md`).

## Per-rule signal table

| `ruleCode` | Candidate `MicroCategory` | `ErrorType` | Positive signals (structural) | Negative signals | Expected confidence | Fallback |
| --- | --- | --- | --- | --- | --- | --- |
| `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | `ARTICLES` | `ARTICLE` | a/an added or removed **and** the adjacent noun has a **reliable** plural signal: explicit plural marker in `sourceContext`/known plural lemma list, or the noun is unchanged across original/corrected and independently confirmed plural elsewhere in the same sentence — **not** suffix alone | noun is on the known singular-despite-`-s` list (news, mathematics, physics, economics, gymnastics, aerobics, measles, mumps) or the same-form list (series, species) | `HIGH` only with a reliable non-suffix signal; `MEDIUM` with suffix-only signal; `LOW`/fallback if the noun matches the singular-despite-`-s`/same-form lists | legacy static text for `ARTICLES` |
| `ARTICLE_A_AN` | `ARTICLES` | `ARTICLE` | a/an added or changed (not `the`) **and** `SINGULAR_PLURAL_ARTICLE_AGREEMENT` did not already claim the case | noun plural-marked | `HIGH` | legacy static text |
| `ARTICLE_THE_SPECIFIC` | `ARTICLES` | `ARTICLE` | `the` added, replacing `a`/`an` or a gap | `the` removed (→ `ARTICLE_ZERO_GENERAL`) | `HIGH` | legacy static text |
| `ARTICLE_ZERO_GENERAL` | `ARTICLES` | `ARTICLE` | article removed entirely (not replaced) **and** noun is plural or on the known-uncountable list (`information`, `advice`, `evidence`, `research`, `equipment`, `knowledge`, `feedback`, `furniture`, `software`, `news`, `progress` — the classifier's existing `UNCOUNTABLE_HINTS` list) | article added (→ other ARTICLES rules) | `HIGH` on uncountable-list match; `MEDIUM` on plural-only match (same suffix caveat as above) | legacy static text |
| `PRESENT_SIMPLE_THIRD_PERSON` | `THIRD_PERSON_SINGULAR`, `PRESENT_SIMPLE`, or `null` (existing classifier gap — see `phase-2a-audit.md`) | `VERB_FORM` | he/she/it (or a singular-noun subject) **and** one of: exact `+s` positional match (classifier's own signal), `do → does`, `have → has`, consonant+y → `-ies` | a modal verb sits directly before the changed word (→ `MODAL_BASE_VERB` takes precedence — see "Diff-specific precedence" below) | `HIGH` (exact `-s` match or `do→does`/`have→has`); `MEDIUM` (`-ies` pattern — less common, harder to confirm deterministically without a verb lexicon) | legacy static text |
| `PAST_SIMPLE_FORM` | `PAST_SIMPLE` | `VERB_TENSE`, `VERB_FORM` | `-ed` added/removed, or a verb from the reviewed common-irregular list (go/see/have/do/be/take/make/come/get and their past forms) | `do`/`does`/`did` present alongside the change (→ rule below takes precedence); `have`/`has` added (→ `PAST_SIMPLE_VS_PRESENT_PERFECT`) | `HIGH` (known irregular); `MEDIUM` (regular `-ed` pattern only) | legacy static text |
| `PAST_SIMPLE_VS_PRESENT_PERFECT` | `PRESENT_PERFECT` (direct classifier signal) or `PAST_SIMPLE` (compensating heuristic — classifier does not catch the reverse direction, see `phase-2a-audit.md`) | `VERB_TENSE` | `have`/`has` added (direct classifier signal, `HIGH`); **or** a finished-time expression (`yesterday`, `last year`, `in [year]`, `[time] ago`) appears in the sentence alongside any verb-tense change (compensating heuristic, `MEDIUM`) | — | `HIGH` (have/has added); `MEDIUM` (finished-time-marker heuristic only) | legacy static text |
| `MODAL_BASE_VERB` | none — independent of `microCategory` (confirmed classifier gap) | `VERB_FORM` | a modal (`can`/`could`/`must`/`should`/`may`/`might`/`would`/`shall`) is present in **both** original and corrected (i.e. the modal itself is not what changed) **and** the following verb changed by: `to` removed, `-s` removed, or a past-tense form replaced by the base form | the modal itself was added/removed (→ different case, likely not a grammar-form error at all) or `do`/`does`/`did` was also removed in the same diff (→ see "unnecessary do-support" case below) | `HIGH` on an exact `modal + to`/`modal + verb-s`/`modal + past-form` pattern; `LOW`/fallback otherwise | no legacy source — honest fallback message, not a fabricated static text (see `phase-2a-audit.md`, this rule has zero legacy coverage) |
| `BASIC_PREPOSITION_PATTERNS` | `PREPOSITIONS` | `PREPOSITION` | preposition changed **and** the verb/adjective+preposition pair matches the curated MVP list (`comply with`, `depend on`, `responsible for`, `interested in`, `good at`, `listen to`, `arrive at`/`arrive in`) | pair not in the curated list | `HIGH` (in list); `LOW`/fallback (not in list — this rule does not claim to cover all prepositions, see `grammar-mvp-decision-pack.md`) | legacy static text (`PREPOSITIONS` category) |
| `BASIC_WORD_ORDER` | `WORD_ORDER` | `WORD_ORDER` | same token multiset, different order (classifier's own signal) **and** a frequency adverb (`always`/`usually`/`often`/`never`/`sometimes`) is among the reordered tokens | — | `HIGH` (frequency adverb involved); `MEDIUM` (general S-V-O reorder, no frequency adverb) | legacy static text |
| `DO_DOES_DID_QUESTIONS_NEGATIVES` | none — independent of `microCategory` (confirmed classifier gap) | `VERB_FORM`, `VERB_TENSE` | `did`/`does`/`doesn't`/`didn't` present in both original and corrected, **and** the main verb also carries `-ed`/`-s` in the *original* (double-marking — removed in corrected) | — | `HIGH` on the double-marking pattern | no legacy source — honest fallback |
| `COUNTABLE_UNCOUNTABLE` | `COUNTABLE_VS_UNCOUNTABLE` | `VOCABULARY` | a noun from the classifier's own `UNCOUNTABLE_HINTS` list appears pluralized in the original, or a `many/much/few/less` swap is detected (classifier's own signal) | — | `HIGH` (this is the one rule where the existing classifier branch is already specific enough on its own) | legacy static text |

## Diff-specific precedence — corrected (not one global ordering)

An earlier draft proposed a single global precedence,
`DO_DOES_DID_QUESTIONS_NEGATIVES → MODAL_BASE_VERB`, applied uniformly to
every case. **This is corrected.** The right rule depends on *which token
was actually changed* in the diff, not a fixed ranking of rule codes:

### Case A — Modal-form error (modal retained, following verb malformed)

If the modal verb is present, unchanged, in both `original` and
`corrected`, and the change is confined to the verb immediately after
it (dropped `to`, dropped `-s`, or a past-tense form replaced by base
form) → **primary: `MODAL_BASE_VERB`.**

| original | corrected | expected `ruleCode` | why not the other rule |
| --- | --- | --- | --- |
| `She can works from home.` | `She can work from home.` | `MODAL_BASE_VERB` | `can` unchanged in both; only the verb form after it changed — no `do`/`does`/`did` involved at all |
| `The company must to comply with this regulation.` | `The company must comply with this regulation.` | `MODAL_BASE_VERB` | `must` unchanged; `to` removed from the following verb |
| `We should reported the incident immediately.` | `We should report the incident immediately.` | `MODAL_BASE_VERB` | `should` unchanged; past-tense form replaced by base form |

### Case B — Unnecessary do-support before a retained modal

If `corrected` removes `do`/`does`/`did` while a modal verb is present
in both original and corrected → **primary:
`DO_DOES_DID_QUESTIONS_NEGATIVES`** (the error is the presence of
do-support itself, which is incompatible with modals), **secondary
candidate logged: `MODAL_BASE_VERB`** (since a modal is involved, it is
recorded as a related rule for observability, but does not win primary —
the mistake is "used do-support with a modal," not "malformed the verb
after the modal," and precise `resolverReason` text should say so
explicitly, e.g. `"do-support incompatible with retained modal verb"`).

| original | corrected | expected `ruleCode` | why not the other rule |
| --- | --- | --- | --- |
| `Does she can work from home?` | `Can she work from home?` | `DO_DOES_DID_QUESTIONS_NEGATIVES` (primary), `MODAL_BASE_VERB` (secondary, logged) | the change removes `does` entirely, not the form of `work` — the verb form itself (`work`) is already correct in both |
| `Did we must submit the report?` | `Must we submit the report?` | `DO_DOES_DID_QUESTIONS_NEGATIVES` (primary), `MODAL_BASE_VERB` (secondary, logged) | same pattern — `did` removed, modal retained and correctly followed by base form throughout |

### Case C — Double-marking after do/does/did (no modal involved)

If `did`/`does`/`doesn't`/`didn't` is present in both original and
corrected, and the main verb loses a redundant `-ed`/`-s` — with **no
modal verb anywhere in the sentence** → **primary:
`DO_DOES_DID_QUESTIONS_NEGATIVES`.**

| original | corrected | expected `ruleCode` | why not the other rule |
| --- | --- | --- | --- |
| `Did you went to the meeting?` | `Did you go to the meeting?` | `DO_DOES_DID_QUESTIONS_NEGATIVES` | no modal verb present at all; `did` retained, `went`→`go` double-marking removed |
| `She doesn't works on Fridays.` | `She doesn't work on Fridays.` | `DO_DOES_DID_QUESTIONS_NEGATIVES` | no modal; `doesn't` retained, redundant `-s` removed |

### Case D — No reliable distinction

If the diff does not clearly match any of the above structural patterns
(e.g. both a modal *and* do-support changed simultaneously in a way that
does not cleanly fit Case A/B/C, or the change is otherwise ambiguous
between two rule codes with no tie-breaking signal) →
**`resolvedRuleCode = null`, `ambiguous = true`, confidence `LOW`,
`fallbackUsed = true`.** The resolver never guesses between two
equally-supported candidates.

## Other conflicts (non do/modal), with examples

| Conflict | Examples (original → corrected → expected `ruleCode` → why not the other) |
| --- | --- |
| `ARTICLE_A_AN` vs. `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | 1. `She is compliance officer.` → `She is a compliance officer.` → `ARTICLE_A_AN` (officer is singular, no reliable plural signal). 2. `We received a documents from the regulator.` → `We received documents from the regulator.` → `SINGULAR_PLURAL_ARTICLE_AGREEMENT` (documents carries a reliable plural signal — the noun is explicitly plural in both original and corrected, not inferred from suffix alone on an ambiguous case). 3. `He needs a hour.` → `He needs an hour.` → `ARTICLE_A_AN` (singular, only a/an sound choice, not a number question). |
| `ARTICLE_THE_SPECIFIC` vs. `ARTICLE_ZERO_GENERAL` | 1. `I read report. Report was long.` → `I read a report. The report was long.` → `ARTICLE_THE_SPECIFIC` (the added, second mention). 2. `The compliance is important.` → `Compliance is important.` → `ARTICLE_ZERO_GENERAL` (the removed, general statement, "compliance" is on the uncountable list). 3. `We need a report.` → `We need the report.` → `ARTICLE_THE_SPECIFIC` (the replaces a — direction is "the added/strengthened"). |
| `PAST_SIMPLE_FORM` vs. `PAST_SIMPLE_VS_PRESENT_PERFECT` | 1. `We submit the report last week.` → `We submitted the report last week.` → `PAST_SIMPLE_FORM` (no have/has, no finished-time-marker conflict signal beyond the plain past form itself). 2. `I have seen this policy yesterday.` → `I saw this policy yesterday.` → `PAST_SIMPLE_VS_PRESENT_PERFECT` (finished-time marker "yesterday" + have removed — compensating heuristic). 3. `We work here since 2020.` → `We have worked here since 2020.` → `PAST_SIMPLE_VS_PRESENT_PERFECT` (have added — direct classifier signal). |
| `PRESENT_SIMPLE_THIRD_PERSON` vs. `BASIC_WORD_ORDER` | 1. `He work in compliance.` → `He works in compliance.` → `PRESENT_SIMPLE_THIRD_PERSON` (only verb form changed). 2. `Always she checks documents.` → `She always checks documents.` → `BASIC_WORD_ORDER` (only order changed, verb form untouched). 3. `Always she work.` → `She always works.` (hypothetical combined case) → `PRESENT_SIMPLE_THIRD_PERSON` primary (verb-form correctness prioritized for traceability), `BASIC_WORD_ORDER` logged as secondary candidate — an instance of the general "no reliable single distinction" pattern (Case D) resolved conservatively by picking the more specific structural signal, not a guess. |
| `COUNTABLE_UNCOUNTABLE` vs. `ARTICLE_A_AN` | 1. `Please give me an advice.` → `Please give me some advice.` → `COUNTABLE_UNCOUNTABLE` (advice is on the reviewed uncountable list — checked *before* `ARTICLE_A_AN`). 2. `We need much evidences.` → `We need a lot of evidence.` → `COUNTABLE_UNCOUNTABLE` (evidence on the list; also demonstrates the corrected natural-affirmative wording, see `grammar-source-verification.md` #11). |
| `BASIC_PREPOSITION_PATTERNS` vs. generic vocabulary/collocation | 1. `The company must comply to the regulation.` → `...comply with...` → `BASIC_PREPOSITION_PATTERNS` (comply is in the curated list). 2. `This depends at the outcome.` → `...depends on...` → `BASIC_PREPOSITION_PATTERNS` (depend is in the curated list). 3. A preposition-adjacent error on a pair *not* in the curated 7-pattern list → stays on the existing `COLLOCATIONS`/`PREPOSITIONS` legacy fallback, `LOW` confidence, not force-fit into this rule. |

## Fallback behaviour, summarized

| Confidence | Resolver action |
| --- | --- |
| `HIGH` | `resolvedRuleCode` set, `fallbackUsed = false` |
| `MEDIUM` | `resolvedRuleCode` set, `fallbackUsed = false`, but logged distinctly from `HIGH` for later review of whether the heuristic needs tightening |
| `LOW` | `resolvedRuleCode = null`, `fallbackUsed = true`, legacy static text used, `candidateRuleCodes[]` still logged for observability |
| `ambiguous = true` (Case D) | Same as `LOW` — never resolved by arbitrary tie-breaking |
