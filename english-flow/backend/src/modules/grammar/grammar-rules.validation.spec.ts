import {
  GRAMMAR_RULES_SOURCE,
  type GrammarRuleContentSource,
} from './grammar-rules.data';
import { GRAMMAR_REVIEW_MANIFEST } from './grammar-review-manifest';
import { EXPECTED_GRAMMAR_RULE_CODES } from './grammar-rules.expected-codes';
import {
  validateGrammarReviewManifest,
  validateGrammarRulesSource,
} from './grammar-rules.validation';
import { GRAMMAR_EXERCISE_SCHEMA_VERSION } from './exercise-templates';

function buildValidRule(
  overrides: Partial<GrammarRuleContentSource> = {},
): GrammarRuleContentSource {
  return {
    ruleCode: 'TEST_RULE',
    titleRu: 'Тест',
    shortExplanationRu: 'Короткое объяснение.',
    explanationRu: 'Полное объяснение.',
    cefrLevel: 'A1',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'ex-1',
          type: 'fill_blank',
          prompt: 'She ___ works.',
          answer: 'always',
        },
      ],
    },
    examples: [{ exampleType: 'CORRECT', sentence: 'She works here.' }],
    ...overrides,
  };
}

describe('grammar-rules.validation — the real GRAMMAR_RULES_SOURCE', () => {
  it('contains exactly the 12 approved ruleCodes, no more, no fewer, no duplicates', () => {
    const codes = GRAMMAR_RULES_SOURCE.map((r) => r.ruleCode);
    expect(codes).toHaveLength(12);
    expect(new Set(codes).size).toBe(12);
    expect([...codes].sort()).toEqual([...EXPECTED_GRAMMAR_RULE_CODES].sort());
  });

  it('passes full source validation', () => {
    const result = validateGrammarRulesSource(GRAMMAR_RULES_SOURCE);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('review manifest matches the source exactly and passes validation', () => {
    const result = validateGrammarReviewManifest(
      GRAMMAR_REVIEW_MANIFEST,
      GRAMMAR_RULES_SOURCE,
    );
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('no rule in the manifest claims a verification tier stronger than PARTIALLY_VERIFIED', () => {
    for (const entry of GRAMMAR_REVIEW_MANIFEST) {
      expect(entry.sourceVerificationStatus).toBe('PARTIALLY_VERIFIED');
    }
  });
});

describe('grammar-rules.validation — duplicate ruleCode detection', () => {
  it('rejects a source with a duplicated ruleCode', () => {
    const rules = [
      buildValidRule({ ruleCode: 'ARTICLE_A_AN' }),
      buildValidRule({ ruleCode: 'ARTICLE_A_AN' }),
    ];
    const result = validateGrammarRulesSource(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate ruleCode'))).toBe(
      true,
    );
  });
});

describe('grammar-rules.validation — unsupported exercise type rejection', () => {
  it('rejects a rule whose exerciseTemplates includes an unsupported type (e.g. reorder)', () => {
    const rules = [
      buildValidRule({
        ruleCode: 'ARTICLE_A_AN',
        exerciseTemplates: {
          exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
          exercises: [
            {
              id: 'ex-1',
              type: 'reorder' as any,
              prompt: 'Rearrange this.',
              answer: 'answer',
            },
          ],
        },
      }),
    ];
    const result = validateGrammarRulesSource(rules);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes('unsupported exercise type') && e.includes('reorder'),
      ),
    ).toBe(true);
  });
});

describe('grammar-rules.validation — missing required content rejection', () => {
  it('rejects a rule missing explanationRu', () => {
    const rules = [
      buildValidRule({ ruleCode: 'ARTICLE_A_AN', explanationRu: '' }),
    ];
    const result = validateGrammarRulesSource(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('explanationRu'))).toBe(true);
  });

  it('rejects a rule with no examples', () => {
    const rules = [buildValidRule({ ruleCode: 'ARTICLE_A_AN', examples: [] })];
    const result = validateGrammarRulesSource(rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('examples'))).toBe(true);
  });

  it('reports a missing count when fewer than 12 rules are provided', () => {
    const result = validateGrammarRulesSource([
      buildValidRule({ ruleCode: 'ARTICLE_A_AN' }),
    ]);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('Missing expected ruleCode')),
    ).toBe(true);
    expect(
      result.errors.some((e) => e.includes('Expected exactly 12 rules')),
    ).toBe(true);
  });
});

describe('grammar-rules.validation — review manifest gate preservation', () => {
  it('rejects a manifest entry claiming VERIFIED_DIRECTLY', () => {
    const manifest = GRAMMAR_REVIEW_MANIFEST.map((entry, index) =>
      index === 0
        ? { ...entry, sourceVerificationStatus: 'VERIFIED_DIRECTLY' as const }
        : entry,
    );
    const result = validateGrammarReviewManifest(
      manifest,
      GRAMMAR_RULES_SOURCE,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('VERIFIED_DIRECTLY'))).toBe(
      true,
    );
  });

  it('rejects a manifest with a duplicate ruleCode entry', () => {
    const manifest = [...GRAMMAR_REVIEW_MANIFEST, GRAMMAR_REVIEW_MANIFEST[0]];
    const result = validateGrammarReviewManifest(
      manifest,
      GRAMMAR_RULES_SOURCE,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate ruleCode'))).toBe(
      true,
    );
  });
});
