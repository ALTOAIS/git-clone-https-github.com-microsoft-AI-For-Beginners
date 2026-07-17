# Phase 2A — Editorial workflow

## Lifecycle

Accepted enum, shared across `GrammarRule`, `ReadingContent`, and
`Phrase` rows where `phraseScope = CURATED_LIBRARY` (see
`domain-model.md`):

```
DRAFT ──► REVIEWED ──► PUBLISHED ──► ARCHIVED
  ▲                                     │
  └─────────────── (new draft) ◄────────┘
```

Rules:

- **AI can create only `DRAFT`.** An AI-assisted draft is marked as such
  in `sourceRefs` (e.g. `"AI draft, edited by <reviewedBy>"`); this never
  changes what status it can reach without human action.
- **Automated validation never advances status by itself.** It can only
  block a transition (see "Validation rules" below) — passing validation
  is necessary, never sufficient, for `DRAFT → REVIEWED`.
- **`REVIEWED` requires `reviewedBy` and `reviewedAt` set in the same CLI
  operation.** Both fields empty is definitionally `DRAFT`; there is no
  partially-reviewed state.
- **`PUBLISHED` is reachable only from `REVIEWED`**, never directly from
  `DRAFT`. This is a second explicit human action, not an automatic
  consequence of review — a reviewer can approve content for correctness
  today and choose to publish it next week.
- **The normal user-facing API returns only `PUBLISHED` rows.** Nothing
  in `DRAFT` or `REVIEWED` state is ever served through
  `GET /grammar-rules`, `GET /phrases`, `GET /reading`, etc. A separate
  preview path (CLI-only on MVP, see below) is how a reviewer inspects a
  draft before approving it.
- **`ARCHIVED` is reachable from any state** and never deletes the row —
  see "Archive and rollback" below.
- **`PUBLISHED` content is never edited directly in the production
  database.** Any content change to a `PUBLISHED` row happens through the
  CLI, which creates a new reviewed revision and only then re-publishes
  — see "Git-backed versioning."

## CLI-only workflow for MVP

Accepted: safe CLI/scripts, no admin UI, no RBAC. Rationale (unchanged
from the original Phase 2A report, reaffirmed here): no editor-role or
access-control system exists in English Flow today; building one is
explicitly out of MVP scope; at the realistic reviewer count for this
phase (effectively one person), a UI would spend implementation effort
on a problem that doesn't yet exist.

Minimal command surface (names illustrative, not a commitment to exact
CLI syntax — that's an implementation detail for the Grammar MVP build,
not Phase 2A):

- `content:create-draft` — creates a `DRAFT` row from a structured
  input file (see "Git-backed versioning" below for where that file
  lives).
- `content:validate` — runs the deterministic validation rules (below)
  against one or all `DRAFT`/`REVIEWED` rows, without changing status;
  used before asking a human to review.
- `content:review --approve` / `content:review --reject` — the only
  command that can set `reviewedBy`/`reviewedAt` and move `DRAFT →
  REVIEWED`; rejection leaves the row in `DRAFT` with `reviewNotes`
  explaining what to fix.
- `content:publish` — the only command that can move `REVIEWED →
  PUBLISHED`.
- `content:archive` — moves any status to `ARCHIVED`; see rollback below
  for how this interacts with re-publishing a previous revision.
- `content:preview` — read-only, shows what a `DRAFT`/`REVIEWED` row
  would look like in the product UI, without exposing it through the
  real user-facing API.

## Validation rules

### GrammarRule

**Block publication (`DRAFT → REVIEWED` and `REVIEWED → PUBLISHED`
both refuse without these):**
`ruleCode` unique and non-empty; `cefrLevel` a valid enum value;
`titleRu`/`titleEn` non-empty; **both** `shortExplanationRu` and
`explanationRu` non-empty (this is new relative to the legacy sources,
neither of which distinguishes the two lengths — see "Canonical grammar
explanations" below); `pattern` non-empty; at least one `incorrect_correct`
`GrammarRuleExample`; at least one `microCategories` entry that is a
valid existing `MicroCategory` value (typo protection); `sourceRefs`
non-empty (must cite at least the legacy source(s) it was derived from,
or "written from scratch" plus a rationale).

**Warning only, does not block:** missing `professional`/`literary`
example (not every rule needs one); missing `signalWords`/
`prerequisites`.

**Requires human review, cannot be automated:** whether the grammar
explanation is actually correct and pedagogically sound. No automated
check can verify this.

### Phrase (`phraseScope = CURATED_LIBRARY` rows only — see `domain-model.md`)

**Block publication:** normalized uniqueness on `(englishText, sense)`
(not `englishText` alone — the same phrase can have more than one
sense); `phrase`/`translation` non-empty; `cefrLevel` set; `source`
(legacy `PhraseSource` value) and `version` set.

**Warning only:** missing `partOfSpeech` (not always applicable to
multi-word chunks); missing `collocations`.

**Requires human review:** near-duplicate detection in borderline cases
(e.g. "I agree with you" vs. "I agree with that") — the detection
signal itself (edit distance / shared n-grams) is deterministic and
automatable; the *decision* of whether a flagged pair is actually a
duplicate is not.

### ReadingContent

**Block publication, no exceptions, no warning tier:** `source` and
`license` — the only two fields in this entire document with zero
tolerance; a missing value here is a hard publish-blocker, not a
reviewer note, matching the pre-existing roadmap rule against storing
unlicensed protected text.

**Also block:** `title`/`body` non-empty; `cefrLevel` set; `wordCount`
computed (not manually entered — computed automatically from `body`);
`tokenizedVocabularyProfile` present (computed automatically at
`DRAFT → REVIEWED`); at least one comprehension question.

**Warning only:** missing `targetPhraseIds`/`targetGrammarRuleIds`
(a text can be general-purpose); missing `speakingTask`/`summaryTask`
(recommended, not required).

**Requires human review, cannot be automated:** whether the claimed
`license` actually matches the real source of the text; whether an
AI-assisted draft text is stylistically appropriate.

## Canonical grammar explanations — how the two legacy texts are resolved

Neither `CATEGORY_RULE_DETAILS` (`context-examples.ts`) nor
`MICRO_LESSON_RULES` (`ai/fallbacks.ts`) is automatically canonical.
Both are treated strictly as **legacy drafts** feeding into the review
process for each of the 12 MVP rules:

1. For the MVP rule's category, read both legacy texts side by side.
2. Draft a new `shortExplanationRu` (1–2 sentences, for the inline error
   card — closer in length to the current `CATEGORY_RULE_DETAILS` style)
   and a new `explanationRu` (the fuller "Подробнее"/`MicroLesson` text —
   closer in depth to the current `MICRO_LESSON_RULES` style, but
   reconciled against `CATEGORY_RULE_DETAILS` so the two are never
   contradictory).
3. Explicitly note in `sourceRefs` which legacy text(s) informed the
   draft and what, if anything, was changed or corrected.
4. The row starts life at `contentStatus = DRAFT` regardless of how much
   of the legacy text was reused verbatim — reusing existing wording does
   not skip human review.

This directly resolves the confirmed content divergence documented in
`phase-2a-audit.md` (the `THIRD_PERSON_SINGULAR` example) — the two
inconsistent legacy texts stop being two independent sources of truth
and become inputs to one reviewed canonical pair per rule.

## Git-backed versioning

**Accepted for MVP.** A single mutable `version` integer on a database
row is not a revision history and by itself does not enable rollback —
this was a real gap in the original Phase 2A report, corrected here.

- The reviewed content **definition** for each `GrammarRule`/
  `ReadingContent`/curated `Phrase` — the structured input file consumed
  by `content:create-draft`/`content:review` — is a version-controlled
  file living in the repository (exact path/format is a Grammar MVP
  implementation detail, not decided in Phase 2A; conceptually
  `english-flow/backend/content-authoring/grammar-rules/ARTICLE_A_AN.*`
  or similar).
- The database stores the **current published snapshot** — the result of
  applying the currently-live Git revision, not an independent editable
  copy.
- Changing `PUBLISHED` content means: edit the file in Git, get it
  reviewed (a normal PR review on the content-authoring file, separate
  from Phase 2A's own PR), then run `content:publish` (or an equivalent
  "republish from file" command), which re-applies the file to the DB
  and increments `version`.
- **Direct editing of a published row in the production database is
  never a supported path.** The CLI is the only writer.
- **Rollback** means: re-apply the previous Git revision of the content
  file (`git show <previous-commit>:<path>` → `content:publish`), which
  again increments `version` (rollback is itself a new version, not a
  time-travel operation on the `version` field) and updates the DB
  snapshot back to the earlier text.
- **`ARCHIVED` is not a substitute for version history.** Archiving a
  row stops it from being served to users (`GET` endpoints filter to
  `PUBLISHED`); it does not, by itself, tell you what the text used to
  say five revisions ago — that's what Git history is for. If a content
  row is archived and later needs to be un-archived with an old exact
  wording restored, that wording comes from Git, not from the `ARCHIVED`
  row's current DB content (which reflects whatever it last was before
  archiving, not necessarily what a reviewer wants to restore).

### Explicit MVP limitation

This gives *content-definition* version history (what did the reviewed
text used to say) via Git, and a simple *status* history (draft → …→
archived, when) via the four-state enum with timestamps. It does **not**
give: a queryable in-product audit log of every field-level change, a
diff view inside the product, or multi-branch/concurrent-draft editing.
**When a future phase needs any of those, that is the trigger for a
dedicated `GrammarRuleRevision` (or a general content
revision/event-log) table** — not before. Phase 2A explicitly does not
build that table now, and this document does not promise it will exist
soon; it names the trigger condition so nobody has to guess later
whether Git-backed versioning was "meant to be temporary."

## Archive and rollback — user-progress guarantee

Archiving a `GrammarRule`/`ReadingContent`/curated `Phrase` never
deletes the row and never breaks a learner's existing progress:
`ErrorRecord.grammarRuleId` uses `onDelete: SetNull` semantics (see
`domain-model.md`) so an archived rule's id can safely disappear from
future lookups without corrupting past records; `UserPhrase`/
`ReviewAttempt` are never touched by any Phase 2A-derived change (see
`migration-plan.md`); `UserReadingProgress` rows referencing an archived
`ReadingContent` keep their historical `comprehensionScore`/
`savedPhraseIds` — only the ability to *start a new* reading session on
that text disappears.
