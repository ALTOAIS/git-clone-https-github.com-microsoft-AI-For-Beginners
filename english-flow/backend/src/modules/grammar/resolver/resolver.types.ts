import type { MicroCategoryString } from '../../ai/ai.types';
import type { GrammarDiff } from './grammar-diff';

/**
 * The 12 approved Grammar MVP ruleCodes this resolver covers — a closed,
 * reviewed set (see english-flow/docs/content-pedagogy/
 * grammar-rules-human-review.md). Deliberately a local literal union, not
 * imported from ../grammar-rules.expected-codes (that file is untyped
 * content-import source data; this resolver needs a real string-literal
 * type per rule for its own matcher registry, independent of content
 * import concerns — see the resolver task's own scope boundaries).
 */
export type GrammarRuleCode =
  | 'ARTICLE_A_AN'
  | 'ARTICLE_THE_SPECIFIC'
  | 'ARTICLE_ZERO_GENERAL'
  | 'PRESENT_SIMPLE_THIRD_PERSON'
  | 'PAST_SIMPLE_FORM'
  | 'PAST_SIMPLE_VS_PRESENT_PERFECT'
  | 'MODAL_BASE_VERB'
  | 'BASIC_PREPOSITION_PATTERNS'
  | 'BASIC_WORD_ORDER'
  | 'DO_DOES_DID_QUESTIONS_NEGATIVES'
  | 'COUNTABLE_UNCOUNTABLE'
  | 'SINGULAR_PLURAL_ARTICLE_AGREEMENT';

export const GRAMMAR_RESOLVER_RULE_CODES: GrammarRuleCode[] = [
  'ARTICLE_A_AN',
  'ARTICLE_THE_SPECIFIC',
  'ARTICLE_ZERO_GENERAL',
  'PRESENT_SIMPLE_THIRD_PERSON',
  'PAST_SIMPLE_FORM',
  'PAST_SIMPLE_VS_PRESENT_PERFECT',
  'MODAL_BASE_VERB',
  'BASIC_PREPOSITION_PATTERNS',
  'BASIC_WORD_ORDER',
  'DO_DOES_DID_QUESTIONS_NEGATIVES',
  'COUNTABLE_UNCOUNTABLE',
  'SINGULAR_PLURAL_ARTICLE_AGREEMENT',
];

export type ResolverConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Stable resolver version — bumped whenever matcher logic changes; not the schema version. */
export const GRAMMAR_RESOLVER_VERSION = 'grammar-mvp-v1' as const;

/**
 * Matcher evidence tier, BEFORE the diff-reliability cap is applied.
 * 3 = the rule's own documented HIGH-tier structural evidence.
 * 2 = the rule's own documented MEDIUM-tier evidence (real but weaker
 *     signal — e.g. a regular -ed pattern instead of a known irregular
 *     verb, or a suffix-only plural signal instead of a reliable one).
 * 1 = weak/secondary evidence only (e.g. logged as a secondary candidate
 *     in a do-support/modal conflict) — never enough alone to resolve.
 * See each matcher in rule-matchers.ts for the exact criteria per rule,
 * transcribed from english-flow/docs/content-pedagogy/
 * grammar-resolver-test-cases.md's per-rule signal table.
 */
export type MatcherScore = 3 | 2 | 1;

export interface GrammarRuleCandidate {
  ruleCode: GrammarRuleCode;
  score: number;
  reasons: string[];
}

export interface GrammarRuleResolverInput {
  originalText: string;
  correctedText: string;
  /** Weak, optional secondary signal only — never authoritative, never a one-to-one mapping to a GrammarRuleCode. See rule-matchers.ts for exactly how (or whether) each matcher consults it. */
  existingMicroCategory: MicroCategoryString | null;
}

export interface GrammarResolverResult {
  ruleCode: GrammarRuleCode | null;
  candidates: GrammarRuleCandidate[];
  confidence: ResolverConfidence;
  ambiguous: boolean;
  resolverVersion: string;
}

/**
 * One matcher per ruleCode. Pure function: no DB read, no I/O, no
 * randomness. Returns null if this rule's structural pattern is not
 * present in the diff at all. `score` is this matcher's own tier
 * (MatcherScore) — the resolver (resolver.ts) is responsible for capping
 * final confidence at the diff's own reliability tier; a matcher must
 * never do that capping itself, so its score always reflects the
 * strength of ITS OWN evidence only.
 */
export interface RuleMatcher {
  ruleCode: GrammarRuleCode;
  match(
    diff: GrammarDiff,
    existingMicroCategory: MicroCategoryString | null,
  ): GrammarRuleCandidate | null;
}
