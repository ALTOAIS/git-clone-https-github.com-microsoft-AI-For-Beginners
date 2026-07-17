# Grammar MVP — Migration execution plan

**Status: PLAN ONLY. NOT EXECUTED. No migration file exists.** This
document is the execution-ready sibling of `grammar-migration-dry-run-plan.md`
— exact expected SQL, mirroring the real style of the 5 existing
migrations. Neither document authorizes running anything.

**Corrected this round, schema surface changed again:**
`GrammarRule.microCategories` and `.resolverHints` **removed entirely**
(not just reclassified); `.reviewedBy`/`.reviewedAt` **removed** (review
metadata stays in Git, see `grammar-prisma-model-proposal.md`);
`.exerciseSchemaVersion` **added** (required, no default — new table,
every row the CLI creates supplies it); `ErrorRecord.grammarResolverVersion`
**added** (durable resolver audit trail, corrected from log-only);
`MicroLesson.sourceRuleCodes` **removed from this migration entirely**
(deferred — no confirmed MVP read path, see the Prisma proposal's final
decision). **5 steps, not 6.**

## Confirmed migration-file conventions (unchanged, from the actual repo)

Naming `<UTC timestamp>_<snake_case description>`; column adds via
`ALTER TABLE ... ADD COLUMN`, comma-chained when several land together;
enums via `CREATE TYPE ... AS ENUM` before any referencing table;
indexes `CREATE INDEX "Table_col_idx" ON "Table"("col")`; FKs as a
separate `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` after both
tables exist; no `DROP`/`RENAME` anywhere in the 5 existing migrations —
this plan matches that, no exceptions.

## Step sequence

### Step 1 — Enums

```sql
-- CreateEnum
CREATE TYPE "GrammarContentStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceVerificationStatus" AS ENUM ('NOT_VERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED_DIRECTLY', 'VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE');

-- CreateEnum
CREATE TYPE "GrammarExampleType" AS ENUM ('CORRECT', 'INCORRECT', 'CONTRAST', 'CONTEXT', 'EXCEPTION');
```

| | |
| --- | --- |
| Additive/destructive | Additive — `CREATE TYPE` only |
| Lock/data risk | None |
| Compatibility | Safe — old backend has no knowledge of these types |
| Rollback | `DROP TYPE` — only before any column uses it |
| Deploy ordering | First |
| Zero-downtime? | Yes |
| Validation query | `SELECT typname FROM pg_type WHERE typname IN ('GrammarContentStatus', 'SourceVerificationStatus', 'GrammarExampleType');` — expect 3 rows |

### Step 2 — `GrammarRule` table — corrected field set

```sql
-- CreateTable
CREATE TABLE "GrammarRule" (
    "id" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "titleEn" TEXT,
    "shortExplanationRu" TEXT NOT NULL,
    "explanationRu" TEXT NOT NULL,
    "formula" TEXT,
    "cefrLevel" "CefrLevel" NOT NULL,
    "contentStatus" "GrammarContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVerificationStatus" "SourceVerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "exerciseSchemaVersion" TEXT NOT NULL,
    "exerciseTemplates" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammarRule_ruleCode_key" ON "GrammarRule"("ruleCode");

-- CreateIndex
CREATE INDEX "GrammarRule_contentStatus_idx" ON "GrammarRule"("contentStatus");
```

**Removed from the previous round's Step 2:** `"microCategories"` column
+ its GIN index (field eliminated entirely — no candidate-set filter
reads it, no analytics use case confirmed); `"resolverHints"` column
(matching logic moved to version-controlled TypeScript, not DB JSON);
`"reviewedBy"`/`"reviewedAt"` columns (review metadata stays Git-only,
`contentStatus = REVIEWED` is the compact DB signal the gate passed).
**Added:** `"exerciseSchemaVersion" TEXT NOT NULL` with **no default** —
safe because this is a new table (every row the CLI ever creates
supplies this field explicitly at insert time; there is no
existing-row backfill question, identical reasoning to why
`"exerciseTemplates" JSONB NOT NULL` also carries no default here).
`"titleEn"` is now nullable (`TEXT`, no `NOT NULL`) per the corrected
field list.

| | |
| --- | --- |
| Additive/destructive | Additive — new table |
| Lock/data risk | None |
| Compatibility | Safe |
| Rollback | `DROP TABLE "GrammarRule"` — safe only pre-data (see Rollback section) |
| Deploy ordering | After Step 1 |
| Zero-downtime? | Yes |
| Validation query | `SELECT count(*) FROM "GrammarRule";` — expect `0` |

### Step 3 — `GrammarRuleExample` table

Unchanged from the prior round.

```sql
-- CreateTable
CREATE TABLE "GrammarRuleExample" (
    "id" TEXT NOT NULL,
    "grammarRuleId" TEXT NOT NULL,
    "exampleType" "GrammarExampleType" NOT NULL,
    "sentence" TEXT NOT NULL,
    "correction" TEXT,
    "explanation" TEXT,
    "context" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarRuleExample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrammarRuleExample_grammarRuleId_sortOrder_idx" ON "GrammarRuleExample"("grammarRuleId", "sortOrder");

-- AddForeignKey
ALTER TABLE "GrammarRuleExample" ADD CONSTRAINT "GrammarRuleExample_grammarRuleId_fkey" FOREIGN KEY ("grammarRuleId") REFERENCES "GrammarRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

| | |
| --- | --- |
| Additive/destructive | Additive |
| Lock/data risk | None |
| Compatibility | Safe |
| Rollback | `DROP TABLE "GrammarRuleExample"` — pre-data only |
| Deploy ordering | After Step 2 |
| Zero-downtime? | Yes |
| Validation query | `SELECT count(*) FROM "GrammarRuleExample";` — expect `0` |

### Step 4 — `ErrorRecord.grammarRuleId` (nullable, no backfill)

```sql
-- AlterTable
ALTER TABLE "ErrorRecord" ADD COLUMN "grammarRuleId" TEXT;

-- CreateIndex
CREATE INDEX "ErrorRecord_grammarRuleId_idx" ON "ErrorRecord"("grammarRuleId");

-- AddForeignKey
ALTER TABLE "ErrorRecord" ADD CONSTRAINT "ErrorRecord_grammarRuleId_fkey" FOREIGN KEY ("grammarRuleId") REFERENCES "GrammarRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

| | |
| --- | --- |
| Additive/destructive | Additive — nullable, no default, metadata-only add on Postgres 11+, same pattern as `ErrorRecord.microCategory`'s own addition |
| Lock/data risk | Brief `ACCESS EXCLUSIVE` for the `ALTER TABLE` metadata change, not a table rewrite |
| Compatibility | Safe |
| Rollback | Drop FK, drop index, drop column — safe if no rows populated (see Rollback section for the once-populated case) |
| Deploy ordering | After Step 2 |
| Zero-downtime? | Yes — index creation should use `CREATE INDEX CONCURRENTLY` at actual deploy time on this live table, noted as a deploy-time deviation from the plain form shown |
| Validation query | `SELECT count(*) FROM "ErrorRecord" WHERE "grammarRuleId" IS NOT NULL;` — expect `0`; row count unchanged |

### Step 5 — `ErrorRecord.grammarResolverVersion` (new this round)

```sql
-- AlterTable
ALTER TABLE "ErrorRecord" ADD COLUMN "grammarResolverVersion" TEXT;
```

| | |
| --- | --- |
| Additive/destructive | Additive — nullable, no default, no index (no confirmed query filters by this field — consistent with this round's general "no speculative index" position) |
| Lock/data risk | Metadata-only, same class as Step 4 |
| Compatibility | Safe |
| Rollback | `ALTER TABLE "ErrorRecord" DROP COLUMN "grammarResolverVersion";` — safe, no FK to drop first (this column is deliberately not a FK, per `grammar-prisma-model-proposal.md`) |
| Deploy ordering | Independent of Step 4 — no dependency between them, can run in either order or the same `ALTER TABLE` statement as Step 4 if convenient at actual migration-authoring time |
| Zero-downtime? | Yes |
| Validation query | `SELECT count(*) FROM "ErrorRecord" WHERE "grammarResolverVersion" IS NOT NULL;` — expect `0` |

### Steps not included this round

**`MicroLesson.sourceRuleCodes` — removed from this migration entirely,
not just deferred to a later step.** Per `grammar-prisma-model-proposal.md`'s
final decision: no confirmed MVP read path exists for a lesson↔rule
linkage today; adding the column now would be the same speculative-schema-surface
problem this round removes from `GrammarRule`. If a future round adds
it, that is a new, separate migration, not a step number reserved here.

**A separate "indexes and constraints" step — not needed.** Every index
and FK in this plan is created inline within the step that creates its
underlying column/table (`GrammarRule_ruleCode_key`/`GrammarRule_contentStatus_idx`
in Step 2, `GrammarRuleExample`'s index+FK in Step 3,
`ErrorRecord_grammarRuleId_idx`+FK in Step 4) — matching the real style
of every existing migration in this repo, none of which has a trailing
separate index-only migration.

## Combined verification (after all 5 steps)

```sql
SELECT count(*) FROM "GrammarRule";                                        -- 0
SELECT count(*) FROM "GrammarRuleExample";                                 -- 0
SELECT count(*) FROM "ErrorRecord" WHERE "grammarRuleId" IS NOT NULL;      -- 0
SELECT count(*) FROM "ErrorRecord" WHERE "grammarResolverVersion" IS NOT NULL; -- 0
SELECT count(*) FROM "ErrorRecord";  -- unchanged from pre-migration snapshot
```

## Deploy ordering, end to end

1 → 2 → 3, with 4 and 5 able to run any time after 2 (4 has no
dependency on 5 or vice versa — both are independent additive columns
on `ErrorRecord`). On Render (`english-flow/render.yaml`: Docker build,
free-tier, `CMD`-based migration execution), a single `prisma migrate
deploy` applying all 5 steps in one deploy is the realistic shape.

## Old-backend / new-backend compatibility window

Unchanged reasoning: old backend code against the new schema is always
safe; new backend code must not deploy before the migration has run.

## Zero-downtime assessment — overall

**Realistic for all 5 steps.** No table rewrite, no long-held lock; the
two `ErrorRecord` additions (Steps 4–5) mirror changes already shipped
safely to this exact table twice (`microCategory`, then
`skipCount`/`lastSkippedDate`).

## PostgreSQL enum rollback limitation

Unchanged from the prior round: Postgres has no `ALTER TYPE ... DROP
VALUE` — this plan never needs it (no enum value is ever added or
removed after creation here), flagged as a standing constraint for any
future enum-value change.

## Rollback — four distinct categories, not one

Unchanged structure from the prior round, re-verified against the
corrected step list:

1. **Application rollback** (revert the code commit) — always safe.
2. **Feature deactivation** (`UPDATE "GrammarRule" SET "contentStatus" =
   'ARCHIVED' WHERE "contentStatus" = 'PUBLISHED'`) — always safe, no
   schema change.
3. **Data-preserving rollback** (e.g. `UPDATE "ErrorRecord" SET
   "grammarRuleId" = NULL, "grammarResolverVersion" = NULL` before
   dropping either column) — safe; both fields are optional
   traceability/audit metadata, not core error content.
4. **Schema rollback** (`DROP TABLE`/`DROP COLUMN`) — **safe only in a
   genuine pre-data rehearsal, confirmed zero real rows, fresh backup
   taken first regardless.** `GrammarRule`/`GrammarRuleExample` content
   is Git-reproducible if ever dropped after import; `ErrorRecord`
   column data (both new columns) has no Git backup of its own, but both
   are low-stakes optional metadata, not core learner content — the
   `originalText`/`correctedText`/`explanation` fields are never touched
   by anything in this plan.

## What this plan does not cover

No Phrase MVP or Reading MVP schema changes, no backfill of any existing
row, no `MicroLesson` changes (deferred entirely this round), and — the
point of this document — **no execution**.
