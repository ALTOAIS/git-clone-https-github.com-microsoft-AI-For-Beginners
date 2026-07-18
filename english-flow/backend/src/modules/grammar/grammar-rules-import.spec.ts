import type { PrismaClient } from '@prisma/client';
import {
  assertNotProductionDatabase,
  importRules,
} from '../../../prisma/import-grammar-rules';

function createMockPrisma() {
  const rules = new Map<string, any>();
  const examplesByRuleId = new Map<string, any[]>();
  let nextId = 1;

  const grammarRule = {
    findUnique: jest.fn(
      async ({ where: { ruleCode } }: any) => rules.get(ruleCode) ?? null,
    ),
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
  prisma.$transaction = jest.fn(async (cb: any) => cb(prisma));

  return { prisma: prisma as unknown as PrismaClient, rules, examplesByRuleId };
}

describe('importRules — idempotent rerun', () => {
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

describe('assertNotProductionDatabase', () => {
  const ALLOWED = { ALLOW_GRAMMAR_IMPORT: 'true' };

  it('accepts a localhost DATABASE_URL with explicit ALLOW_GRAMMAR_IMPORT=true', () => {
    expect(() =>
      assertNotProductionDatabase(
        'postgresql://ef:ef_password@localhost:5432/english_flow_test',
        ALLOWED,
      ),
    ).not.toThrow();
  });

  it('accepts a 127.0.0.1 DATABASE_URL with explicit ALLOW_GRAMMAR_IMPORT=true', () => {
    expect(() =>
      assertNotProductionDatabase(
        'postgresql://ef:ef_password@127.0.0.1:5432/english_flow_test',
        ALLOWED,
      ),
    ).not.toThrow();
  });

  it('rejects a Neon-looking host even with ALLOW_GRAMMAR_IMPORT=true', () => {
    expect(() =>
      assertNotProductionDatabase(
        'postgresql://user:pass@ep-cool-thing-12345.us-east-2.aws.neon.tech/dbname?sslmode=require',
        ALLOWED,
      ),
    ).toThrow(/Neon/);
  });

  it('rejects a non-local, non-Neon host as unrecognized', () => {
    expect(() =>
      assertNotProductionDatabase(
        'postgresql://user:pass@some-remote-host.example.com:5432/dbname',
        ALLOWED,
      ),
    ).toThrow(/does not look like a local database/);
  });

  it('rejects when NODE_ENV=production regardless of host or ALLOW_GRAMMAR_IMPORT', () => {
    expect(() =>
      assertNotProductionDatabase(
        'postgresql://ef:ef_password@localhost:5432/english_flow_test',
        { ...ALLOWED, NODE_ENV: 'production' },
      ),
    ).toThrow(/NODE_ENV=production/);
  });

  it('rejects a local host without explicit ALLOW_GRAMMAR_IMPORT=true', () => {
    expect(() =>
      assertNotProductionDatabase(
        'postgresql://ef:ef_password@localhost:5432/english_flow_test',
        {},
      ),
    ).toThrow(/ALLOW_GRAMMAR_IMPORT/);
    expect(() =>
      assertNotProductionDatabase(
        'postgresql://ef:ef_password@localhost:5432/english_flow_test',
        { ALLOW_GRAMMAR_IMPORT: 'false' },
      ),
    ).toThrow(/ALLOW_GRAMMAR_IMPORT/);
  });

  it('rejects an invalid DATABASE_URL', () => {
    expect(() => assertNotProductionDatabase('not-a-url', ALLOWED)).toThrow(
      /not a valid connection URL/,
    );
  });
});
