import { computeGrammarDiff } from './grammar-diff';
import { RULE_MATCHERS } from './rule-matchers';
import {
  GRAMMAR_RESOLVER_VERSION,
  GrammarResolverResult,
  GrammarRuleCandidate,
  GrammarRuleResolverInput,
  ResolverConfidence,
} from './resolver.types';

/**
 * Grammar MVP resolver core. Pure and fully deterministic: the same
 * (originalText, correctedText, existingMicroCategory) always produces
 * the same GrammarResolverResult. No database access, no AI/LLM call, no
 * network call, no randomness, no wall-clock/Date usage anywhere in this
 * module or anything it imports.
 *
 * This is a standalone, uncalled module in this round — see the resolver
 * task's explicit scope: no ErrorRecord write path calls this function
 * yet, and none should until the activation gate documented in
 * schema.prisma's ErrorRecord.grammarRuleId comment and
 * grammar-resolver-contract.md's "Automatic assignment policy" is
 * actually met (HIGH confidence + unambiguous + matched rule PUBLISHED —
 * impossible today since PUBLISHED = 0 in production).
 */

/**
 * Maps a matcher's own evidence tier (score) to a resolver confidence
 * tier, then caps it at the diff's own reliability grade — confidence can
 * never exceed how trustworthy the diff extraction itself is judged to
 * be (see grammar-diff.ts's gradeReliability doc comment).
 *   score 3 -> HIGH (capped by diff reliability)
 *   score 2 -> MEDIUM (capped by diff reliability)
 *   score 1 -> LOW, always (a score-1 candidate is logged for
 *              observability only — e.g. MODAL_BASE_VERB's Case-B
 *              secondary candidate — and can never become the resolved
 *              ruleCode by itself)
 */
function tierFor(
  score: number,
  diffReliability: ResolverConfidence,
): ResolverConfidence {
  const reliabilityRank: Record<ResolverConfidence, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
  };
  const scoreRank = score >= 3 ? 3 : score === 2 ? 2 : 1;
  const cappedRank = Math.min(scoreRank, reliabilityRank[diffReliability]);
  return cappedRank >= 3 ? 'HIGH' : cappedRank === 2 ? 'MEDIUM' : 'LOW';
}

/**
 * Resolves a learner error to one of the 12 approved Grammar MVP rules,
 * if the structural evidence is strong and unambiguous enough — null and
 * "ambiguous" are both valid, expected, and common outcomes. This
 * function never forces an error into one of the 12 rules.
 */
export function resolveGrammarRule(
  input: GrammarRuleResolverInput,
): GrammarResolverResult {
  const diff = computeGrammarDiff(input.originalText, input.correctedText);

  const rawCandidates: GrammarRuleCandidate[] = [];
  for (const matcher of RULE_MATCHERS) {
    const result = matcher.match(diff, input.existingMicroCategory);
    if (result) rawCandidates.push(result);
  }

  if (rawCandidates.length === 0) {
    return {
      ruleCode: null,
      candidates: [],
      confidence: 'LOW',
      ambiguous: false,
      resolverVersion: GRAMMAR_RESOLVER_VERSION,
    };
  }

  const candidates = [...rawCandidates].sort((a, b) => b.score - a.score);
  const topScore = candidates[0].score;
  const topCandidates = candidates.filter((c) => c.score === topScore);

  // Score-1 candidates (weak/secondary only, e.g. MODAL_BASE_VERB's
  // Case-B self-downgrade) can never be the sole basis for a resolution —
  // if the single highest score is 1, there is no real winner.
  if (topScore < 2) {
    return {
      ruleCode: null,
      candidates,
      confidence: 'LOW',
      ambiguous: false,
      resolverVersion: GRAMMAR_RESOLVER_VERSION,
    };
  }

  // Two or more candidates tied at the top score: never resolved by
  // arbitrary tie-breaking (grammar-resolver-test-cases.md, Case D).
  if (topCandidates.length > 1) {
    return {
      ruleCode: null,
      candidates,
      confidence: 'LOW',
      ambiguous: true,
      resolverVersion: GRAMMAR_RESOLVER_VERSION,
    };
  }

  const winner = topCandidates[0];
  return {
    ruleCode: winner.ruleCode,
    candidates,
    confidence: tierFor(winner.score, diff.reliability),
    ambiguous: false,
    resolverVersion: GRAMMAR_RESOLVER_VERSION,
  };
}
