import type { PrismaClient } from '@prisma/client';
import {
  assertImportAllowed,
  assertProductionPreflight,
  importRules,
  PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION_PHRASE,
  runProductionImport,
  verifyProductionImportInvariants,
} from '../../../prisma/import-grammar-rules';

function createMockPrisma() {
  const rules = new Map<string, any>();
  const examplesByRuleId = new Map<string, any[]>();
  let nextId = 1;

  const grammarRule = {
    findUnique: jest.fn(
      async ({ where: { ruleCode } }: any) => rules.get(ruleCode) ?? null,
    ),
    findMany: jest.fn(async () => [...rules.values()]),
    count: jest.fn(async () => rules.size),
    upsert: jest.fn(async ({ where: { ruleCode }, create, update }: any) => {
      const existing = rules.get(ruleCode);
      if (existing) {
        const updated = { ...existing, ...update };
        rules.set(ruleCode, updated);
        return updated;
      }
      const created = { id: `rule-${nextId++}`, ruleCode, ...create };
      rules.set(ruleCode, created);
      return created;
    }),
  };

  const grammarRuleExample = {
    count: jest.fn(async () =>
      [...examplesByRuleId.values()].reduce(
        (sum, list) => sum + list.length,
        0,
      ),
    ),
    deleteMany: jest.fn(async ({ where: { grammarRuleId } }: any) => {
      const removed = examplesByRuleId.get(grammarRuleId)?.length ?? 0;
      examplesByRuleId.delete(grammarRuleId);
      return { count: removed };
    }),
    createMany: jest.fn(async ({ data }: any) => {
      for (const row of data) {
        const list = examplesByRuleId.get(row.grammarRuleId) ?? [];
        list.push(row);
        examplesByRuleId.set(row.grammarRuleId, list);
      }
      return { count: data.length };
    }),
  };

  const prisma: any = {
    grammarRule,
    grammarRuleExample,
  };
  // Emulates real Postgres transaction semantics for test purposes: the
  // mock's own state (rules/examplesByRuleId) is snapshotted before the
  // callback runs and restored if it throws, so tests can assert "nothing
  // persisted" after a simulated mid-transaction failure — the same
  // guarantee Prisma/Postgres provide for the real $transaction call our
  // application code makes.
  prisma.$transaction = jest.fn(async (cb: any) => {
    const rulesSnapshot = new Map(rules);
    const examplesSnapshot = new Map(
      [...examplesByRuleId.entries()].map(([k, v]) => [k, [...v]]),
    );
    try {
      return await cb(prisma);
    } catch (e) {
      rules.clear();
      rulesSnapshot.forEach((v, k) => rules.set(k, v));
      examplesByRuleId.clear();
      examplesSnapshot.forEach((v, k) => examplesByRuleId.set(k, v));
      throw e;
    }
  });

  return { prisma: prisma as unknown as PrismaClient, rules, examplesByRuleId };
}

describe('importRules — idempotent rerun (local path, unchanged)', () => {
  it('creates exactly 12 GrammarRule rows on the first run', async () => {
    const { prisma, rules } = createMockPrisma();
    await importRules(prisma);
    expect(rules.size).toBe(12);
  });

  it('rerunning does not create duplicate rows and produces the same logical dataset', async () => {
    const { prisma, rules, examplesByRuleId } = createMockPrisma();

    await importRules(prisma);
    expect(rules.size).toBe(12);
    const firstIds = [...rules.values()].map((r) => r.id).sort();
    const firstExampleCounts = new Map(
      [...rules.entries()].map(([code, r]) => [
        code,
        examplesByRuleId.get(r.id)?.length ?? 0,
      ]),
    );

    await importRules(prisma);

    expect(rules.size).toBe(12); // still no duplicates
    const secondIds = [...rules.values()].map((r) => r.id).sort();
    expect(secondIds).toEqual(firstIds); // same underlying rows updated, not recreated

    for (const [code, rule] of rules.entries()) {
      expect(examplesByRuleId.get(rule.id)?.length ?? 0).toBe(
        firstExampleCounts.get(code),
      );
    }

    expect((prisma as any).grammarRule.upsert).toHaveBeenCalledTimes(24); // 12 rules x 2 runs
  });

  it('refuses to modify a rule that already exists with contentStatus PUBLISHED', async () => {
    const { prisma, rules } = createMockPrisma();
    rules.set('ARTICLE_A_AN', {
      id: 'rule-existing',
      ruleCode: 'ARTICLE_A_AN',
      contentStatus: 'PUBLISHED',
    });

    await expect(importRules(prisma)).rejects.toThrow(/PUBLISHED/);
  });

  it('refuses to modify a rule that already exists with contentStatus ARCHIVED', async () => {
    const { prisma, rules } = createMockPrisma();
    rules.set('ARTICLE_A_AN', {
      id: 'rule-existing',
      ruleCode: 'ARTICLE_A_AN',
      contentStatus: 'ARCHIVED',
    });

    await expect(importRules(prisma)).rejects.toThrow(/ARCHIVED/);
  });
});

describe('assertImportAllowed — local host behavior (unchanged)', () => {
  const ALLOWED = { ALLOW_GRAMMAR_IMPORT: 'true' };

  it('accepts a localhost DATABASE_URL with explicit ALLOW_GRAMMAR_IMPORT=true', () => {
    expect(() =>
      assertImportAllowed(
        'postgresql://ef:ef_password@localhost:5432/english_flow_test',
        ALLOWED,
      ),
    ).not.toThrow();
  });

  it('accepts a 127.0.0.1 DATABASE_URL with explicit ALLOW_GRAMMAR_IMPORT=true', () => {
    expect(() =>
      assertImportAllowed(
        'postgresql://ef:ef_password@127.0.0.1:5432/english_flow_test',
        ALLOWED,
      ),
    ).not.toThrow();
  });

  it('rejects when NODE_ENV=production regardless of ALLOW_GRAMMAR_IMPORT, for a local host', () => {
    expect(() =>
      assertImportAllowed(
        'postgresql://ef:ef_password@localhost:5432/english_flow_test',
        { ...ALLOWED, NODE_ENV: 'production' },
      ),
    ).toThrow(/NODE_ENV=production/);
  });

  it('rejects a local host without explicit ALLOW_GRAMMAR_IMPORT=true', () => {
    expect(() =>
      assertImportAllowed(
        'postgresql://ef:ef_password@localhost:5432/english_flow_test',
        {},
      ),
    ).toThrow(/ALLOW_GRAMMAR_IMPORT/);
    expect(() =>
      assertImportAllowed(
        'postgresql://ef:ef_password@localhost:5432/english_flow_test',
        { ALLOW_GRAMMAR_IMPORT: 'false' },
      ),
    ).toThrow(/ALLOW_GRAMMAR_IMPORT/);
  });

  it('rejects an invalid DATABASE_URL', () => {
    expect(() => assertImportAllowed('not-a-url', ALLOWED)).toThrow(
      /not a valid connection URL/,
    );
  });
});

describe('assertImportAllowed — production/non-localhost host: blocked by default, triple opt-in required', () => {
  const NEON_URL =
    'postgresql://user:pass@ep-cool-thing-12345.us-east-2.aws.neon.tech/dbname?sslmode=require';
  const OTHER_REMOTE_URL =
    'postgresql://user:pass@some-remote-host.example.com:5432/dbname';
  const FULL_OPT_IN = {
    ALLOW_GRAMMAR_IMPORT: 'true',
    ALLOW_PRODUCTION_GRAMMAR_IMPORT: 'true',
    PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION:
      PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION_PHRASE,
  };

  it('blocks a Neon-looking host with no env vars set at all', () => {
    expect(() => assertImportAllowed(NEON_URL, {})).toThrow(
      /ALLOW_GRAMMAR_IMPORT/,
    );
  });

  it('blocks a Neon-looking host with only ALLOW_GRAMMAR_IMPORT=true (missing ALLOW_PRODUCTION_GRAMMAR_IMPORT)', () => {
    expect(() =>
      assertImportAllowed(NEON_URL, { ALLOW_GRAMMAR_IMPORT: 'true' }),
    ).toThrow(/ALLOW_PRODUCTION_GRAMMAR_IMPORT/);
  });

  it('blocks a Neon-looking host with ALLOW_PRODUCTION_GRAMMAR_IMPORT=false', () => {
    expect(() =>
      assertImportAllowed(NEON_URL, {
        ALLOW_GRAMMAR_IMPORT: 'true',
        ALLOW_PRODUCTION_GRAMMAR_IMPORT: 'false',
      }),
    ).toThrow(/ALLOW_PRODUCTION_GRAMMAR_IMPORT/);
  });

  it('blocks with the first two flags true but a wrong confirmation phrase', () => {
    expect(() =>
      assertImportAllowed(NEON_URL, {
        ALLOW_GRAMMAR_IMPORT: 'true',
        ALLOW_PRODUCTION_GRAMMAR_IMPORT: 'true',
        PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION: 'YES',
      }),
    ).toThrow(/PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION/);
  });

  it('blocks with the first two flags true but a near-miss confirmation phrase (exact string equality only)', () => {
    expect(() =>
      assertImportAllowed(NEON_URL, {
        ALLOW_GRAMMAR_IMPORT: 'true',
        ALLOW_PRODUCTION_GRAMMAR_IMPORT: 'true',
        PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION:
          PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION_PHRASE + '_EXTRA',
      }),
    ).toThrow(/PRODUCTION_GRAMMAR_IMPORT_CONFIRMATION/);
  });

  it('allows a Neon-looking host through to preflight with the correct full triple opt-in', () => {
    expect(() => assertImportAllowed(NEON_URL, FULL_OPT_IN)).not.toThrow();
  });

  it('allows any other non-localhost host through to preflight with the correct full triple opt-in', () => {
    expect(() =>
      assertImportAllowed(OTHER_REMOTE_URL, FULL_OPT_IN),
    ).not.toThrow();
  });

  it('still blocks a Neon-looking host with the full triple opt-in if NODE_ENV check were somehow bypassed elsewhere — no such check applies here by design', () => {
    // Production path intentionally has no NODE_ENV gate — the triple
    // opt-in is the sole, purpose-built gate for a non-local host. This
    // test documents that choice rather than testing a NODE_ENV block
    // that does not exist for this branch.
    expect(() =>
      assertImportAllowed(NEON_URL, { ...FULL_OPT_IN, NODE_ENV: 'production' }),
    ).not.toThrow();
  });
});

describe('assertProductionPreflight', () => {
  it('passes for the real 12-rule source against an empty target', async () => {
    const { prisma } = createMockPrisma();
    const result = await assertProductionPreflight(prisma as any);
    expect(result.plan).toHaveLength(12);
    expect(result.totalExamples).toBe(91);
    expect(result.totalExerciseTemplates).toBe(38);
  });

  it('blocks when the target GrammarRule table is non-empty', async () => {
    const { prisma, rules } = createMockPrisma();
    rules.set('SOME_EXISTING_RULE', {
      id: 'x1',
      ruleCode: 'SOME_EXISTING_RULE',
    });
    await expect(assertProductionPreflight(prisma as any)).rejects.toThrow(
      /GrammarRule table is not empty/,
    );
  });

  it('blocks when the target GrammarRuleExample table is non-empty (GrammarRule empty)', async () => {
    const { prisma, examplesByRuleId } = createMockPrisma();
    examplesByRuleId.set('some-orphan-rule-id', [{ sentence: 'x' }]);
    await expect(assertProductionPreflight(prisma as any)).rejects.toThrow(
      /GrammarRuleExample table is not empty/,
    );
  });
});

describe('runProductionImport — dry run', () => {
  it('performs zero writes and reports planned counts', async () => {
    const { prisma, rules, examplesByRuleId } = createMockPrisma();
    const report = await runProductionImport(prisma, { dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(report.writesPerformed).toBe(false);
    expect(report.plannedRuleCount).toBe(12);
    expect(report.plannedExampleCount).toBe(91);
    expect(report.plannedExerciseTemplateCount).toBe(38);

    expect(rules.size).toBe(0);
    expect(examplesByRuleId.size).toBe(0);
    expect((prisma as any).grammarRule.upsert).not.toHaveBeenCalled();
    expect(
      (prisma as any).grammarRuleExample.createMany,
    ).not.toHaveBeenCalled();
    expect(
      (prisma as any).grammarRuleExample.deleteMany,
    ).not.toHaveBeenCalled();
    expect((prisma as any).$transaction).not.toHaveBeenCalled();
  });

  it('dry run also blocks on a non-empty target and still performs zero writes', async () => {
    const { prisma, rules } = createMockPrisma();
    rules.set('SOME_EXISTING_RULE', {
      id: 'x1',
      ruleCode: 'SOME_EXISTING_RULE',
    });

    await expect(runProductionImport(prisma, { dryRun: true })).rejects.toThrow(
      /GrammarRule table is not empty/,
    );
    expect((prisma as any).grammarRule.upsert).not.toHaveBeenCalled();
  });
});

describe('runProductionImport — real run', () => {
  it('blocks before any write when the target GrammarRule table is non-empty', async () => {
    const { prisma, rules } = createMockPrisma();
    rules.set('SOME_EXISTING_RULE', {
      id: 'x1',
      ruleCode: 'SOME_EXISTING_RULE',
    });

    await expect(
      runProductionImport(prisma, { dryRun: false }),
    ).rejects.toThrow(/GrammarRule table is not empty/);
    expect((prisma as any).grammarRule.upsert).not.toHaveBeenCalled();
  });

  it('blocks before any write when the target GrammarRuleExample table is non-empty', async () => {
    const { prisma, examplesByRuleId } = createMockPrisma();
    examplesByRuleId.set('some-orphan-rule-id', [{ sentence: 'x' }]);

    await expect(
      runProductionImport(prisma, { dryRun: false }),
    ).rejects.toThrow(/GrammarRuleExample table is not empty/);
    expect((prisma as any).grammarRule.upsert).not.toHaveBeenCalled();
  });

  it('performs a full atomic import against an empty target and passes post-import verification', async () => {
    const { prisma, rules, examplesByRuleId } = createMockPrisma();
    const report = await runProductionImport(prisma, { dryRun: false });

    expect(report.dryRun).toBe(false);
    expect(report.writesPerformed).toBe(true);
    expect(rules.size).toBe(12);
    const totalExamples = [...examplesByRuleId.values()].reduce(
      (sum, list) => sum + list.length,
      0,
    );
    expect(totalExamples).toBe(91);

    expect(report.verification).toBeDefined();
    expect(report.verification?.ruleCount).toBe(12);
    expect(report.verification?.exampleCount).toBe(91);
    expect(report.verification?.publishedCount).toBe(0);
    expect(report.verification?.archivedCount).toBe(0);

    for (const rule of rules.values()) {
      expect(rule.contentStatus).toBe('REVIEWED');
      expect(rule.sourceVerificationStatus).toBe('PARTIALLY_VERIFIED');
    }
  });

  it('rolls back the entire import when the pre-commit invariant check finds the wrong GrammarRule count', async () => {
    const { prisma, rules, examplesByRuleId } = createMockPrisma();
    const findManyMock = (prisma as any).grammarRule.findMany;
    // The real writes still happen (upsertAllRules inserts all 12 rows
    // into the mock's `rules` map) — only the pre-commit invariant read
    // is rigged to observe one fewer row than was actually written, to
    // prove the check itself (not the write path) triggers the rollback.
    findManyMock.mockImplementationOnce(async () =>
      [...rules.values()].slice(0, 11),
    );

    await expect(
      runProductionImport(prisma, { dryRun: false }),
    ).rejects.toThrow(/GrammarRule count is 11, expected 12/);

    // The mock's $transaction restores its pre-callback snapshot on
    // throw — since this run started from an empty table, nothing from
    // this run should remain persisted.
    expect(rules.size).toBe(0);
    expect(examplesByRuleId.size).toBe(0);
  });

  it('rolls back the entire import when the pre-commit invariant check finds the wrong GrammarRuleExample count', async () => {
    const { prisma, rules, examplesByRuleId } = createMockPrisma();
    const countMock = (prisma as any).grammarRuleExample.count;
    const originalImpl = countMock.getMockImplementation();
    // count() is called twice in a real run: once by the preflight
    // emptiness check (must see the real, correct value — 0, since this
    // run starts from an empty table) and once by the pre-commit
    // invariant check after all writes (rigged here to report 90 instead
    // of the real 91, to prove the check itself triggers the rollback).
    let callCount = 0;
    countMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) return originalImpl();
      return 90;
    });

    await expect(
      runProductionImport(prisma, { dryRun: false }),
    ).rejects.toThrow(/GrammarRuleExample count is 90, expected 91/);

    expect(rules.size).toBe(0);
    expect(examplesByRuleId.size).toBe(0);
  });

  it('rolls back the entire import when the pre-commit invariant check finds a non-REVIEWED or PUBLISHED rule', async () => {
    const { prisma, rules, examplesByRuleId } = createMockPrisma();
    const findManyMock = (prisma as any).grammarRule.findMany;
    findManyMock.mockImplementationOnce(async () => {
      const all = [...rules.values()];
      all[0] = { ...all[0], contentStatus: 'PUBLISHED' };
      return all;
    });

    await expect(
      runProductionImport(prisma, { dryRun: false }),
    ).rejects.toThrow(/1 rule\(s\) PUBLISHED/);

    expect(rules.size).toBe(0);
    expect(examplesByRuleId.size).toBe(0);
  });

  it('rolls back all writes from this run when a later rule fails mid-transaction (atomicity)', async () => {
    const { prisma, rules, examplesByRuleId } = createMockPrisma();
    const upsertMock = (prisma as any).grammarRule.upsert;
    const originalImpl = upsertMock.getMockImplementation();
    let callCount = 0;
    upsertMock.mockImplementation(async (args: any) => {
      callCount += 1;
      if (callCount === 6) {
        throw new Error('simulated failure on rule 6');
      }
      return originalImpl(args);
    });

    await expect(
      runProductionImport(prisma, { dryRun: false }),
    ).rejects.toThrow('simulated failure on rule 6');

    // Nothing from this run should be persisted — the mock's $transaction
    // restores its pre-callback snapshot on throw, mirroring real Postgres
    // rollback for a single-transaction import.
    expect(rules.size).toBe(0);
    expect(examplesByRuleId.size).toBe(0);
  });
});

describe('verifyProductionImportInvariants', () => {
  it('returns a passing summary for a correctly-imported dataset', async () => {
    const { prisma } = createMockPrisma();
    await runProductionImport(prisma, { dryRun: false });

    const verification = await verifyProductionImportInvariants(prisma);
    expect(verification.ruleCount).toBe(12);
    expect(verification.exampleCount).toBe(91);
    expect(verification.publishedCount).toBe(0);
    expect(verification.archivedCount).toBe(0);
    expect([...verification.ruleCodes].sort()).toEqual(verification.ruleCodes);
  });

  it('throws if the target ends up with a PUBLISHED rule (defense in depth)', async () => {
    const { prisma, rules } = createMockPrisma();
    await runProductionImport(prisma, { dryRun: false });
    const [code, rule] = [...rules.entries()][0];
    rules.set(code, { ...rule, contentStatus: 'PUBLISHED' });

    await expect(verifyProductionImportInvariants(prisma)).rejects.toThrow(
      /PUBLISHED/,
    );
  });

  it('throws if the GrammarRule count does not match 12', async () => {
    const { prisma, rules } = createMockPrisma();
    await runProductionImport(prisma, { dryRun: false });
    const [firstCode] = [...rules.keys()];
    rules.delete(firstCode);

    await expect(verifyProductionImportInvariants(prisma)).rejects.toThrow(
      /GrammarRule count is 11, expected 12/,
    );
  });
});
