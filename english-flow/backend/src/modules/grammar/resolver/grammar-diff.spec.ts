import {
  computeGrammarDiff,
  GRAMMAR_DIFF_SCHEMA_VERSION,
} from './grammar-diff';

describe('computeGrammarDiff — determinism and envelope', () => {
  it('is deterministic: the same input always produces the same output', () => {
    const a = computeGrammarDiff(
      'She can works from home.',
      'She can work from home.',
    );
    const b = computeGrammarDiff(
      'She can works from home.',
      'She can work from home.',
    );
    expect(a).toEqual(b);
  });

  it('populates the schema/extractor version envelope', () => {
    const diff = computeGrammarDiff('a', 'b');
    expect(diff.diffSchemaVersion).toBe(GRAMMAR_DIFF_SCHEMA_VERSION);
    expect(typeof diff.extractorVersion).toBe('string');
    expect(diff.extractorVersion.length).toBeGreaterThan(0);
  });

  it('produces no operations and stays HIGH reliability for identical text', () => {
    const diff = computeGrammarDiff(
      'She works from home.',
      'She works from home.',
    );
    expect(diff.operations).toEqual([]);
    expect(diff.reliability).toBe('HIGH');
  });
});

describe('computeGrammarDiff — operation types (INSERT/DELETE/REPLACE only)', () => {
  it('classifies a single-word substitution as REPLACE', () => {
    const diff = computeGrammarDiff(
      'She can works from home.',
      'She can work from home.',
    );
    expect(diff.operations).toHaveLength(1);
    expect(diff.operations[0].operation).toBe('REPLACE');
    expect(diff.operations[0].normalizedOriginal).toBe('works');
    expect(diff.operations[0].normalizedCorrected).toBe('work');
  });

  it('classifies a removed word as DELETE', () => {
    const diff = computeGrammarDiff(
      'We received a documents from the regulator.',
      'We received documents from the regulator.',
    );
    expect(diff.operations).toHaveLength(1);
    expect(diff.operations[0].operation).toBe('DELETE');
    expect(diff.operations[0].normalizedOriginal).toBe('a');
    expect(diff.operations[0].normalizedCorrected).toBe('');
  });

  it('classifies an added word as INSERT', () => {
    const diff = computeGrammarDiff('We need report.', 'We need a report.');
    expect(diff.operations).toHaveLength(1);
    expect(diff.operations[0].operation).toBe('INSERT');
    expect(diff.operations[0].normalizedCorrected).toBe('a');
  });

  it('never emits an operation type outside INSERT/DELETE/REPLACE', () => {
    const cases: [string, string][] = [
      ['Does she can work from home?', 'Can she work from home?'],
      ['Always she checks documents.', 'She always checks documents.'],
      [
        'I read report. Report was long.',
        'I read a report. The report was long.',
      ],
    ];
    for (const [orig, corr] of cases) {
      const diff = computeGrammarDiff(orig, corr);
      for (const op of diff.operations) {
        expect(['INSERT', 'DELETE', 'REPLACE']).toContain(op.operation);
      }
    }
  });
});

describe('computeGrammarDiff — reliability grading', () => {
  it('grades a small, focused single-word change as HIGH', () => {
    const diff = computeGrammarDiff(
      'She can works from home.',
      'She can work from home.',
    );
    expect(diff.reliability).toBe('HIGH');
  });

  it('grades a large, scattered rewrite as LOW', () => {
    const diff = computeGrammarDiff(
      'The quick brown fox jumps over the lazy dog near the river bank today.',
      'A slow gray wolf walks under a happy cat far from an old bridge yesterday somehow.',
    );
    expect(diff.reliability).toBe('LOW');
  });

  it('grades non-English original text as LOW regardless of the diff shape', () => {
    const diff = computeGrammarDiff('Она читает книгу.', 'She reads a book.');
    expect(diff.reliability).toBe('LOW');
  });

  it('grades empty/gibberish original text as LOW', () => {
    const diff = computeGrammarDiff('asdf qwer zxcv', 'She reads a book.');
    expect(diff.reliability).toBe('LOW');
  });
});

describe('computeGrammarDiff — whole-sentence token arrays', () => {
  it('exposes normalized tokens for both texts in original order', () => {
    const diff = computeGrammarDiff(
      'She can works from home.',
      'She can work from home.',
    );
    expect(diff.originalTokens).toEqual([
      'she',
      'can',
      'works',
      'from',
      'home',
    ]);
    expect(diff.correctedTokens).toEqual([
      'she',
      'can',
      'work',
      'from',
      'home',
    ]);
  });
});
