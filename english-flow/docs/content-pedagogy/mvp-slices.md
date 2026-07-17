# Phase 2A — MVP vertical slices

Build order, accepted: **Grammar MVP → Phrase MVP → Reading MVP.** Each
slice must end in a working end-to-end user flow, not just a populated
table (roadmap principle, `english-flow/README.md` → Phase 2 → "принцип
вертикальных срезов").

## Why Grammar first (recap of the accepted reasoning)

| Criterion | Grammar | Phrase | Reading |
| --- | --- | --- | --- |
| Learning value | High — formalizes an *already-confirmed* gap (layered, un-versioned, category-level-only legacy content, see `phase-2a-audit.md`), not just a new feature | High, but incremental | High, but entirely unproven with real users yet |
| Complexity | Low — reuses the `errors` module's SRS/mastery wholesale | Low–medium — needs the `phraseScope` decision first | High — the only slice with no reusable engine at all |
| Migration risk | Low — new table, nullable FK, zero existing rows touched | Medium — touches a live, loaded table (`Phrase`) used in 4+ places | Low — no legacy to migrate, but a new UI from scratch |
| Reuse of existing mechanics | Maximal (SRS, mastery, `contextsPassed`, the classifier) | Maximal for SRS, but needs the scope/governance split first | Minimal — only the language detector and the general Prisma-model pattern |
| Time to production check | Shortest — the "Не понял объяснение" card already exists, only its source changes | Medium | Longest — new screen from zero |

## Grammar MVP

### User story

"When I don't understand my mistake in daily practice, I see a
consistent, verified, source-cited explanation of the specific rule I
broke — not a one-size-fits-all paragraph for a whole wide category, and
not a randomly-picked rule out of several that could apply."

### Scope — the 12 named MVP rules

| # | `ruleCode` | Covers | MVP `microCategories` |
| --- | --- | --- | --- |
| 1 | `ARTICLE_A_AN` | a/an before a singular countable noun | `ARTICLES` |
| 2 | `ARTICLE_THE_SPECIFIC` | *the* for a specific/already-known object | `ARTICLES` |
| 3 | `ARTICLE_ZERO_GENERAL` | no article with plural/uncountable nouns in a general sense | `ARTICLES` |
| 4 | `PRESENT_SIMPLE_THIRD_PERSON` | -s/-es after he/she/it | `THIRD_PERSON_SINGULAR`, `PRESENT_SIMPLE` |
| 5 | `PAST_SIMPLE_FORM` | regular and irregular Past Simple forms | `PAST_SIMPLE` |
| 6 | `PAST_SIMPLE_VS_PRESENT_PERFECT` | completed past time vs. connection to now | `PAST_SIMPLE`, `PRESENT_PERFECT` |
| 7 | `MODAL_BASE_VERB` | modal + base verb, no *to*, no past-tense marking | none of the 12 existing `MicroCategory` values map cleanly here — flagged as an **open question**, see `decisions.md` |
| 8 | `BASIC_PREPOSITION_PATTERNS` | *comply with*, *depend on*, *responsible for* and similar fixed patterns | `PREPOSITIONS` |
| 9 | `BASIC_WORD_ORDER` | subject + verb + object/complement | `WORD_ORDER` |
| 10 | `DO_DOES_DID_QUESTIONS_NEGATIVES` | questions/negatives with do/does/did | none of the 12 existing `MicroCategory` values map cleanly here — same open question as #7 |
| 11 | `COUNTABLE_UNCOUNTABLE` | countable vs. uncountable nouns | `COUNTABLE_VS_UNCOUNTABLE` |
| 12 | `SINGULAR_PLURAL_ARTICLE_AGREEMENT` | no a/an before a plural form; number agreement | `ARTICLES` |

**Open item, not blocking:** rules #7 (`MODAL_BASE_VERB`) and #10
(`DO_DOES_DID_QUESTIONS_NEGATIVES`) do not have an obviously matching
existing `MicroCategory` enum value — the current 12 `MicroCategory`
values were designed around the micro-lesson threshold system, not
around this specific 12-rule list, and modal verbs / do-support are not
represented there today. This needs a decision (extend `MicroCategory`
with two more values, or map these two rules to the nearest existing
category with resolver hints doing the finer distinction) before
Grammar MVP implementation — flagged in `decisions.md` as an open,
non-blocking-for-Phase-2A-documentation-but-blocking-for-implementation
question.

**Out of scope for Grammar MVP:** the remaining ~35–55 rules toward the
eventual 50–70 target (Phase 2 §G); `ExerciseTemplate` as its own table
(JSON field for now, see `domain-model.md`); the compliance-specific
`MicroCategory` values (`COMPLY_VS_COMPLIANCE`, `MAKE_VS_DO`,
`COLLOCATIONS`, `COMPLIANCE_VOCABULARY`) — not in the priority list
above, remain on the legacy fallback path.

### Specification

| Aspect | Detail |
| --- | --- |
| Data model | `GrammarRule` + `GrammarRuleExample` + `ErrorRecord.grammarRuleId` (nullable) — see `domain-model.md` |
| API | `GET /grammar-rules/:ruleCode`, `GET /grammar-rules?microCategory=X&status=PUBLISHED` — read-only; all mutation happens through the CLI, never through this API |
| UI | The existing "Не понял объяснение" card in `ErrorsPage.tsx`/`DailyTaskCard` switches its content source for the 12 covered rules — no new screen |
| Migrations | New tables/columns as above; zero existing rows require backfill (`grammarRuleId` defaults to null everywhere) |
| Seeds | The 12 rules, authored through the CLI/Git-backed workflow (`editorial-workflow.md`) — not a direct SQL/Prisma seed script bypassing review |
| Deterministic logic | `GrammarRuleResolver` (`retrieval-architecture.md`) |
| AI logic | Optional on the first iteration — wording adaptation only, can ship without it and add it within the same slice later |
| Fallback | `context-examples.ts`/`MICRO_LESSON_RULES` for any category the 12 rules don't fully cover |
| Tests | Regression: `errors.service.daily-session.spec.ts` must stay green unmodified; new: one resolver test per rule using representative original/corrected pairs, asserting the *specific* rule is matched, not just the category; a fallback-still-works test for uncovered categories |
| Production smoke test | Trigger a mistake in a covered category during daily practice, confirm the explanation now comes from `GrammarRule`, not the static file |
| Learning metrics | Verified rule usage rate, error recurrence after a specific rule's explanation (`metrics-observability.md`) |
| Rollback | `ARCHIVED` status on the affected `GrammarRule`; `errors.service.ts` falls back to the legacy static chain automatically because the resolver simply stops finding a `PUBLISHED` match — no separate feature flag needed |

## Phrase MVP

### User story

"The phrases I practice come from a single verified library, and the
system distinguishes what I recognize passively from what I can
actually produce."

### Scope

100–150 `Phrase` rows with `phraseScope = CURATED_LIBRARY` and the
extended governance/active-passive fields (see `domain-model.md`).
Content balance target: 40% everyday / 30% professional / 20%
interests-hobbies / 10% literature-culture (unchanged from the original
roadmap target).

### Blocking precondition

Before this slice starts implementation, the `PhraseScope` split
(`domain-model.md`) must exist in the schema, and the migration-plan
guarantee (`migration-plan.md`) that `UserPhrase`
`reviewStage`/`nextReviewAt`/`correctCount`/`incorrectCount` and all
`ReviewAttempt` history are untouched must be verified against a real
migration dry-run before it is applied to any environment with real
user data.

### Specification

| Aspect | Detail |
| --- | --- |
| Data model | Extend `Phrase` (governance fields, `phraseScope`, `ownerUserId`), extend `UserPhrase` (active/passive progress fields) — no new tables |
| API | No signature change to `GET /phrases`/`trainer/tasks` — server-side filtering adds `phraseScope = CURATED_LIBRARY AND contentStatus = PUBLISHED` for library reads, existing personal/manual entries keep working as `phraseScope = PERSONAL` |
| UI | Unchanged — `PhrasesPage.tsx`/`TranslatePage.tsx` continue to work as-is |
| Migrations | Additive columns only, per `migration-plan.md` |
| Seeds | Backfill the 31 existing phrases (`phraseScope = CURATED_LIBRARY`) + 100–150 new, through the same CLI/Git-backed review process as Grammar |
| Deterministic logic | Reuses `trainer.service.ts` exercise generation unchanged |
| AI logic | Unchanged — `evaluateTranslation`/`evaluateReviewAnswer` already work against existing data |
| Fallback | Already exists, unchanged |
| Tests | Regression: `trainer.service.spec.ts`, `reviews.service.spec.ts` must stay green with the extended schema |
| Production smoke test | Run the translation trainer and the review queue for an existing user; confirm SRS progress carries over exactly |
| Learning metrics | Active phrase recall (new — requires the active/passive fields), vocabulary recall accuracy (already exists) |
| Rollback | New fields are nullable; rollback means ignoring them on read, no data loss |
| Explicitly deferred within this slice | Automatic detection of a target phrase's use in free speech ("speaking usage tracking") — allowed to be a later iteration inside this same slice, not a blocker for the first Phrase MVP release |

## Reading MVP

### User story

"I can read a text where I already know roughly 95% of the words, answer
comprehension questions, and save new phrases straight into my review
queue — the whole path, not just an API."

### Scope

10–15 `ReadingContent` rows.

### Blocking precondition

The lexical-coverage algorithm design task (`domain-model.md` —
"intentionally left as an open design question") must be resolved
**before implementation of this slice starts**. It explicitly does
**not** block Grammar MVP or Phrase MVP — the three slices are
sequential in priority, not gated on each other's open questions except
where a genuine data dependency exists (none does, between Grammar/
Phrase and this precondition).

### Specification

| Aspect | Detail |
| --- | --- |
| Data model | New `ReadingContent` + new `UserReadingProgress` — the only slice needing genuinely new tables end to end |
| API | `GET /reading?userId=` (server computes per-user coverage), `GET /reading/:id`, `POST /reading/:id/complete` (saves chosen phrases into SRS) |
| UI | **New screen** — Reading does not extend an existing page, unlike Grammar and Phrase |
| Migrations | New tables |
| Seeds | 10–15 texts, original AI-assisted or public-domain/CC only, through the CLI/Git-backed review process — `source`/`license` mandatory with zero tolerance (`editorial-workflow.md`) |
| Deterministic logic | Candidate selection + the (separately designed) coverage algorithm |
| AI logic | Only at authoring time — comprehension/discussion question generation, human-reviewed before publish; never at read time |
| Fallback | Honest "no matching text yet" message when no candidate clears the coverage threshold |
| Tests | New — coverage-algorithm unit tests, an end-to-end flow test (open text → answer questions → save phrase → confirm it appears in the review queue) |
| Production smoke test | Full flow, one real text, one real user |
| Learning metrics | Reading comprehension pass rate, predicted coverage vs. reported difficulty — both new, this slice is what produces the first data points |
| Rollback | `ARCHIVED` status; the screen shows its existing empty-candidate state, no separate rollback path needed |

## Expansion (§G) — explicitly not part of any MVP slice

Growing Grammar past 12 rules toward 50–70, Phrase past 100–150 toward
600–1000, or Reading past 10–15 toward 60–100 requires production
validation of **all three** mandatory MVP slices plus the minimal
editorial/quality pipeline actually operating on real content — not
validation of just one slice. This is unchanged from the roadmap's
Phase 2 §G condition and is not re-litigated here.
