/**
 * Import of the 12 approved Grammar MVP rules — local AND, under a tightly
 * controlled explicit opt-in, production.
 *
 * LOCAL (localhost-style host): unchanged from the original local-only
 * design. Requires ALLOW_GRAMMAR_IMPORT=true; blocked under
 * NODE_ENV=production. Idempotent upsert-by-ruleCode, safe to rerun.
 *
 * PRODUCTION (any non-localhost host, e.g. Neon): blocked by default. Only
 * proceeds when ALL three of the following are true (exact string
 * equality, checked in assertImportAllowed()):
 *   ALLOW_GRAMMAR_IMPORT=true
 *   ALLOW_PRODUCTION_GRAMMAR_IMPORT=true
 *   PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION=IMPORT_12_REVIEWED_GRAMMAR_RULES
 * The old unconditional "reject any Neon-looking host" rule has been
 * removed — production for this app IS Neon, so a hard, un-opt-outable
 * block on Neon hosts would make a real production import structurally
 * impossible, defeating the purpose of this script. The triple opt-in is
 * the new, stronger, purpose-built gate that supersedes it; the default
 * (no opt-in) is still a hard block.
 *
 * Once past the gate, a production run additionally requires
 * (assertProductionPreflight(), run as the first statements inside the
 * same transaction as the writes — see runProductionImport()):
 *   - the 12-rule source passes full structural validation;
 *   - every computed contentStatus is REVIEWED (not just non-PUBLISHED —
 *     a DRAFT rule is also refused in production);
 *   - every computed sourceVerificationStatus is PARTIALLY_VERIFIED;
 *   - the target GrammarRule and GrammarRuleExample tables are BOTH
 *     empty — this script never upserts/overwrites existing production
 *     rows automatically; a non-empty target STOPs before any write.
 *
 * GRAMMAR_IMPORT_DRY_RUN=true (production path only — ignored for a
 * localhost target, which is unaffected by this flag): runs the full
 * preflight (connects, validates, counts) and reports planned counts,
 * performing zero writes — no transaction is even opened in this mode, so
 * there is nothing to roll back.
 *
 * Atomicity: a real (non-dry-run) production run performs preflight, all
 * 12 rules' writes, AND the critical invariant check (GrammarRule
 * count=12, GrammarRuleExample count=91, exact expected ruleCodes, all
 * REVIEWED, all PARTIALLY_VERIFIED, zero PUBLISHED, zero ARCHIVED) inside
 * ONE Prisma transaction, in that order — the invariant check runs last,
 * still inside the transaction, before it returns/commits. Any failure
 * anywhere in that sequence, including a failed invariant, rolls back
 * every write from that run — no partial or invariant-violating dataset
 * can ever be committed to production. A second, identical invariant
 * check runs again after commit as defense-in-depth only; by then the
 * authoritative pre-commit check has already passed, so this second
 * check cannot roll anything back — it can only throw loudly.
 *
 * Never logs DATABASE_URL/DIRECT_URL or credentials — only
 * redactDatabaseUrl() output and non-secret host/counts.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { redactDatabaseUrl } from '../src/common/seed-guard';
import { GRAMMAR_RULES_SOURCE } from '../src/modules/grammar/grammar-rules.data';
import { GRAMMAR_REVIEW_MANIFEST } from '../src/modules/grammar/grammar-review-manifest';
import {
  computeImportPlan,
  GrammarRuleImportPlanEntry,
} from '../src/modules/grammar/grammar-import-plan';
import { EXPECTED_GRAMMAR_RULE_CODES } from '../src/modules/grammar/grammar-rules.expected-codes';
import {
  validateGrammarReviewManifest,
  validateGrammarRulesSource,
} from '../src/modules/grammar/grammar-rules.validation';

const LOCAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^postgres$/i,
  /^db$/i,
];

export const PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION_PHRASE =
  'IMPORT_12_REVIEWED_GRAMMAR_RULES';

export function isLocalHost(host: string): boolean {
  return LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

function parseHost(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    throw new Error(
      'DATABASE_URL is not a valid connection URL — refusing to proceed.',
    );
  }
}

/**
 * Gate on whether this run may proceed at all, before any database
 * connection is opened. Two branches:
 *  - localhost-style host → LOCAL behavior, unchanged from before this
 *    change (NODE_ENV=production blocked; ALLOW_GRAMMAR_IMPORT=true
 *    required).
 *  - anything else → PRODUCTION behavior: blocked by default, requires
 *    the explicit triple opt-in with exact string equality on each of
 *    the three variables.
 */
export function assertImportAllowed(
  databaseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const host = parseHost(databaseUrl);

  if (isLocalHost(host)) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'Refusing to run the grammar import with NODE_ENV=production against a local database. This script is local-only for a localhost target.',
      );
    }
    if (env.ALLOW_GRAMMAR_IMPORT !== 'true') {
      throw new Error(
        'The grammar import requires an explicit ALLOW_GRAMMAR_IMPORT=true — refused to avoid ' +
          'running against the wrong database by accident. Set the variable deliberately before ' +
          'running npm run grammar:import.',
      );
    }
    return;
  }

  if (env.ALLOW_GRAMMAR_IMPORT !== 'true') {
    throw new Error(
      `Refusing to run the grammar import against non-localhost host "${host}" — ALLOW_GRAMMAR_IMPORT=true ` +
        'is required (in addition to the production-specific flags below).',
    );
  }
  if (env.ALLOW_PRODUCTION_GRAMMAR_IMPORT !== 'true') {
    throw new Error(
      `Refusing to run the grammar import against non-localhost host "${host}" — this requires explicit ` +
        'ALLOW_PRODUCTION_GRAMMAR_IMPORT=true.',
    );
  }
  if (
    env.PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION !==
    PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION_PHRASE
  ) {
    throw new Error(
      `Refusing to run the grammar import against non-localhost host "${host}" — this requires ` +
        `PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION=${PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION_PHRASE} exactly.`,
    );
  }
}

interface CountableGrammarClient {
  grammarRule: { count(): Promise<number> };
  grammarRuleExample: { count(): Promise<number> };
}

export interface ProductionPreflightResult {
  plan: GrammarRuleImportPlanEntry[];
  totalExamples: number;
  totalExerciseTemplates: number;
}

/**
 * Hard-checks required before ANY write to a production/non-localhost
 * database. Throws with a specific message on the first failing check.
 * Makes exactly two read-only COUNT queries against the target database
 * (via whichever client — plain or transaction — it is given) and
 * performs no writes.
 */
export async function assertProductionPreflight(
  client: CountableGrammarClient,
): Promise<ProductionPreflightResult> {
  const sourceValidation = validateGrammarRulesSource(GRAMMAR_RULES_SOURCE);
  if (!sourceValidation.valid) {
    throw new Error(
      `Production preflight failed — grammar rules source is invalid:\n${sourceValidation.errors.join('\n')}`,
    );
  }
  if (GRAMMAR_RULES_SOURCE.length !== EXPECTED_GRAMMAR_RULE_CODES.length) {
    throw new Error(
      `Production preflight failed — expected exactly ${EXPECTED_GRAMMAR_RULE_CODES.length} source rule ` +
        `definitions, found ${GRAMMAR_RULES_SOURCE.length}.`,
    );
  }

  const manifestValidation = validateGrammarReviewManifest(
    GRAMMAR_REVIEW_MANIFEST,
    GRAMMAR_RULES_SOURCE,
  );
  if (!manifestValidation.valid) {
    throw new Error(
      `Production preflight failed — grammar review manifest is invalid:\n${manifestValidation.errors.join('\n')}`,
    );
  }

  const plan = computeImportPlan(GRAMMAR_RULES_SOURCE, GRAMMAR_REVIEW_MANIFEST);

  const notReviewed = plan.filter((p) => p.contentStatus !== 'REVIEWED');
  if (notReviewed.length > 0) {
    throw new Error(
      'Production preflight failed — rule(s) not REVIEWED, refusing to import into production: ' +
        notReviewed.map((p) => `${p.ruleCode}=${p.contentStatus}`).join(', '),
    );
  }

  const notPartiallyVerified = plan.filter(
    (p) => p.sourceVerificationStatus !== 'PARTIALLY_VERIFIED',
  );
  if (notPartiallyVerified.length > 0) {
    throw new Error(
      'Production preflight failed — rule(s) not PARTIALLY_VERIFIED: ' +
        notPartiallyVerified
          .map((p) => `${p.ruleCode}=${p.sourceVerificationStatus}`)
          .join(', '),
    );
  }

  // Redundant with the ImportContentStatus type (structurally 'DRAFT' |
  // 'REVIEWED') — kept as an explicit runtime assertion given how
  // safety-critical this path is; a future refactor that loosened the
  // type would still be caught here.
  const canProducePublishedOrArchived = plan.some(
    (p) =>
      (p.contentStatus as string) === 'PUBLISHED' ||
      (p.contentStatus as string) === 'ARCHIVED',
  );
  if (canProducePublishedOrArchived) {
    throw new Error(
      'Production preflight failed — the import plan would produce a PUBLISHED or ARCHIVED rule. ' +
        'This must never happen; aborting.',
    );
  }

  const [existingRuleCount, existingExampleCount] = await Promise.all([
    client.grammarRule.count(),
    client.grammarRuleExample.count(),
  ]);
  if (existingRuleCount > 0) {
    throw new Error(
      `Production preflight failed — target GrammarRule table is not empty (count=${existingRuleCount}). ` +
        'Refusing to write; this script never upserts/overwrites existing production rows automatically.',
    );
  }
  if (existingExampleCount > 0) {
    throw new Error(
      `Production preflight failed — target GrammarRuleExample table is not empty (count=${existingExampleCount}). ` +
        'Refusing to write; this script never upserts/overwrites existing production rows automatically.',
    );
  }

  const totalExamples = GRAMMAR_RULES_SOURCE.reduce(
    (sum, rule) => sum + rule.examples.length,
    0,
  );
  const totalExerciseTemplates = GRAMMAR_RULES_SOURCE.reduce(
    (sum, rule) => sum + rule.exerciseTemplates.exercises.length,
    0,
  );

  return { plan, totalExamples, totalExerciseTemplates };
}

interface GrammarWriteClient {
  grammarRule: {
    findUnique(args: {
      where: { ruleCode: string };
    }): Promise<{ id: string; contentStatus: string } | null>;
    upsert(args: {
      where: { ruleCode: string };
      create: Prisma.GrammarRuleCreateInput;
      update: Prisma.GrammarRuleUpdateInput;
    }): Promise<{ id: string }>;
  };
  grammarRuleExample: {
    deleteMany(args: {
      where: { grammarRuleId: string };
    }): Promise<{ count: number }>;
    createMany(args: {
      data: Prisma.GrammarRuleExampleCreateManyInput[];
    }): Promise<{ count: number }>;
  };
}

async function upsertAllRules(
  tx: GrammarWriteClient,
  plan: GrammarRuleImportPlanEntry[],
): Promise<void> {
  const planByCode = new Map(plan.map((p) => [p.ruleCode, p]));

  for (const rule of GRAMMAR_RULES_SOURCE) {
    const rulePlan = planByCode.get(rule.ruleCode);
    if (!rulePlan) {
      throw new Error(
        `No import plan entry for ruleCode "${rule.ruleCode}" — aborting transaction.`,
      );
    }

    const existing = await tx.grammarRule.findUnique({
      where: { ruleCode: rule.ruleCode },
    });
    if (
      existing &&
      (existing.contentStatus === 'PUBLISHED' ||
        existing.contentStatus === 'ARCHIVED')
    ) {
      throw new Error(
        `Rule "${rule.ruleCode}" already exists with contentStatus=${existing.contentStatus} — ` +
          `this import never modifies a PUBLISHED or ARCHIVED rule. Aborting transaction.`,
      );
    }

    const grammarRule = await tx.grammarRule.upsert({
      where: { ruleCode: rule.ruleCode },
      create: {
        ruleCode: rule.ruleCode,
        titleRu: rule.titleRu,
        titleEn: rule.titleEn ?? null,
        shortExplanationRu: rule.shortExplanationRu,
        explanationRu: rule.explanationRu,
        formula: rule.formula ?? null,
        cefrLevel: rule.cefrLevel,
        contentStatus: rulePlan.contentStatus,
        sourceVerificationStatus: rulePlan.sourceVerificationStatus,
        contentVersion: rulePlan.contentVersion,
        exerciseSchemaVersion: rule.exerciseTemplates.exerciseSchemaVersion,
        exerciseTemplates:
          rule.exerciseTemplates as unknown as Prisma.InputJsonValue,
      },
      update: {
        titleRu: rule.titleRu,
        titleEn: rule.titleEn ?? null,
        shortExplanationRu: rule.shortExplanationRu,
        explanationRu: rule.explanationRu,
        formula: rule.formula ?? null,
        cefrLevel: rule.cefrLevel,
        contentStatus: rulePlan.contentStatus,
        sourceVerificationStatus: rulePlan.sourceVerificationStatus,
        contentVersion: rulePlan.contentVersion,
        exerciseSchemaVersion: rule.exerciseTemplates.exerciseSchemaVersion,
        exerciseTemplates:
          rule.exerciseTemplates as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.grammarRuleExample.deleteMany({
      where: { grammarRuleId: grammarRule.id },
    });
    await tx.grammarRuleExample.createMany({
      data: rule.examples.map((example, index) => ({
        grammarRuleId: grammarRule.id,
        exampleType: example.exampleType,
        sentence: example.sentence,
        correction: example.correction ?? null,
        explanation: example.explanation ?? null,
        context: example.context ?? null,
        sortOrder: index,
      })),
    });

    // eslint-disable-next-line no-console
    console.log(
      `Imported ${rule.ruleCode}: contentStatus=${rulePlan.contentStatus}, ` +
        `sourceVerificationStatus=${rulePlan.sourceVerificationStatus}, examples=${rule.examples.length}`,
    );
  }
}

/** LOCAL import entry point — unchanged behavior: validate, then upsert
 * all 12 rules inside a single transaction. Safe to rerun (idempotent by
 * ruleCode). No emptiness precondition — local development legitimately
 * reruns against a non-empty table. */
export async function importRules(prisma: PrismaClient): Promise<void> {
  const sourceValidation = validateGrammarRulesSource(GRAMMAR_RULES_SOURCE);
  if (!sourceValidation.valid) {
    throw new Error(
      `Grammar rules source failed validation:\n${sourceValidation.errors.join('\n')}`,
    );
  }

  const manifestValidation = validateGrammarReviewManifest(
    GRAMMAR_REVIEW_MANIFEST,
    GRAMMAR_RULES_SOURCE,
  );
  if (!manifestValidation.valid) {
    throw new Error(
      `Grammar review manifest failed validation:\n${manifestValidation.errors.join('\n')}`,
    );
  }

  const plan = computeImportPlan(GRAMMAR_RULES_SOURCE, GRAMMAR_REVIEW_MANIFEST);

  await prisma.$transaction(async (tx) => {
    await upsertAllRules(tx, plan);
  });
}

export interface ProductionImportReport {
  dryRun: boolean;
  plannedRuleCount: number;
  plannedExampleCount: number;
  plannedExerciseTemplateCount: number;
  writesPerformed: boolean;
  verification?: ProductionImportVerification;
}

/**
 * PRODUCTION import entry point. Call only after assertImportAllowed()
 * has already passed for a non-localhost host — this function does not
 * re-check the env-var opt-in itself, only the content/data preconditions.
 *
 * dryRun=true: preflight only (two COUNT reads + in-memory validation),
 * no transaction opened, zero writes possible.
 *
 * dryRun=false: preflight and all 12 rules' writes, AND the critical
 * invariant check (verifyProductionImportInvariants, called with `tx`),
 * all run inside ONE transaction — the invariant check is the last thing
 * that happens before the transaction callback returns and commits. If
 * it throws, Prisma rolls back every write made in this transaction; the
 * commit that would otherwise follow never happens. A second call to
 * verifyProductionImportInvariants(prisma) runs after commit as
 * defense-in-depth only — by the time it runs, the authoritative
 * pre-commit check has already passed.
 */
export async function runProductionImport(
  prisma: PrismaClient,
  options: { dryRun: boolean },
): Promise<ProductionImportReport> {
  if (options.dryRun) {
    const { plan, totalExamples, totalExerciseTemplates } =
      await assertProductionPreflight(prisma);
    // eslint-disable-next-line no-console
    console.log(
      `[grammar:import:production] DRY RUN — preflight passed. Planned: ${plan.length} rules, ` +
        `${totalExamples} examples, ${totalExerciseTemplates} exercise templates. Zero writes performed.`,
    );
    return {
      dryRun: true,
      plannedRuleCount: plan.length,
      plannedExampleCount: totalExamples,
      plannedExerciseTemplateCount: totalExerciseTemplates,
      writesPerformed: false,
    };
  }

  let plan!: GrammarRuleImportPlanEntry[];
  let totalExamples = 0;
  let totalExerciseTemplates = 0;

  await prisma.$transaction(async (tx) => {
    const preflight = await assertProductionPreflight(tx);
    plan = preflight.plan;
    totalExamples = preflight.totalExamples;
    totalExerciseTemplates = preflight.totalExerciseTemplates;
    await upsertAllRules(tx, plan);

    // Critical, authoritative check — runs INSIDE this transaction via
    // `tx`, after all writes and BEFORE the callback returns (i.e.
    // before commit). Any failure throws here, which rolls back every
    // write made in this transaction; commit never happens.
    await verifyProductionImportInvariants(tx, 'pre-commit');
  });

  // Defense-in-depth only: the transaction above already committed
  // because the pre-commit check inside it passed. This re-reads the
  // now-committed data and throws loudly (nothing left to roll back at
  // this point) if it somehow still disagrees.
  const verification = await verifyProductionImportInvariants(
    prisma,
    'post-commit',
  );
  // eslint-disable-next-line no-console
  console.log(
    `[grammar:import:production] Import complete and verified: ${verification.ruleCount} rules, ` +
      `${verification.exampleCount} examples, all REVIEWED / PARTIALLY_VERIFIED, zero PUBLISHED/ARCHIVED.`,
  );

  return {
    dryRun: false,
    plannedRuleCount: plan.length,
    plannedExampleCount: totalExamples,
    plannedExerciseTemplateCount: totalExerciseTemplates,
    writesPerformed: true,
    verification,
  };
}

export interface ProductionImportVerification {
  ruleCount: number;
  exampleCount: number;
  ruleCodes: string[];
  publishedCount: number;
  archivedCount: number;
}

interface VerifiableGrammarClient {
  grammarRule: {
    findMany(args: {
      select: {
        ruleCode: true;
        contentStatus: true;
        sourceVerificationStatus: true;
      };
    }): Promise<
      {
        ruleCode: string;
        contentStatus: string;
        sourceVerificationStatus: string;
      }[]
    >;
  };
  grammarRuleExample: { count(): Promise<number> };
}

/**
 * Invariant check: GrammarRule count, GrammarRuleExample count, the exact
 * expected 12 unique ruleCodes, all REVIEWED, all PARTIALLY_VERIFIED,
 * zero PUBLISHED, zero ARCHIVED. Structural — accepts either a plain
 * PrismaClient or a Prisma.TransactionClient (`tx`), so the SAME check
 * can run both as the authoritative pre-commit gate (inside the
 * transaction, via `tx` — a failure there rolls back the transaction)
 * and, optionally, again after commit as defense-in-depth (via `prisma`
 * — a failure there cannot roll anything back, only surface loudly).
 */
export async function verifyProductionImportInvariants(
  client: VerifiableGrammarClient,
  context: 'pre-commit' | 'post-commit' = 'post-commit',
): Promise<ProductionImportVerification> {
  const rules = await client.grammarRule.findMany({
    select: {
      ruleCode: true,
      contentStatus: true,
      sourceVerificationStatus: true,
    },
  });
  const exampleCount = await client.grammarRuleExample.count();

  const expectedRuleCount = EXPECTED_GRAMMAR_RULE_CODES.length;
  const expectedExampleCount = GRAMMAR_RULES_SOURCE.reduce(
    (sum, rule) => sum + rule.examples.length,
    0,
  );

  const ruleCodes = rules.map((r) => r.ruleCode).sort();
  const expectedCodes = [...EXPECTED_GRAMMAR_RULE_CODES].sort();

  const errors: string[] = [];
  if (rules.length !== expectedRuleCount) {
    errors.push(
      `GrammarRule count is ${rules.length}, expected ${expectedRuleCount}.`,
    );
  }
  if (exampleCount !== expectedExampleCount) {
    errors.push(
      `GrammarRuleExample count is ${exampleCount}, expected ${expectedExampleCount}.`,
    );
  }
  if (JSON.stringify(ruleCodes) !== JSON.stringify(expectedCodes)) {
    errors.push(
      `ruleCodes do not exactly match the expected ${expectedRuleCount}: found [${ruleCodes.join(', ')}]`,
    );
  }
  const notReviewed = rules.filter((r) => r.contentStatus !== 'REVIEWED');
  if (notReviewed.length > 0) {
    errors.push(
      `${notReviewed.length} rule(s) not REVIEWED: ${notReviewed.map((r) => r.ruleCode).join(', ')}`,
    );
  }
  const notPartiallyVerified = rules.filter(
    (r) => r.sourceVerificationStatus !== 'PARTIALLY_VERIFIED',
  );
  if (notPartiallyVerified.length > 0) {
    errors.push(
      `${notPartiallyVerified.length} rule(s) not PARTIALLY_VERIFIED: ` +
        notPartiallyVerified.map((r) => r.ruleCode).join(', '),
    );
  }
  const published = rules.filter((r) => r.contentStatus === 'PUBLISHED');
  if (published.length > 0) {
    errors.push(
      `${published.length} rule(s) PUBLISHED: ${published.map((r) => r.ruleCode).join(', ')}`,
    );
  }
  const archived = rules.filter((r) => r.contentStatus === 'ARCHIVED');
  if (archived.length > 0) {
    errors.push(
      `${archived.length} rule(s) ARCHIVED: ${archived.map((r) => r.ruleCode).join(', ')}`,
    );
  }

  if (errors.length > 0) {
    const message =
      context === 'pre-commit'
        ? 'Critical invariant check FAILED before commit — rolling back the entire transaction, ' +
          `nothing will be written to the database:\n${errors.join('\n')}`
        : 'Post-import verification FAILED — data is already committed; investigate manually, do not ' +
          `rerun blindly:\n${errors.join('\n')}`;
    throw new Error(message);
  }

  return {
    ruleCount: rules.length,
    exampleCount,
    ruleCodes,
    publishedCount: published.length,
    archivedCount: archived.length,
  };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — refusing to proceed.');
  }
  assertImportAllowed(databaseUrl);

  const host = parseHost(databaseUrl);
  const targetIsLocal = isLocalHost(host);
  // eslint-disable-next-line no-console
  console.log(`[grammar:import] Target DB: ${redactDatabaseUrl(databaseUrl)}`);

  const prisma = new PrismaClient();
  try {
    if (targetIsLocal) {
      await importRules(prisma);
      const count = await prisma.grammarRule.count();
      // eslint-disable-next-line no-console
      console.log(`Grammar MVP import complete. GrammarRule count: ${count}`);
      return;
    }

    // GRAMMAR_IMPORT_DRY_RUN only affects the production/non-local path —
    // per design, LOCAL behavior is unaffected by this flag.
    const dryRun = process.env.GRAMMAR_IMPORT_DRY_RUN === 'true';
    await runProductionImport(prisma, { dryRun });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
