import { GRAMMAR_RULES_SOURCE } from './grammar-rules.data';
import { GRAMMAR_REVIEW_MANIFEST } from './grammar-review-manifest';
import { computeImportPlan } from './grammar-import-plan';

describe('computeImportPlan — no PUBLISHED status allowed in import definitions', () => {
  it('never produces a contentStatus other than DRAFT or REVIEWED for the real 12 rules', () => {
    const plan = computeImportPlan(
      GRAMMAR_RULES_SOURCE,
      GRAMMAR_REVIEW_MANIFEST,
    );
    expect(plan).toHaveLength(12);
    for (const entry of plan) {
      expect(['DRAFT', 'REVIEWED']).toContain(entry.contentStatus);
      expect(entry.contentStatus).not.toBe('PUBLISHED');
      expect(entry.contentStatus).not.toBe('ARCHIVED');
    }
  });

  it('assigns REVIEWED to every rule, since all 12 have an APPROVE-family human decision', () => {
    const plan = computeImportPlan(
      GRAMMAR_RULES_SOURCE,
      GRAMMAR_REVIEW_MANIFEST,
    );
    for (const entry of plan) {
      expect(entry.contentStatus).toBe('REVIEWED');
    }
  });

  it('defaults to DRAFT when a manifest entry has no APPROVE-family decision', () => {
    const manifest = GRAMMAR_REVIEW_MANIFEST.map((entry, index) =>
      index === 0 ? { ...entry, humanDecision: 'REVISE' as any } : entry,
    );
    const plan = computeImportPlan(GRAMMAR_RULES_SOURCE, manifest);
    expect(plan[0].contentStatus).toBe('DRAFT');
  });

  it('throws rather than importing a rule with no manifest entry', () => {
    const manifest = GRAMMAR_REVIEW_MANIFEST.filter(
      (entry) => entry.ruleCode !== 'ARTICLE_A_AN',
    );
    expect(() => computeImportPlan(GRAMMAR_RULES_SOURCE, manifest)).toThrow(
      /ARTICLE_A_AN/,
    );
  });
});

describe('computeImportPlan — partial source verification gate preserved', () => {
  it('carries sourceVerificationStatus through unchanged for all 12 rules (PARTIALLY_VERIFIED)', () => {
    const plan = computeImportPlan(
      GRAMMAR_RULES_SOURCE,
      GRAMMAR_REVIEW_MANIFEST,
    );
    for (const entry of plan) {
      expect(entry.sourceVerificationStatus).toBe('PARTIALLY_VERIFIED');
    }
  });

  it('never upgrades sourceVerificationStatus even for a REVIEWED rule', () => {
    const plan = computeImportPlan(
      GRAMMAR_RULES_SOURCE,
      GRAMMAR_REVIEW_MANIFEST,
    );
    const reviewed = plan.filter((entry) => entry.contentStatus === 'REVIEWED');
    expect(reviewed.length).toBeGreaterThan(0);
    for (const entry of reviewed) {
      expect(entry.sourceVerificationStatus).toBe('PARTIALLY_VERIFIED');
    }
  });
});
