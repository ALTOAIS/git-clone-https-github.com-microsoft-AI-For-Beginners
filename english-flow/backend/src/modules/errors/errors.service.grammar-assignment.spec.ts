import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ErrorsService } from './errors.service';

/**
 * Real end-to-end proof of the Grammar MVP automatic-assignment gate
 * (grammar-mvp-v1 activation, LOCAL ONLY, fail-closed). Unlike
 * errors.service.grammar-shadow.spec.ts (which mocks the entire
 * resolver-shadow module to isolate ErrorsService's wiring/failure
 * isolation), this file uses the REAL, unmodified resolver and
 * resolver-shadow layers against real originalText/correctedText fixtures,
 * so these tests prove actual production gate behavior, not just wiring.
 */

const fakeUsersService = {
  localDate: () => '2026-01-01',
} as unknown as UsersService;

// Mirrors current production: 8 PUBLISHED + VERIFIED_DIRECTLY rules. Fake,
// stable ids only — no production DB access anywhere in this file.
const PUBLISHED_ROWS = [
  { id: 'gr-article-a-an', ruleCode: 'ARTICLE_A_AN' },
  { id: 'gr-article-the-specific', ruleCode: 'ARTICLE_THE_SPECIFIC' },
  { id: 'gr-article-zero-general', ruleCode: 'ARTICLE_ZERO_GENERAL' },
  {
    id: 'gr-present-simple-third-person',
    ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
  },
  { id: 'gr-past-simple-form', ruleCode: 'PAST_SIMPLE_FORM' },
  {
    id: 'gr-past-simple-vs-present-perfect',
    ruleCode: 'PAST_SIMPLE_VS_PRESENT_PERFECT',
  },
  { id: 'gr-modal-base-verb', ruleCode: 'MODAL_BASE_VERB' },
  { id: 'gr-do-does-did', ruleCode: 'DO_DOES_DID_QUESTIONS_NEGATIVES' },
];
// The 4 REVIEWED/PARTIALLY_VERIFIED hidden rules are deliberately NOT in
// PUBLISHED_ROWS: BASIC_PREPOSITION_PATTERNS, BASIC_WORD_ORDER,
// COUNTABLE_UNCOUNTABLE, SINGULAR_PLURAL_ARTICLE_AGREEMENT.

function existingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'existing-1',
    status: 'NEW',
    practiceStatus: 'NEW',
    microCategory: null,
    grammarRuleId: null,
    grammarResolverVersion: null,
    ...overrides,
  };
}

function makePrisma(
  options: {
    publishedRows?: { id: string; ruleCode: string }[];
    findManyImpl?: () => Promise<unknown>;
    existingRecord?: Record<string, unknown> | null;
  } = {},
) {
  const store: any[] = [];
  const prisma = {
    errorRecord: {
      findFirst: jest.fn().mockResolvedValue(options.existingRecord ?? null),
      create: jest.fn().mockImplementation(({ data }: { data: any }) => {
        const rec = { id: `e${store.length + 1}`, occurrenceCount: 1, ...data };
        store.push(rec);
        return Promise.resolve(rec);
      }),
      update: jest.fn().mockImplementation(({ data }: { data: any }) => {
        const rec = {
          ...(options.existingRecord ?? { id: 'existing-1' }),
          ...data,
        };
        store.push(rec);
        return Promise.resolve(rec);
      }),
    },
    grammarRule: {
      findMany: options.findManyImpl
        ? jest.fn().mockImplementation(options.findManyImpl)
        : jest.fn().mockResolvedValue(options.publishedRows ?? PUBLISHED_ROWS),
    },
  } as unknown as PrismaService;
  return { prisma, store };
}

const MODAL_HIGH_PUBLISHED = {
  original: 'She can works from home.',
  corrected: 'She can work from home.',
  explanation: '',
  errorType: 'VERB_FORM' as const,
};

describe('ErrorsService.recordErrors — Grammar MVP automatic-assignment gate (real resolver, real resolver-shadow)', () => {
  it('A. HIGH + unambiguous + PUBLISHED -> grammarRuleId persisted, grammarResolverVersion = grammar-mvp-v1', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [MODAL_HIGH_PUBLISHED], 'review');

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBe('gr-modal-base-verb');
    expect(store[0].grammarResolverVersion).toBe('grammar-mvp-v1');
  });

  it('B. HIGH + unambiguous + REVIEWED/unpublished rule -> no assignment', async () => {
    const { prisma, store } = makePrisma(); // BASIC_PREPOSITION_PATTERNS is hidden, not in PUBLISHED_ROWS
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        {
          original: 'This depends at the outcome.',
          corrected: 'This depends on the outcome.',
          explanation: '',
          errorType: 'OTHER' as const,
        },
      ],
      'review',
    );

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBeUndefined();
    expect(store[0].grammarResolverVersion).toBeUndefined();
  });

  it('C. MEDIUM confidence -> no assignment, even though the ruleCode is published', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    // PAST_SIMPLE_FORM resolves MEDIUM for this pair (verified empirically
    // against the real resolver) and IS one of the 8 published rules —
    // proving MEDIUM alone blocks assignment regardless of publish status.
    await service.recordErrors(
      'u1',
      [
        {
          original: 'We submit the report last week.',
          corrected: 'We submitted the report last week.',
          explanation: '',
          errorType: 'OTHER' as const,
        },
      ],
      'review',
    );

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBeUndefined();
    expect(store[0].grammarResolverVersion).toBeUndefined();
  });

  it('D. LOW confidence -> no assignment', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        {
          original: 'We need much evidences.',
          corrected: 'We need a lot of evidence.',
          explanation: '',
          errorType: 'OTHER' as const,
        },
      ],
      'review',
    );

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBeUndefined();
    expect(store[0].grammarResolverVersion).toBeUndefined();
  });

  it('E. ambiguous result -> no assignment', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        {
          original: 'I read report. Report was long.',
          corrected: 'I read a report. The report was long.',
          explanation: '',
          errorType: 'ARTICLE' as const,
        },
      ],
      'review',
    );

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBeUndefined();
    expect(store[0].grammarResolverVersion).toBeUndefined();
  });

  it('F. null ruleCode (no structural match) -> no assignment', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        {
          original: 'The report is on the table.',
          corrected: 'The report is over there on the desk today.',
          explanation: '',
          errorType: 'OTHER' as const,
        },
      ],
      'review',
    );

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBeUndefined();
    expect(store[0].grammarResolverVersion).toBeUndefined();
  });

  it('H. publication lookup fails -> ErrorRecord still created, no assignment, one lookup only', async () => {
    const findManyMock = jest
      .fn()
      .mockRejectedValue(new Error('db unreachable'));
    const { prisma, store } = makePrisma({ findManyImpl: findManyMock });
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [MODAL_HIGH_PUBLISHED], 'review');

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBeUndefined();
    expect(store[0].grammarResolverVersion).toBeUndefined();
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  it('I. 10 errors in one recordErrors() call -> at most one GrammarRule publication lookup, and every eligible one is still assigned', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    const tenErrors = Array.from({ length: 10 }, () => MODAL_HIGH_PUBLISHED);

    await service.recordErrors('u1', tenErrors, 'review');

    expect(store).toHaveLength(10);
    const findManyMock = (prisma as any).grammarRule.findMany as jest.Mock;
    expect(findManyMock).toHaveBeenCalledTimes(1);
    for (const rec of store) {
      expect(rec.grammarRuleId).toBe('gr-modal-base-verb');
      expect(rec.grammarResolverVersion).toBe('grammar-mvp-v1');
    }
  });

  it('J. a misleading legacy MicroCategory cannot force or change the assignment', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    // classifyMicroCategory('She can works from home.', 'She can work from
    // home.') returns THIRD_PERSON_SINGULAR — a genuinely misleading
    // legacy hint (the real issue is a modal + base verb, not present-
    // tense third person). The resolver treats existingMicroCategory as a
    // weak hint only and still resolves MODAL_BASE_VERB; the assignment
    // must follow the resolver, never the legacy category, and must never
    // become PRESENT_SIMPLE_THIRD_PERSON (also published) just because the
    // legacy label mentions "third person".
    await service.recordErrors('u1', [MODAL_HIGH_PUBLISHED], 'review');

    expect(store).toHaveLength(1);
    expect(store[0].microCategory).toBe('THIRD_PERSON_SINGULAR');
    expect(store[0].grammarRuleId).toBe('gr-modal-base-verb');
    expect(store[0].grammarRuleId).not.toBe('gr-present-simple-third-person');
  });

  it('K. existing ErrorRecord with null grammarRuleId + eligible result -> assignment is safely added on update', async () => {
    const { prisma, store } = makePrisma({
      existingRecord: existingRecord({ grammarRuleId: null }),
    });
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [MODAL_HIGH_PUBLISHED], 'review');

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBe('gr-modal-base-verb');
    expect(store[0].grammarResolverVersion).toBe('grammar-mvp-v1');
  });

  it('L. existing ErrorRecord already assigned -> assignment is preserved, not silently overwritten', async () => {
    const { prisma, store } = makePrisma({
      existingRecord: existingRecord({
        grammarRuleId: 'gr-already-assigned',
        grammarResolverVersion: 'grammar-mvp-v0-legacy',
      }),
    });
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [MODAL_HIGH_PUBLISHED], 'review');

    expect(store).toHaveLength(1);
    const updateMock = (prisma as any).errorRecord.update as jest.Mock;
    expect(updateMock).toHaveBeenCalledTimes(1);
    const dataArg = updateMock.mock.calls[0][0].data;
    // The update payload itself must not even attempt to touch these
    // fields — proving this is not merely "wrote the same value again".
    expect(dataArg).not.toHaveProperty('grammarRuleId');
    expect(dataArg).not.toHaveProperty('grammarResolverVersion');
    // The pre-existing assignment is therefore untouched in the resulting record.
    expect(store[0].grammarRuleId).toBe('gr-already-assigned');
    expect(store[0].grammarResolverVersion).toBe('grammar-mvp-v0-legacy');
  });

  it('M. a HIGH-confidence, unambiguous result for a hidden/unpublished rule can never be assigned', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        {
          original: 'This depends at the outcome.',
          corrected: 'This depends on the outcome.',
          explanation: '',
          errorType: 'OTHER' as const,
        },
      ],
      'review',
    );

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBeUndefined();
  });

  it('N. grammarResolverVersion is written ONLY when grammarRuleId is actually assigned, never independently', async () => {
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        MODAL_HIGH_PUBLISHED, // eligible -> both fields written
        {
          original: 'We submit the report last week.',
          corrected: 'We submitted the report last week.',
          explanation: '',
          errorType: 'OTHER' as const,
        }, // MEDIUM -> neither field written
      ],
      'review',
    );

    expect(store).toHaveLength(2);
    expect(store[0].grammarRuleId).toBeDefined();
    expect(store[0].grammarResolverVersion).toBeDefined();
    expect(store[1].grammarRuleId).toBeUndefined();
    expect(store[1].grammarResolverVersion).toBeUndefined();
    for (const rec of store) {
      if (rec.grammarResolverVersion !== undefined) {
        expect(rec.grammarRuleId).toBeDefined();
      }
    }
  });
});

describe('ErrorsService.recordErrors — G. real resolver exception isolation (resolver core mocked, resolver-shadow real)', () => {
  afterEach(() => {
    jest.dontMock('../grammar/resolver/resolver');
    jest.resetModules();
  });

  it('resolver throws -> ErrorRecord is still created normally, no assignment', async () => {
    jest.resetModules();
    jest.doMock('../grammar/resolver/resolver', () => ({
      resolveGrammarRule: () => {
        throw new Error('simulated resolver crash');
      },
    }));

    // Re-required after mocking so this fresh module graph (errors.service
    // -> resolver-shadow -> resolver) picks up the mocked resolver core,
    // exactly like a real resolver bug would. The resolver-shadow layer
    // itself is NOT mocked — this proves its real exception handling.
    const {
      ErrorsService: IsolatedErrorsService,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('./errors.service');

    const { prisma, store } = makePrisma();
    const service = new IsolatedErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [MODAL_HIGH_PUBLISHED], 'review');

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBeUndefined();
    expect(store[0].grammarResolverVersion).toBeUndefined();
  });
});
