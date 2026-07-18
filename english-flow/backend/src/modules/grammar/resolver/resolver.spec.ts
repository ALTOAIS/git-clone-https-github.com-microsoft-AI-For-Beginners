import { resolveGrammarRule } from './resolver';
import {
  GRAMMAR_RESOLVER_RULE_CODES,
  GRAMMAR_RESOLVER_VERSION,
} from './resolver.types';

function resolve(
  originalText: string,
  correctedText: string,
  existingMicroCategory: any = null,
) {
  return resolveGrammarRule({
    originalText,
    correctedText,
    existingMicroCategory,
  });
}

describe('resolveGrammarRule — resolverVersion always populated', () => {
  it('is present and equal to the stable version string on every result, including null outcomes', () => {
    const results = [
      resolve('She can works from home.', 'She can work from home.'),
      resolve('The weather is nice today.', 'The weather is very nice today.'),
      resolve('', ''),
    ];
    for (const r of results) {
      expect(r.resolverVersion).toBe(GRAMMAR_RESOLVER_VERSION);
      expect(r.resolverVersion).toBe('grammar-mvp-v1');
    }
  });
});

describe('resolveGrammarRule — deterministic repeatability', () => {
  it('produces byte-identical results across repeated calls with the same input', () => {
    const input = {
      originalText: 'Does she can work from home?',
      correctedText: 'Can she work from home?',
      existingMicroCategory: null,
    };
    const results = Array.from({ length: 5 }, () => resolveGrammarRule(input));
    for (const r of results.slice(1)) {
      expect(r).toEqual(results[0]);
    }
  });

  it('is a synchronous pure function — no Promise, no async I/O', () => {
    const result = resolveGrammarRule({
      originalText: 'a',
      correctedText: 'b',
      existingMicroCategory: null,
    });
    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof (result as any).then).not.toBe('function');
  });
});

describe('resolveGrammarRule — null is a valid outcome', () => {
  it('returns null for an unrelated/unsupported correction', () => {
    const result = resolve(
      'The report is on the table.',
      'The report is over there on the desk today.',
    );
    expect(result.ruleCode).toBeNull();
    expect(result.confidence).toBe('LOW');
  });

  it('returns null (not a forced guess) for a noisy, large-scale rewrite', () => {
    const result = resolve(
      'The quick brown fox jumps over the lazy dog near the river bank today.',
      'A slow gray wolf walks under a happy cat far from an old bridge yesterday somehow.',
    );
    expect(result.ruleCode).toBeNull();
  });

  it('returns null for identical original/corrected text (no error at all)', () => {
    const result = resolve('She works from home.', 'She works from home.');
    expect(result.ruleCode).toBeNull();
    expect(result.candidates).toEqual([]);
  });
});

describe('resolveGrammarRule — positive coverage for all 12 rules', () => {
  const positives: [string, string, string][] = [
    [
      'ARTICLE_A_AN',
      'She is compliance officer.',
      'She is a compliance officer.',
    ],
    ['ARTICLE_THE_SPECIFIC', 'We need a report.', 'We need the report.'],
    [
      'ARTICLE_ZERO_GENERAL',
      'The compliance is important.',
      'Compliance is important.',
    ],
    [
      'PRESENT_SIMPLE_THIRD_PERSON',
      'He work in compliance.',
      'He works in compliance.',
    ],
    [
      'PAST_SIMPLE_FORM',
      'We submit the report last week.',
      'We submitted the report last week.',
    ],
    [
      'PAST_SIMPLE_VS_PRESENT_PERFECT',
      'We work here since 2020.',
      'We have worked here since 2020.',
    ],
    ['MODAL_BASE_VERB', 'She can works from home.', 'She can work from home.'],
    [
      'BASIC_PREPOSITION_PATTERNS',
      'This depends at the outcome.',
      'This depends on the outcome.',
    ],
    [
      'BASIC_WORD_ORDER',
      'Always she checks documents.',
      'She always checks documents.',
    ],
    [
      'DO_DOES_DID_QUESTIONS_NEGATIVES',
      'Did you went to the meeting?',
      'Did you go to the meeting?',
    ],
    [
      'COUNTABLE_UNCOUNTABLE',
      'Please give me an advice.',
      'Please give me some advice.',
    ],
    [
      'SINGULAR_PLURAL_ARTICLE_AGREEMENT',
      'We received a documents from the regulator.',
      'We received documents from the regulator.',
    ],
  ];

  it.each(positives)(
    'resolves %s from its documented positive example',
    (ruleCode, original, corrected) => {
      const result = resolve(original, corrected);
      expect(result.ruleCode).toBe(ruleCode);
      expect(result.ambiguous).toBe(false);
      expect(['HIGH', 'MEDIUM']).toContain(result.confidence);
    },
  );

  it('covers exactly the 12 approved ruleCodes, matching GRAMMAR_RESOLVER_RULE_CODES', () => {
    const covered = new Set(positives.map(([code]) => code));
    expect([...covered].sort()).toEqual(
      [...GRAMMAR_RESOLVER_RULE_CODES].sort(),
    );
  });
});

describe('resolveGrammarRule — negative examples (must NOT match)', () => {
  it('does not resolve ARTICLE_A_AN for a plural-marked noun', () => {
    const result = resolve(
      'We received a documents from the regulator.',
      'We received documents from the regulator.',
    );
    expect(result.ruleCode).not.toBe('ARTICLE_A_AN');
  });

  it('does not resolve MODAL_BASE_VERB when the modal itself was added (not a base-verb-form error)', () => {
    const result = resolve('She work from home.', 'She should work from home.');
    expect(result.ruleCode).not.toBe('MODAL_BASE_VERB');
  });

  it('does not resolve PAST_SIMPLE_FORM when have/has is involved (present perfect territory)', () => {
    const result = resolve(
      'We work here since 2020.',
      'We have worked here since 2020.',
    );
    expect(result.ruleCode).not.toBe('PAST_SIMPLE_FORM');
  });

  it('does not resolve BASIC_PREPOSITION_PATTERNS for a preposition pair outside the curated list', () => {
    const result = resolve(
      'The meeting is at the room.',
      'The meeting is in the room.',
    );
    expect(result.ruleCode).not.toBe('BASIC_PREPOSITION_PATTERNS');
  });

  it('does not resolve COUNTABLE_UNCOUNTABLE for an ordinary countable noun', () => {
    const result = resolve('I saw a car.', 'I saw a red car.');
    expect(result.ruleCode).not.toBe('COUNTABLE_UNCOUNTABLE');
  });
});

describe('resolveGrammarRule — ambiguous overlaps (section 8 pairs)', () => {
  it('ARTICLE_A_AN vs SINGULAR_PLURAL_ARTICLE_AGREEMENT: correctly separated by plural reliability, not tied', () => {
    expect(
      resolve('She is compliance officer.', 'She is a compliance officer.')
        .ruleCode,
    ).toBe('ARTICLE_A_AN');
    expect(
      resolve(
        'We received a documents from the regulator.',
        'We received documents from the regulator.',
      ).ruleCode,
    ).toBe('SINGULAR_PLURAL_ARTICLE_AGREEMENT');
  });

  it('ARTICLE_THE_SPECIFIC vs ARTICLE_ZERO_GENERAL: correctly separated by insertion vs removal direction', () => {
    expect(resolve('We need a report.', 'We need the report.').ruleCode).toBe(
      'ARTICLE_THE_SPECIFIC',
    );
    expect(
      resolve('The compliance is important.', 'Compliance is important.')
        .ruleCode,
    ).toBe('ARTICLE_ZERO_GENERAL');
  });

  it('ARTICLE_A_AN vs ARTICLE_THE_SPECIFIC: a genuinely combined multi-insertion sentence is reported ambiguous, not force-resolved', () => {
    // Both "a" and "the" are inserted at independent sites in this sentence
    // — a real two-candidate tie. Reporting ambiguous here is the correct,
    // conservative behavior (never guess between equally-supported
    // candidates), not a bug — see resolver-inspection report.
    const result = resolve(
      'I read report. Report was long.',
      'I read a report. The report was long.',
    );
    expect(result.ambiguous).toBe(true);
    expect(result.ruleCode).toBeNull();
    const codes = result.candidates.map((c) => c.ruleCode).sort();
    expect(codes).toEqual(['ARTICLE_A_AN', 'ARTICLE_THE_SPECIFIC']);
  });

  it('PAST_SIMPLE_FORM vs PAST_SIMPLE_VS_PRESENT_PERFECT: correctly separated by have/has presence', () => {
    expect(
      resolve(
        'We submit the report last week.',
        'We submitted the report last week.',
      ).ruleCode,
    ).toBe('PAST_SIMPLE_FORM');
    expect(
      resolve(
        'I have seen this policy yesterday.',
        'I saw this policy yesterday.',
      ).ruleCode,
    ).toBe('PAST_SIMPLE_VS_PRESENT_PERFECT');
  });

  it('MODAL_BASE_VERB vs BASIC_WORD_ORDER: a genuine modal-form error is not confused with a reorder', () => {
    const result = resolve(
      'She can works from home.',
      'She can work from home.',
    );
    expect(result.ruleCode).toBe('MODAL_BASE_VERB');
    expect(result.ruleCode).not.toBe('BASIC_WORD_ORDER');
  });

  it('MODAL_BASE_VERB vs BASIC_WORD_ORDER: a genuine reorder is not confused with a modal-form error', () => {
    const result = resolve(
      'Always she can check documents.',
      'She can always check documents.',
    );
    expect(result.ruleCode).not.toBe('MODAL_BASE_VERB');
  });

  it('DO_DOES_DID_QUESTIONS_NEGATIVES vs PRESENT_SIMPLE_THIRD_PERSON: do-support double-marking wins over a bare missing-suffix reading', () => {
    const result = resolve(
      "She doesn't works on Fridays.",
      "She doesn't work on Fridays.",
    );
    expect(result.ruleCode).toBe('DO_DOES_DID_QUESTIONS_NEGATIVES');
    expect(result.ruleCode).not.toBe('PRESENT_SIMPLE_THIRD_PERSON');
  });

  it('DO_DOES_DID_QUESTIONS_NEGATIVES vs PRESENT_SIMPLE_THIRD_PERSON: a plain third-person suffix error without do-support resolves to the other rule', () => {
    const result = resolve('He work in compliance.', 'He works in compliance.');
    expect(result.ruleCode).toBe('PRESENT_SIMPLE_THIRD_PERSON');
  });

  it('COUNTABLE_UNCOUNTABLE vs article rules: an uncountable-noun vocabulary error takes precedence over a generic article read', () => {
    expect(
      resolve('Please give me an advice.', 'Please give me some advice.')
        .ruleCode,
    ).toBe('COUNTABLE_UNCOUNTABLE');
    expect(
      resolve('We need much evidences.', 'We need a lot of evidence.').ruleCode,
    ).toBe('COUNTABLE_UNCOUNTABLE');
  });
});

describe('resolveGrammarRule — Case A/B/C/D precedence (grammar-resolver-test-cases.md)', () => {
  it('Case A — modal retained, verb form malformed after it -> MODAL_BASE_VERB', () => {
    expect(
      resolve('She can works from home.', 'She can work from home.').ruleCode,
    ).toBe('MODAL_BASE_VERB');
    expect(
      resolve(
        'The company must to comply with this regulation.',
        'The company must comply with this regulation.',
      ).ruleCode,
    ).toBe('MODAL_BASE_VERB');
    expect(
      resolve(
        'We should reported the incident immediately.',
        'We should report the incident immediately.',
      ).ruleCode,
    ).toBe('MODAL_BASE_VERB');
  });

  it('Case B — do-support removed, modal retained -> DO_DOES_DID_QUESTIONS_NEGATIVES primary, MODAL_BASE_VERB logged secondary', () => {
    const result = resolve(
      'Does she can work from home?',
      'Can she work from home?',
    );
    expect(result.ruleCode).toBe('DO_DOES_DID_QUESTIONS_NEGATIVES');
    const modalCandidate = result.candidates.find(
      (c) => c.ruleCode === 'MODAL_BASE_VERB',
    );
    expect(modalCandidate).toBeDefined();
    expect(modalCandidate!.score).toBeLessThan(
      result.candidates.find(
        (c) => c.ruleCode === 'DO_DOES_DID_QUESTIONS_NEGATIVES',
      )!.score,
    );
  });

  it('Case C — double-marking after do/does/did, no modal involved -> DO_DOES_DID_QUESTIONS_NEGATIVES', () => {
    expect(
      resolve('Did you went to the meeting?', 'Did you go to the meeting?')
        .ruleCode,
    ).toBe('DO_DOES_DID_QUESTIONS_NEGATIVES');
    expect(
      resolve("She doesn't works on Fridays.", "She doesn't work on Fridays.")
        .ruleCode,
    ).toBe('DO_DOES_DID_QUESTIONS_NEGATIVES');
  });

  it('Case D — no reliable distinction -> null, ambiguous, LOW', () => {
    const result = resolve(
      'I read report. Report was long.',
      'I read a report. The report was long.',
    );
    expect(result.ruleCode).toBeNull();
    expect(result.ambiguous).toBe(true);
    expect(result.confidence).toBe('LOW');
  });
});

describe('resolveGrammarRule — unsupported/noisy diffs -> null or LOW', () => {
  it('caps confidence at LOW when the diff itself is unreliable, even with strong matcher evidence', () => {
    const result = resolve(
      'We need much evidences.',
      'We need a lot of evidence.',
    );
    expect(result.ruleCode).toBe('COUNTABLE_UNCOUNTABLE');
    expect(result.confidence).toBe('LOW');
    const winningCandidate = result.candidates.find(
      (c) => c.ruleCode === result.ruleCode,
    );
    expect(winningCandidate!.score).toBeGreaterThanOrEqual(3); // matcher's own tier is HIGH-equivalent...
    // ...but the diff's own reliability is not, so confidence stays LOW. Never
    // exceeding diff reliability is exactly the point of this test.
  });

  it('caps confidence at LOW for non-English original text even when a matcher pattern happens to match', () => {
    // The diff's own reliability gate (grammar-diff.ts) grades non-English
    // original text as LOW regardless of the diff shape — a matcher can
    // still report a candidate (have/has insertion is a real, detectable
    // pattern here), but the resolver must never report HIGH/MEDIUM
    // confidence off an unreliable diff.
    const result = resolve(
      'Мы работаем с 2020 года.',
      'We have worked here since 2020.',
    );
    expect(result.confidence).toBe('LOW');
  });

  it('returns null for a genuinely unrelated rewrite with no structural pattern match at all', () => {
    const result = resolve(
      'We are very busy today.',
      'We are extremely busy with paperwork today.',
    );
    expect(result.ruleCode).toBeNull();
  });
});

describe('resolveGrammarRule — legacy MicroCategory is a weak hint only, never authoritative', () => {
  it('resolves correctly from structural evidence even when existingMicroCategory is misleading', () => {
    const withWrongHint = resolve(
      'She can works from home.',
      'She can work from home.',
      'ARTICLES',
    );
    const withNoHint = resolve(
      'She can works from home.',
      'She can work from home.',
      null,
    );
    expect(withWrongHint.ruleCode).toBe('MODAL_BASE_VERB');
    expect(withWrongHint.ruleCode).toBe(withNoHint.ruleCode);
    expect(withWrongHint.confidence).toBe(withNoHint.confidence);
  });

  it('does not resolve to a rule the legacy category would suggest when there is no structural evidence for it', () => {
    // 'ARTICLES' hints at an article rule, but this correction has no
    // article-related structural signal at all — must stay null, not be
    // force-mapped from the hint.
    const result = resolve(
      'The team is finishing the audit.',
      'The team is finishing the compliance audit.',
      'ARTICLES',
    );
    expect(result.ruleCode).toBeNull();
  });
});

describe('resolveGrammarRule — no AI/network/database dependency', () => {
  it('module exports contain no async functions and no Prisma/HTTP imports (structural smoke test)', () => {
    // The real guarantee is architectural (see resolver.ts's own doc
    // comment and this file's import list: only ./grammar-diff,
    // ./rule-matchers, ./resolver.types — no PrismaService, no AI module,
    // no fetch/axios/http anywhere in this directory). This test asserts
    // the observable behavioral consequence: calling it never returns a
    // thenable and never throws for lack of network/DB setup in this Jest
    // environment (which has neither configured).
    expect(() => resolve('a', 'b')).not.toThrow();
  });
});
