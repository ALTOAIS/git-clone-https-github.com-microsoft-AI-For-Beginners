/**
 * Idempotent local import of the 12 approved Grammar MVP rules.
 *
 * LOCAL DATABASE ONLY. Refuses to run against any DATABASE_URL that looks
 * like a Neon host, against any non-localhost host, when
 * NODE_ENV=production, or without an explicit ALLOW_GRAMMAR_IMPORT=true —
 * see assertNotProductionDatabase() below, which mirrors the existing
 * ALLOW_E2E_SEED explicit-opt-in convention in
 * src/common/seed-guard.ts/assertE2eSeedAllowed(). This script never sets
 * contentStatus to PUBLISHED (the type system in grammar-import-plan.ts
 * makes that unrepresentable) and never touches an existing rule's
 * contentStatus/sourceVerificationStatus in a way that could downgrade a
 * PUBLISHED/ARCHIVED row — see the guard in importRules().
 *
 * Idempotency: ruleCode is the stable identity. Each run computes the
 * same governance plan from Git-tracked source data, so rerunning
 * produces the same logical dataset — no duplicate GrammarRule rows,
 * and each rule's examples are deterministically replaced (delete +
 * recreate in ruleCode's own array order, so sortOrder is stable).
 *
 * The whole import runs in a single Prisma transaction: a failure on any
 * rule rolls back the entire run, so a failed import never leaves a
 * partially-imported set of rules in the database.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { redactDatabaseUrl } from '../src/common/seed-guard';
import { GRAMMAR_RULES_SOURCE } from '../src/modules/grammar/grammar-rules.data';
import { GRAMMAR_REVIEW_MANIFEST } from '../src/modules/grammar/grammar-review-manifest';
import { computeImportPlan } from '../src/modules/grammar/grammar-import-plan';
import {
  validateGrammarReviewManifest,
  validateGrammarRulesSource,
} from '../src/modules/grammar/grammar-rules.validation';

const FORBIDDEN_HOST_PATTERNS = [/neon\.tech$/i, /neon\.build$/i, /\.neon\./i];

export function assertNotProductionDatabase(
  databaseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to run the grammar import with NODE_ENV=production. This script is local-only.',
    );
  }

  if (env.ALLOW_GRAMMAR_IMPORT !== 'true') {
    throw new Error(
      'The grammar import requires an explicit ALLOW_GRAMMAR_IMPORT=true — refused to avoid ' +
        'running against the wrong database by accident. Set the variable deliberately before ' +
        'running npm run grammar:import.',
    );
  }

  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    throw new Error(
      `DATABASE_URL is not a valid connection URL — refusing to proceed.`,
    );
  }

  if (FORBIDDEN_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    throw new Error(
      `Refusing to run the grammar import against host "${host}" — it looks like a Neon (production) database. This script is local-only.`,
    );
  }

  const localHostPatterns = [
    /^localhost$/i,
    /^127\.0\.0\.1$/,
    /^0\.0\.0\.0$/,
    /^::1$/,
    /^postgres$/i,
    /^db$/i,
  ];
  if (!localHostPatterns.some((pattern) => pattern.test(host))) {
    throw new Error(
      `Refusing to run the grammar import against host "${host}" — it does not look like a local database. ` +
        `This script only accepts localhost-style hosts. This script is local-only.`,
    );
  }
}

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
  const planByCode = new Map(plan.map((p) => [p.ruleCode, p]));

  await prisma.$transaction(async (tx) => {
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
  });
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — refusing to proceed.');
  }
  assertNotProductionDatabase(databaseUrl);
  // eslint-disable-next-line no-console
  console.log(`[grammar:import] Target DB: ${redactDatabaseUrl(databaseUrl)}`);

  const prisma = new PrismaClient();
  try {
    await importRules(prisma);
    const count = await prisma.grammarRule.count();
    // eslint-disable-next-line no-console
    console.log(`Grammar MVP import complete. GrammarRule count: ${count}`);
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
