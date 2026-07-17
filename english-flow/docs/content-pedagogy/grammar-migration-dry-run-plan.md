# Grammar MVP — Migration dry-run plan

**NOT EXECUTED.** Every item in this document is a plan for a future
migration, checked against the current `backend/prisma/schema.prisma`
by direct reading. No migration file has been created. No `prisma
migrate dev`/`deploy` has been run. No database, staging or production,
has been touched. This document itself does not change that — it exists
so that when implementation is separately approved, the actual work has
a reviewed plan to follow instead of improvising against a live
database.

This plan covers **Grammar MVP schema changes only** — `GrammarRule`,
`GrammarRuleExample`, `ErrorRecord.grammarRuleId`,
`MicroLesson.sourceRuleCodes`. Phrase MVP and Reading MVP have their own
separate, later dry-run plans (not written yet — out of scope here, see
`decisions.md` → Blocking #2/#3/#4).

## Schema changes — full table

| Change | Additive or destructive | Table-lock risk | Impact on existing rows | Nullable / backfill strategy | Deployment order |
| --- | --- | --- | --- | --- | --- |
| **New table `GrammarRule`** (`ruleCode` unique, `cefrLevel`, `titleRu`/`titleEn`, `shortExplanationRu`, `explanationRu`, `pattern`, `resolverHints` JSON, `exerciseTemplates` JSON, `contentStatus`, `version`, `reviewedBy`/`reviewedAt`/`reviewNotes`/`sourceRefs`, `microCategories` array) | Additive — new table, no existing table touched | None — `CREATE TABLE` does not lock any existing table on Postgres | None — table starts empty | N/A — new table, no backfill possible or needed | 1st |
| **New table `GrammarRuleExample`** (FK to `GrammarRule`, `originalText`, `correctedText`, `context` enum-or-string, `isEveryday`/`isProfessional`/`isContrast` flags) | Additive — new table | None | None — table starts empty | N/A | 2nd, after `GrammarRule` exists (FK target) |
| **`ErrorRecord.grammarRuleId`** — new column, nullable, FK to `GrammarRule.id`, `onDelete: SetNull` | Additive — `ALTER TABLE ... ADD COLUMN` nullable with no default | Brief `ACCESS EXCLUSIVE` lock for the `ALTER TABLE` itself (fast on Postgres for a nullable column with no default — metadata-only change, does not rewrite existing rows) | **Zero** — nullable, no default means every existing row gets `NULL` with no table rewrite | Nullable, **no backfill** — explicitly decided in `decisions.md` #11; legacy `ErrorRecord` rows stay `NULL` forever, they are never retroactively linked to a `GrammarRule` | 3rd, after `GrammarRule` exists (FK target) |
| **`MicroLesson.sourceRuleCodes`** — new column, `String[]`, default `[]` | Additive — `ALTER TABLE ... ADD COLUMN ... DEFAULT '{}'` | Same as above — metadata-only for a column with a constant default on modern Postgres (11+), no full table rewrite | **Zero** — every existing row gets `{}` | Default empty array, no backfill — matches the existing `sourceErrorIds: String[]` pattern already on this model | 4th, independent of the FK columns above, can run in parallel with them |
| **Indexes:** `GrammarRule.ruleCode` (unique), `GrammarRule.contentStatus`, `GrammarRule(microCategories)` (GIN, for array containment queries), `ErrorRecord.grammarRuleId` | Additive | `CREATE INDEX CONCURRENTLY` recommended for `ErrorRecord.grammarRuleId` specifically, since `ErrorRecord` is a live, actively-written production table — avoids the `ACCESS EXCLUSIVE` lock a plain `CREATE INDEX` would take | None — index creation doesn't change row data | N/A | 5th, after the column exists |
| **Governance fields on `GrammarRule`** (`contentStatus`/`version`/`reviewedBy`/`reviewedAt`/`reviewNotes`/`sourceRefs`) | Additive — part of the new-table `CREATE TABLE` above, not a separate migration | None — new table | None | N/A, `contentStatus` defaults to `DRAFT` for every row the editorial CLI creates | Same as `GrammarRule` creation |
| **Editorial CLI import of 12 `DRAFT` rows** | Data change, not schema — application-level `INSERT`s via the CLI tool (not written yet), not a Prisma migration | None — plain `INSERT`s into an empty new table | None on any other table | N/A | 6th, after all schema changes are deployed and the CLI exists |

**Nothing in this table drops, renames, or changes the type of any
existing column.** No existing table is rewritten. No existing row's
data changes as a result of any step above.

## Backend compatibility across the deployment window

Render (the current hosting target, confirmed in earlier Phase 2A
architecture work) does not deploy schema migration and application
code atomically — there is a window where either the old backend runs
against the new schema, or (during rollback) an old backend needs to
tolerate columns it doesn't know about.

- **Old backend code against new schema:** safe. Prisma-generated
  queries only reference columns the old code's schema.prisma knows
  about; new nullable/defaulted columns are invisible to code that
  doesn't reference them. No old query breaks.
- **New backend code against old (pre-migration) schema:** would break —
  the new code should not be deployed until the migration has run.
  Standard order: migration first, then application code deploy, exactly
  as this table's "Deployment order" column implies.
- **Rollback scenario (new backend rolled back to old code, schema
  migration stays applied):** safe, same as the first case — additive
  schema, old code ignores the new columns/tables.

## Verification queries (to run after each step, dry-run environment only)

```sql
-- After GrammarRule/GrammarRuleExample creation: confirm empty, correct shape
SELECT count(*) FROM "GrammarRule";                 -- expect 0
SELECT count(*) FROM "GrammarRuleExample";           -- expect 0

-- After ErrorRecord.grammarRuleId: confirm every existing row is NULL, no rewrite artifacts
SELECT count(*) FROM "ErrorRecord" WHERE "grammarRuleId" IS NOT NULL;   -- expect 0
SELECT count(*) FROM "ErrorRecord";                                     -- expect unchanged from pre-migration count

-- After MicroLesson.sourceRuleCodes: confirm every existing row defaulted to empty array
SELECT count(*) FROM "MicroLesson" WHERE "sourceRuleCodes" != '{}';     -- expect 0
SELECT count(*) FROM "MicroLesson";                                     -- expect unchanged from pre-migration count

-- After CLI import: confirm exactly 12 rows, all DRAFT, all with the fixed ruleCode set
SELECT count(*) FROM "GrammarRule";                                     -- expect 12
SELECT count(*) FROM "GrammarRule" WHERE "contentStatus" != 'DRAFT';    -- expect 0
SELECT "ruleCode" FROM "GrammarRule" ORDER BY "ruleCode";
  -- expect exactly: ARTICLE_A_AN, ARTICLE_THE_SPECIFIC, ARTICLE_ZERO_GENERAL,
  -- BASIC_PREPOSITION_PATTERNS, BASIC_WORD_ORDER, COUNTABLE_UNCOUNTABLE,
  -- DO_DOES_DID_QUESTIONS_NEGATIVES, MODAL_BASE_VERB, PAST_SIMPLE_FORM,
  -- PAST_SIMPLE_VS_PRESENT_PERFECT, PRESENT_SIMPLE_THIRD_PERSON,
  -- SINGULAR_PLURAL_ARTICLE_AGREEMENT
```

## Production smoke test (post-deployment, before any rule is published)

1. Existing error-review flow (`errors` module) still returns the
   legacy static fallback text for every `MicroCategory` — confirms
   nothing broke by adding an unused nullable FK column.
2. Existing `MicroLesson` generation still succeeds and reads back with
   `sourceRuleCodes = []` — confirms the new defaulted array column
   doesn't break existing read/write paths.
3. `SELECT` a few real `ErrorRecord` rows created before the migration —
   confirm `grammarRuleId` is `NULL`, not an error, not a missing column.
4. Editorial CLI can create one `DRAFT` `GrammarRule` row and read it
   back — confirms the new table's shape matches what the CLI expects,
   without yet exposing it to any user-facing endpoint.
5. No user-facing endpoint returns `GrammarRule` content at this stage —
   confirms the additive migration alone does not change any learner's
   experience, since no application code path reads the new tables yet
   in this dry-run's scope.

## Rollback — by category

- **Application rollback:** revert the application-code commit. The
  additive schema stays in place; old code simply never queries the new
  tables/columns. No schema rollback needed for a pure application-code
  issue.
- **Content rollback:** flip an individual `GrammarRule.contentStatus`
  from `PUBLISHED` back to `ARCHIVED`. No redeploy, no migration
  involved — this is the primary, fast rollback mechanism for a bad
  piece of content, by design (`decisions.md` #17).
- **Migration rollback:** if the migration itself must be reversed (not
  expected for a purely additive change, but planned for completeness),
  `DROP` the new tables/columns only after confirming via the
  verification queries above that no application code references them
  and no `GrammarRule` row has been published — **never** a routine
  step, and never performed against production without a fresh backup
  confirmed first.
- **Incident rollback:** archive all `PUBLISHED` `GrammarRule` rows in
  one operation (`UPDATE "GrammarRule" SET "contentStatus" = 'ARCHIVED'
  WHERE "contentStatus" = 'PUBLISHED'`), then verify via the fallback
  smoke test (item 1 above) that the legacy static-content path resumes
  serving every category exactly as it did before Grammar MVP existed.

## What this plan explicitly does not cover

- Phrase MVP and Reading MVP schema changes — separate future plans.
- The `PhraseScope` migration — deferred, not part of Grammar MVP
  (`decisions.md` — Deferred #3).
- Any UPDATE/backfill of existing `ErrorRecord` or `MicroLesson` rows —
  explicitly rejected; legacy rows stay unlinked to any `GrammarRule`
  forever, by design, not by omission.
- Actually running any of the above. This is the plan; execution is a
  separate, later, explicitly approved step.
