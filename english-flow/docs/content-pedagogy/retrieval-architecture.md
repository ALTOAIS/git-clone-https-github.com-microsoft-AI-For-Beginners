# Phase 2A — Retrieval architecture

Covers the three MVP retrieval flows and the corrected `GrammarRuleResolver`
design. No embeddings, no vector database, no full-text search — accepted
decision, see `decisions.md`. AI never selects verified content on its
own; it only adapts wording around content a deterministic stage already
selected, and every source ID it returns is validated server-side against
what actually exists and is `PUBLISHED`.

## GrammarRuleResolver

### Why the naive lookup was rejected

An earlier draft of this design proposed
`SELECT * FROM GrammarRule WHERE microCategory = ? LIMIT 1`. This is
wrong: `MicroCategory` is a wide bucket. The `ARTICLES` category alone
must resolve to at least four distinct MVP rules — `ARTICLE_A_AN`,
`ARTICLE_THE_SPECIFIC`, `ARTICLE_ZERO_GENERAL`,
`SINGULAR_PLURAL_ARTICLE_AGREEMENT` (full list in `mvp-slices.md`). An
unconditioned `LIMIT 1` returns whichever row the database happens to
order first — sometimes the wrong rule for the actual mistake the
learner made.

### Resolution pipeline

```
ErrorRecord.originalText / correctedText
        │
        ▼
[1] microCategory classification — ALREADY EXISTS, unchanged
    (errors/micro-category.classifier.ts — deterministic regex/heuristic
    diff over original vs. corrected; no schema or logic change needed
    here, this stage is reused as-is)
        │
        ▼
[2] candidate GrammarRule set
    SELECT * FROM GrammarRule
    WHERE microCategories CONTAINS <the classified category>
      AND contentStatus = 'PUBLISHED'
    ORDER BY <deterministic priority, see below>
        │
        ▼
[3] resolverHints evaluation (new — this is the fix)
    For each candidate rule, in priority order, evaluate its
    `resolverHints` (small ordered list of {conditionType, pattern,
    priority} stored as validated JSON on GrammarRule — see
    domain-model.md) against the actual originalText/correctedText/diff
    of this specific ErrorRecord. Condition types are structural, not
    single weak signals — see `grammar-resolver-test-cases.md` for the
    full per-rule signal table and worked conflict examples. A word
    merely ending in `-s`/`-es` is **not** by itself a reliable plural
    signal (`business`, `class`, `news`, `series`, `species` end in -s
    without being plural — see `grammar-resolver-test-cases.md`), so
    hints that depend on number must combine the suffix with additional
    context or accept reduced (`MEDIUM`/`LOW`) confidence. No LLM
    involved in this stage.
    First rule whose hint(s) match wins, in the diff-specific precedence
    order defined per rule in `grammar-resolver-test-cases.md` (not one
    single global ordering — see `decisions.md`).
        │
        ├── match found ──────────────► ErrorRecord.grammarRuleId = rule.id
        │
        └── no candidate matches ─────► ErrorRecord.grammarRuleId stays
                                          null; fall through to the
                                          category-level legacy fallback
                                          chain (context-examples.ts /
                                          MICRO_LESSON_RULES), exactly as
                                          today — never a random row from
                                          step [2]
```

`Deterministic priority` in step [2] means an explicit, stable ordering
(e.g. `resolverHints` with the narrowest/most specific condition sort
first, a designated "general" rule for the category — if one is marked
as such — sorts last as the catch-all within step [3]). It is never
"whatever order the database happens to return," which is the actual
problem with an unconditioned `LIMIT 1`, not the `LIMIT 1` syntax itself.

### Fallback chain (unchanged from the accepted Phase 2A recommendation)

1. A specific `GrammarRule` matched by the resolver → its
   `shortExplanationRu`/`explanationRu`.
2. No specific match, but the category is one of the 12 MVP categories →
   the existing layered legacy static text (`context-examples.ts`'s
   `CATEGORY_SIMPLIFIED_RULE`/`CATEGORY_RULE_DETAILS`, the latter being
   the same object as `ai/fallbacks.ts`'s `MICRO_LESSON_RULES` — see
   `phase-2a-audit.md`), unchanged, exactly as it works today.
3. Category outside MVP scope entirely → unchanged legacy behavior, no
   difference from what exists in production today.

At no point does a user see "no explanation" — the fallback chain is
designed so every existing path keeps working exactly as it does now;
Grammar MVP only *adds* a better path on top for the 12 covered
categories.

## Deterministic vs. AI boundary — applies to all three flows

| Stage | Deterministic | AI |
| --- | --- | --- |
| Selecting *which* content is relevant/correct | Always | Never |
| Validating any content ID the AI returns actually exists and is `PUBLISHED` | Always (server-side) | — |
| Adapting wording/register/difficulty of already-selected content | — | Optional, only after deterministic selection |
| Evaluating a learner's free-text answer | — | Same as today (`evaluateTranslation`/`evaluateSentence`/`evaluateReviewAnswer` — unchanged) |
| Generating comprehension/discussion questions at content-authoring time (not at read time) | — | Optional, human-reviewed before `PUBLISHED` |

## Flow 1 — Grammar

| Aspect | Design |
| --- | --- |
| Input | `ErrorRecord.id`, `originalText`, `correctedText`, `userId` (for personalizing wording only) |
| Deterministic stage | Steps [1]–[3] of `GrammarRuleResolver` above |
| AI stage | Optional, first iteration can ship without it: adapt `explanationRu` wording to the learner's level/history. Never invents the rule. |
| Validation | Any `ruleCode`/id the AI references in its response must exist and be `PUBLISHED`, checked server-side before use |
| Caching | `GrammarRule` rows for 10–15 MVP rules can be held in-process memory; trivial size, invalidate on any CLI publish/archive |
| Fallback | See fallback chain above |
| Source ID handling | `GrammarRule.ruleCode` is shown to the user as a "verified rule" indicator when matched |
| Latency risk | One extra SQL query plus in-process resolver evaluation before any optional LLM call; negligible at MVP scale |
| Logging/observability | Log `{ errorRecordId, microCategory, matchedRuleCode|null, fallbackUsed: bool }` on every resolution — this is the direct source of the "verified rule usage rate" and "fallback-to-static-rule rate" metrics (`metrics-observability.md`) |
| Privacy | No new personal data beyond what `ErrorRecord` already stores |
| Test strategy | Unit tests per MVP rule with representative original/corrected pairs asserting the resolver picks the *specific* intended rule, not just "some rule in the category"; a regression test asserting `context-examples.ts`/`MICRO_LESSON_RULES` fallback still fires for uncovered categories |

## Flow 2 — Phrase

| Aspect | Design |
| --- | --- |
| Input | `userId`, `SkillProfile.vocabulary` (CEFR), optionally current lesson `topic` |
| Deterministic stage | `SELECT * FROM Phrase WHERE phraseScope = 'CURATED_LIBRARY' AND contentStatus = 'PUBLISHED' AND cefrLevel <= userLevel AND category IN (...)` — same filtering shape `trainer.service.ts` already applies for the professional-category filter today |
| AI stage | Unchanged from today — only in evaluating the learner's free-text answer (`evaluateTranslation`/`evaluateReviewAnswer`), never in choosing which phrase to present |
| Validation | Not applicable — AI does not select the phrase |
| Caching | Not needed at 100–150 rows |
| Fallback | Already exists — `evaluateTranslationFallback`/`evaluateReviewAnswerFallback` (token comparison) |
| Source ID handling | N/A — the phrase is already identified by its own id |
| Latency risk | Minimal — pure SQL selection, no LLM in the selection path |
| Logging/observability | Log fill-rate: fraction of generated exercises drawn from `phraseScope = CURATED_LIBRARY, contentStatus = PUBLISHED` rows vs. legacy/unscoped rows |
| Privacy | Unchanged |
| Test strategy | Extend the existing `trainer.service.spec.ts` with `phraseScope`/`contentStatus` filters |

## Flow 3 — Reading

| Aspect | Design |
| --- | --- |
| Input | `userId`, `SkillProfile.reading`, the (not-yet-finalized, see `domain-model.md`) known-vocabulary signal, `User.preferredTopics` |
| Deterministic stage | Candidate selection by CEFR/topic **and** the per-user lexical-coverage calculation against `ReadingContent.tokenizedVocabularyProfile` — both stages are pure computation, no AI |
| AI stage | Only at content-authoring time (generating comprehension/discussion questions when a `ReadingContent` row is drafted), never when a learner opens a text |
| Validation | Not applicable at read time |
| Caching | `tokenizedVocabularyProfile` is computed once when the content is authored/reviewed, not per read request |
| Fallback | If no candidate clears the coverage threshold, show an honest "no matching text at your level yet" message — never fabricate a text |
| Source ID handling | `ReadingContent.source`/`license` always shown to the user |
| Latency risk | Set-intersection over a learner's known-vocabulary signal against 10–15 texts is computationally trivial, no LLM in the hot path |
| Logging/observability | Log predicted coverage vs. a post-reading learner self-report of perceived difficulty — direct source of the "lexical coverage vs. reported difficulty" metric |
| Privacy | Uses the learner's already-collected profile; no new data category |
| Test strategy | Unit tests for the coverage algorithm against a fixture vocabulary set and fixture texts — algorithm itself is a dedicated pre-Reading-MVP design task, see `domain-model.md` |

## Why no embeddings / vector database / full-text search

Explicitly rejected for MVP scale (10–15 / 100–150 / 10–15 rows across
the three slices): none of the three flows above requires fuzzy semantic
matching — Grammar resolution is rule-based diff matching, Phrase
selection is exact CEFR/category filtering, Reading candidate selection
is exact CEFR/topic filtering plus a deterministic set-intersection.
Introducing `pgvector` or a dedicated vector store would add
infrastructure (extension availability on the current free-tier
Postgres provider is not even confirmed), latency, and cost with no
retrieval quality the deterministic approach doesn't already provide at
this scale. Revisit only if Phase 2 §G expansion volume (50–70 / 600–1000
/ 60–100) demonstrates that exact filtering stops being sufficient — not
assumed now.
