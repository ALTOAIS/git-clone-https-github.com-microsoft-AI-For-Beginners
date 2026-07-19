import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const runGrammarResolverShadowMock = jest.fn();
const isAssignmentCandidateMock = jest.fn();
const resolveAssignableGrammarRuleIdMock = jest.fn();

jest.mock('../grammar/resolver/resolver-shadow', () => ({
  runGrammarResolverShadow: (...args: unknown[]) =>
    runGrammarResolverShadowMock(...args),
  isAssignmentCandidate: (...args: unknown[]) =>
    isAssignmentCandidateMock(...args),
  resolveAssignableGrammarRuleId: (...args: unknown[]) =>
    resolveAssignableGrammarRuleIdMock(...args),
}));

// Imported after the mock so ErrorsService picks up the mocked module.
import { ErrorsService } from './errors.service';

const fakeUsersService = {
  localDate: () => '2026-01-01',
} as unknown as UsersService;

function makePrisma(overrides: Record<string, unknown> = {}) {
  const store: any[] = [];
  const prisma = {
    errorRecord: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: { data: any }) => {
        const rec = { id: `e${store.length + 1}`, occurrenceCount: 1, ...data };
        store.push(rec);
        return Promise.resolve(rec);
      }),
      update: jest.fn(),
    },
    grammarRule: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'gr-modal-base-verb', ruleCode: 'MODAL_BASE_VERB' },
        { id: 'gr-article-a-an', ruleCode: 'ARTICLE_A_AN' },
      ]),
    },
    ...overrides,
  } as unknown as PrismaService;
  return { prisma, store };
}

const SAMPLE_ERROR = {
  original: 'She can works from home.',
  corrected: 'She can work from home.',
  explanation: 'modal + base form',
  errorType: 'VERB_FORM' as const,
};

// NOTE: This file mocks the entire `resolver-shadow` module (including
// `resolveAssignableGrammarRuleId`) to isolate ErrorsService's WIRING,
// failure-isolation, and no-N+1 behavior from the resolver's real
// eligibility semantics. `resolveAssignableGrammarRuleIdMock` defaults to
// `null` (no assignment) below, so — unless a test explicitly overrides it
// — these tests exercise the "no assignment resolved" path regardless of
// what `isAssignmentCandidateMock` returns. For proof of the REAL
// end-to-end automatic-assignment gate (HIGH+unambiguous+PUBLISHED persists,
// every other outcome does not), see
// errors.service.grammar-assignment.spec.ts, which uses the real,
// unmocked resolver + resolver-shadow.
describe('ErrorsService.recordErrors — Grammar resolver shadow-mode: wiring, failure isolation, no-N+1', () => {
  beforeEach(() => {
    runGrammarResolverShadowMock.mockReset();
    isAssignmentCandidateMock.mockReset();
    isAssignmentCandidateMock.mockReturnValue(false);
    resolveAssignableGrammarRuleIdMock.mockReset();
    resolveAssignableGrammarRuleIdMock.mockReturnValue(null);
  });

  it('E. resolver throws synchronously -> ErrorRecord is still created normally', async () => {
    runGrammarResolverShadowMock.mockImplementation(() => {
      throw new Error('simulated resolver crash');
    });
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    const results = await service.recordErrors('u1', [SAMPLE_ERROR], 'review');

    expect(results).toHaveLength(1);
    expect(store).toHaveLength(1);
    expect(store[0].originalText).toBe(SAMPLE_ERROR.original);
    expect(store[0].correctedText).toBe(SAMPLE_ERROR.corrected);
  });

  it('D. resolver returns null -> ErrorRecord is still created normally', async () => {
    runGrammarResolverShadowMock.mockReturnValue(null);
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [SAMPLE_ERROR], 'review');

    expect(store).toHaveLength(1);
  });

  it('C. resolver returns an ambiguous result -> ErrorRecord is still created normally', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: null,
      confidence: 'LOW',
      ambiguous: true,
      candidateCount: 2,
    });
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
  });

  it('isAssignmentCandidate=true but resolveAssignableGrammarRuleId=null -> nothing is written (persistence is gated on the id resolution, not on isAssignmentCandidate alone)', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    isAssignmentCandidateMock.mockReturnValue(true);
    // resolveAssignableGrammarRuleIdMock keeps its beforeEach default: null.
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [SAMPLE_ERROR], 'review');

    expect(store).toHaveLength(1);
    const created = store[0];
    expect(created).not.toHaveProperty('grammarRuleId');
    expect(created).not.toHaveProperty('grammarResolverVersion');
    expect(created.grammarRuleId).toBeUndefined();
    expect(created.grammarResolverVersion).toBeUndefined();
  });

  it('wiring: when resolveAssignableGrammarRuleId resolves an id, create() persists grammarRuleId + grammarResolverVersion (resolverVersion from the observation)', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    isAssignmentCandidateMock.mockReturnValue(true);
    resolveAssignableGrammarRuleIdMock.mockReturnValue('gr-modal-base-verb');
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [SAMPLE_ERROR], 'review');

    expect(store).toHaveLength(1);
    expect(store[0].grammarRuleId).toBe('gr-modal-base-verb');
    expect(store[0].grammarResolverVersion).toBe('grammar-mvp-v1');
  });

  it('H/I. grammarRuleId and grammarResolverVersion are absent from every create() call, regardless of resolver outcome', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    const { prisma } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [SAMPLE_ERROR], 'review');

    const createMock = (prisma as any).errorRecord.create as jest.Mock;
    expect(createMock).toHaveBeenCalledTimes(1);
    const dataArg = createMock.mock.calls[0][0].data;
    expect(dataArg).not.toHaveProperty('grammarRuleId');
    expect(dataArg).not.toHaveProperty('grammarResolverVersion');
  });

  it('existing microCategory and errorType behavior is unaffected by the shadow call', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        {
          original: 'He work here.',
          corrected: 'He works here.',
          explanation: '3-е лицо',
          errorType: 'VERB_FORM' as const,
        },
      ],
      'review',
    );

    expect(store[0].errorType).toBe('VERB_FORM');
    // classifyMicroCategory is the real, unmocked function here.
    expect(store[0].microCategory).toBe('THIRD_PERSON_SINGULAR');
  });

  it('shadow call receives exactly the documented resolver contract fields (originalText, correctedText, existingMicroCategory)', async () => {
    runGrammarResolverShadowMock.mockReturnValue(null);
    const { prisma } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        {
          original: 'He work here.',
          corrected: 'He works here.',
          explanation: '',
          errorType: 'VERB_FORM' as const,
        },
      ],
      'review',
    );

    expect(runGrammarResolverShadowMock).toHaveBeenCalledWith({
      originalText: 'He work here.',
      correctedText: 'He works here.',
      existingMicroCategory: 'THIRD_PERSON_SINGULAR',
    });
  });

  it('G. eligibility check is given the live PUBLISHED ruleCode set from the DB, never a hardcoded list', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'BASIC_WORD_ORDER',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    const { prisma } = makePrisma({
      grammarRule: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ ruleCode: 'MODAL_BASE_VERB' }]),
      },
    });
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [SAMPLE_ERROR], 'review');

    expect(isAssignmentCandidateMock).toHaveBeenCalledTimes(1);
    const [, publishedSet] = isAssignmentCandidateMock.mock.calls[0];
    expect(publishedSet).toBeInstanceOf(Set);
    expect(Array.from(publishedSet as Set<string>)).toEqual([
      'MODAL_BASE_VERB',
    ]);
  });

  it('isAssignmentCandidate throwing does not block ErrorRecord creation', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    isAssignmentCandidateMock.mockImplementation(() => {
      throw new Error('eligibility check exploded');
    });
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [SAMPLE_ERROR], 'review');

    expect(store).toHaveLength(1);
  });

  it('a failed grammarRule.findMany (published-ruleCode lookup) does not block ErrorRecord creation', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    const { prisma, store } = makePrisma({
      grammarRule: {
        findMany: jest.fn().mockRejectedValue(new Error('db unreachable')),
      },
    });
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors('u1', [SAMPLE_ERROR], 'review');

    expect(store).toHaveLength(1);
  });

  it('no N+1: 10 errors in one recordErrors() call cause at most ONE publication-state DB lookup', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    const { prisma, store } = makePrisma();
    const service = new ErrorsService(prisma, fakeUsersService);

    const tenErrors = Array.from({ length: 10 }, (_, i) => ({
      original: `He work here number ${i}.`,
      corrected: `He works here number ${i}.`,
      explanation: '',
      errorType: 'VERB_FORM' as const,
    }));

    await service.recordErrors('u1', tenErrors, 'review');

    expect(store).toHaveLength(10);
    const findManyMock = (prisma as any).grammarRule.findMany as jest.Mock;
    expect(findManyMock).toHaveBeenCalledTimes(1);
    // The shadow observation itself must still run once per error.
    expect(runGrammarResolverShadowMock).toHaveBeenCalledTimes(10);
  });

  it('no retry storm: a failed publication lookup is attempted at most once per recordErrors() call, even with 10 errors, and blocks none of them', async () => {
    runGrammarResolverShadowMock.mockReturnValue({
      resolverVersion: 'grammar-mvp-v1',
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
    const findManyMock = jest
      .fn()
      .mockRejectedValue(new Error('db unreachable'));
    const { prisma, store } = makePrisma({
      grammarRule: { findMany: findManyMock },
    });
    const service = new ErrorsService(prisma, fakeUsersService);

    const tenErrors = Array.from({ length: 10 }, (_, i) => ({
      original: `He work here number ${i}.`,
      corrected: `He works here number ${i}.`,
      explanation: '',
      errorType: 'VERB_FORM' as const,
    }));

    await service.recordErrors('u1', tenErrors, 'review');

    expect(store).toHaveLength(10);
    expect(findManyMock).toHaveBeenCalledTimes(1);
    // Publication lookup failed -> eligibility must be conservatively false
    // for every error, never left unresolved or retried per-error.
    expect(isAssignmentCandidateMock).toHaveBeenCalledTimes(10);
    for (const call of isAssignmentCandidateMock.mock.calls) {
      const [, publishedSet] = call;
      expect(publishedSet).toBeInstanceOf(Set);
      expect((publishedSet as Set<string>).size).toBe(0);
    }
  });
});
