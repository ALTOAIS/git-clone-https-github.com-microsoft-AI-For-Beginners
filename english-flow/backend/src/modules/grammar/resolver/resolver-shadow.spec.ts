import {
  isAssignmentCandidate,
  resolveAssignableGrammarRuleId,
  runGrammarResolverShadow,
} from './resolver-shadow';
import { GRAMMAR_RESOLVER_VERSION } from './resolver.types';

describe('runGrammarResolverShadow — real resolver, non-blocking observation', () => {
  it('A. HIGH-confidence result is observed with the correct structured fields', () => {
    const observation = runGrammarResolverShadow({
      originalText: 'She can works from home.',
      correctedText: 'She can work from home.',
      existingMicroCategory: null,
    });
    expect(observation).toEqual({
      resolverVersion: GRAMMAR_RESOLVER_VERSION,
      ruleCode: 'MODAL_BASE_VERB',
      confidence: 'HIGH',
      ambiguous: false,
      candidateCount: 1,
    });
  });

  it('B. a LOW-confidence (non-HIGH) result is observed as-is, not upgraded or hidden', () => {
    const observation = runGrammarResolverShadow({
      originalText: 'We need much evidences.',
      correctedText: 'We need a lot of evidence.',
      existingMicroCategory: null,
    });
    expect(observation).not.toBeNull();
    expect(observation?.ruleCode).toBe('COUNTABLE_UNCOUNTABLE');
    expect(observation?.confidence).toBe('LOW');
    expect(observation?.ambiguous).toBe(false);
  });

  it('C. an ambiguous result is observed with ruleCode null and ambiguous true', () => {
    const observation = runGrammarResolverShadow({
      originalText: 'I read report. Report was long.',
      correctedText: 'I read a report. The report was long.',
      existingMicroCategory: null,
    });
    expect(observation).not.toBeNull();
    expect(observation?.ruleCode).toBeNull();
    expect(observation?.ambiguous).toBe(true);
    expect(observation?.candidateCount).toBeGreaterThan(1);
  });

  it('D. a genuinely unmatched correction is observed with ruleCode null, ambiguous false', () => {
    const observation = runGrammarResolverShadow({
      originalText: 'The report is on the table.',
      correctedText: 'The report is over there on the desk today.',
      existingMicroCategory: null,
    });
    expect(observation).not.toBeNull();
    expect(observation?.ruleCode).toBeNull();
    expect(observation?.ambiguous).toBe(false);
    expect(observation?.candidateCount).toBe(0);
  });

  it('F. a misleading existingMicroCategory does not change the observed result (weak hint only, matches resolver.spec.ts)', () => {
    const withMisleadingHint = runGrammarResolverShadow({
      originalText: 'She can works from home.',
      correctedText: 'She can work from home.',
      existingMicroCategory: 'ARTICLES',
    });
    const withNoHint = runGrammarResolverShadow({
      originalText: 'She can works from home.',
      correctedText: 'She can work from home.',
      existingMicroCategory: null,
    });
    expect(withMisleadingHint?.ruleCode).toBe('MODAL_BASE_VERB');
    expect(withMisleadingHint?.ruleCode).toBe(withNoHint?.ruleCode);
    expect(withMisleadingHint?.confidence).toBe(withNoHint?.confidence);
  });

  it('E. a resolver exception is swallowed and observed as null, never re-thrown', () => {
    jest.resetModules();
    jest.doMock('./resolver', () => ({
      resolveGrammarRule: () => {
        throw new Error('boom — simulated resolver crash');
      },
    }));
    // Re-require after mocking so this test file's own module graph picks
    // up the mocked ./resolver, exactly like a real resolver bug would.
    const {
      runGrammarResolverShadow: runWithBrokenResolver,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('./resolver-shadow');

    expect(() =>
      runWithBrokenResolver({
        originalText: 'She can works from home.',
        correctedText: 'She can work from home.',
        existingMicroCategory: null,
      }),
    ).not.toThrow();

    const observation = runWithBrokenResolver({
      originalText: 'She can works from home.',
      correctedText: 'She can work from home.',
      existingMicroCategory: null,
    });
    expect(observation).toBeNull();

    jest.dontMock('./resolver');
    jest.resetModules();
  });
});

describe('isAssignmentCandidate — pure decision helper, no DB access, no automatic assignment', () => {
  const PUBLISHED = new Set([
    'ARTICLE_A_AN',
    'ARTICLE_THE_SPECIFIC',
    'ARTICLE_ZERO_GENERAL',
    'PRESENT_SIMPLE_THIRD_PERSON',
    'PAST_SIMPLE_FORM',
    'PAST_SIMPLE_VS_PRESENT_PERFECT',
    'MODAL_BASE_VERB',
    'DO_DOES_DID_QUESTIONS_NEGATIVES',
  ]);

  it('A. true for a HIGH-confidence, unambiguous, published ruleCode', () => {
    expect(
      isAssignmentCandidate(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'MODAL_BASE_VERB',
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 1,
        },
        PUBLISHED,
      ),
    ).toBe(true);
  });

  it('B. false for a non-HIGH (MEDIUM/LOW) confidence result', () => {
    expect(
      isAssignmentCandidate(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'MODAL_BASE_VERB',
          confidence: 'MEDIUM',
          ambiguous: false,
          candidateCount: 1,
        },
        PUBLISHED,
      ),
    ).toBe(false);
    expect(
      isAssignmentCandidate(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'MODAL_BASE_VERB',
          confidence: 'LOW',
          ambiguous: false,
          candidateCount: 1,
        },
        PUBLISHED,
      ),
    ).toBe(false);
  });

  it('C. false when ambiguous, even at HIGH confidence', () => {
    expect(
      isAssignmentCandidate(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'MODAL_BASE_VERB',
          confidence: 'HIGH',
          ambiguous: true,
          candidateCount: 2,
        },
        PUBLISHED,
      ),
    ).toBe(false);
  });

  it('D. false for a null observation', () => {
    expect(isAssignmentCandidate(null, PUBLISHED)).toBe(false);
  });

  it('D. false for a null ruleCode', () => {
    expect(
      isAssignmentCandidate(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: null,
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 0,
        },
        PUBLISHED,
      ),
    ).toBe(false);
  });

  it('G. false for an otherwise-eligible result whose ruleCode is not in the supplied publishable set (unpublished/hidden rule)', () => {
    expect(
      isAssignmentCandidate(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'BASIC_WORD_ORDER',
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 1,
        },
        PUBLISHED,
      ),
    ).toBe(false);
  });

  it('G. true once that same ruleCode is included in the supplied publishable set (proves the set is the only source of truth, never hardcoded)', () => {
    const expanded = new Set([...PUBLISHED, 'BASIC_WORD_ORDER']);
    expect(
      isAssignmentCandidate(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'BASIC_WORD_ORDER',
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 1,
        },
        expanded,
      ),
    ).toBe(true);
  });

  it('empty publishable set never yields a candidate, regardless of resolver confidence', () => {
    expect(
      isAssignmentCandidate(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'MODAL_BASE_VERB',
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 1,
        },
        new Set(),
      ),
    ).toBe(false);
  });
});

describe('resolveAssignableGrammarRuleId — pure, no DB access, single source of truth reused from isAssignmentCandidate', () => {
  const PUBLISHED_MAP = new Map([
    ['MODAL_BASE_VERB', 'rule-id-modal-base-verb'],
    ['ARTICLE_A_AN', 'rule-id-article-a-an'],
  ]);

  it('returns the mapped GrammarRule.id when isCandidate is true and the ruleCode is present', () => {
    expect(
      resolveAssignableGrammarRuleId(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'MODAL_BASE_VERB',
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 1,
        },
        true,
        PUBLISHED_MAP,
      ),
    ).toBe('rule-id-modal-base-verb');
  });

  it('returns null when isCandidate is false, regardless of how "eligible-looking" the observation is', () => {
    expect(
      resolveAssignableGrammarRuleId(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'MODAL_BASE_VERB',
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 1,
        },
        false,
        PUBLISHED_MAP,
      ),
    ).toBeNull();
  });

  it('returns null for a null observation even if isCandidate is (incorrectly) true', () => {
    expect(
      resolveAssignableGrammarRuleId(null, true, PUBLISHED_MAP),
    ).toBeNull();
  });

  it('returns null for a null ruleCode even if isCandidate is (incorrectly) true', () => {
    expect(
      resolveAssignableGrammarRuleId(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: null,
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 0,
        },
        true,
        PUBLISHED_MAP,
      ),
    ).toBeNull();
  });

  it('returns null when the ruleCode is missing from the supplied map, even if isCandidate is true (defensive: map and isCandidate should normally agree)', () => {
    expect(
      resolveAssignableGrammarRuleId(
        {
          resolverVersion: GRAMMAR_RESOLVER_VERSION,
          ruleCode: 'BASIC_WORD_ORDER',
          confidence: 'HIGH',
          ambiguous: false,
          candidateCount: 1,
        },
        true,
        PUBLISHED_MAP,
      ),
    ).toBeNull();
  });

  it('agrees with isAssignmentCandidate end-to-end: eligible observation + published map -> non-null id', () => {
    const observation = {
      resolverVersion: GRAMMAR_RESOLVER_VERSION,
      ruleCode: 'ARTICLE_A_AN' as const,
      confidence: 'HIGH' as const,
      ambiguous: false,
      candidateCount: 1,
    };
    const publishedCodes = new Set(PUBLISHED_MAP.keys());
    const isCandidate = isAssignmentCandidate(observation, publishedCodes);
    expect(isCandidate).toBe(true);
    expect(
      resolveAssignableGrammarRuleId(observation, isCandidate, PUBLISHED_MAP),
    ).toBe('rule-id-article-a-an');
  });

  it('agrees with isAssignmentCandidate end-to-end: hidden/unpublished ruleCode -> null id, even at HIGH confidence', () => {
    const observation = {
      resolverVersion: GRAMMAR_RESOLVER_VERSION,
      ruleCode: 'BASIC_WORD_ORDER' as const,
      confidence: 'HIGH' as const,
      ambiguous: false,
      candidateCount: 1,
    };
    const publishedCodes = new Set(PUBLISHED_MAP.keys());
    const isCandidate = isAssignmentCandidate(observation, publishedCodes);
    expect(isCandidate).toBe(false);
    expect(
      resolveAssignableGrammarRuleId(observation, isCandidate, PUBLISHED_MAP),
    ).toBeNull();
  });
});
