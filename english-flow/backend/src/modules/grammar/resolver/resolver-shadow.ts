import { resolveGrammarRule } from './resolver';
import type {
  GrammarResolverResult,
  GrammarRuleCode,
  GrammarRuleResolverInput,
  ResolverConfidence,
} from './resolver.types';

/**
 * Shadow-observation and assignment-eligibility layer for the Grammar MVP
 * resolver (grammar-mvp-v1). This module never persists anything itself —
 * it only runs the existing, unmodified resolver against real ErrorRecord
 * creation inputs, produces non-sensitive structured metadata for logging,
 * and (pure, no DB access) resolves whether/what a caller-supplied
 * PUBLISHED-ruleCode map would allow an automatic assignment to use.
 * Persisting `grammarRuleId`/`grammarResolverVersion` is entirely the
 * caller's (errors.service.ts's) responsibility.
 *
 * Only two fields from the raw resolver input are ever handled here
 * (originalText, correctedText — required by the resolver's own
 * contract) and neither is ever included in the returned observation:
 * this module's output type intentionally has no field capable of
 * holding user-authored text.
 */

export interface GrammarShadowObservation {
  resolverVersion: string;
  ruleCode: GrammarRuleCode | null;
  confidence: ResolverConfidence;
  ambiguous: boolean;
  candidateCount: number;
}

/**
 * Safely invokes the deterministic resolver for shadow-mode observation
 * only. Never throws: any exception from the resolver itself (or from
 * reading its result) is caught and converted to `null` — no
 * observation for this call — so a resolver bug can never block
 * ErrorRecord creation, which remains the authoritative, unaffected
 * behavior regardless of what this function returns.
 *
 * Does not modify resolver core semantics, does not add any AI call,
 * and does not perform any DB lookup itself — it only calls the
 * existing, already-deterministic `resolveGrammarRule`.
 */
export function runGrammarResolverShadow(
  input: GrammarRuleResolverInput,
): GrammarShadowObservation | null {
  try {
    const result: GrammarResolverResult = resolveGrammarRule(input);
    return {
      resolverVersion: result.resolverVersion,
      ruleCode: result.ruleCode,
      confidence: result.confidence,
      ambiguous: result.ambiguous,
      candidateCount: result.candidates.length,
    };
  } catch {
    return null;
  }
}

/**
 * Pure decision helper — does NOT perform automatic assignment and does
 * NOT read the database itself. Answers only: would this shadow
 * observation be eligible for a *future* automatic assignment, once
 * activation is separately approved?
 *
 * `publishableRuleCodes` must be supplied by the caller, fetched
 * (safely, outside this function and outside the resolver) from
 * whatever is actually PUBLISHED at call time — this function never
 * hardcodes the current 8 PUBLISHED ruleCodes and has no DB access, so
 * it stays correct as the publishable set changes over time.
 *
 * Eligibility, per the not-yet-activated resolver-activation contract:
 *  - ruleCode is not null;
 *  - confidence is HIGH — this already implies the diff extraction's
 *    own reliability was HIGH too, since `resolveGrammarRule` caps
 *    confidence at the diff's reliability tier before returning (see
 *    resolver.ts); the public `GrammarResolverResult` contract does not
 *    separately expose diff reliability, so there is nothing further to
 *    check here — checking confidence === 'HIGH' already covers it;
 *  - not ambiguous;
 *  - ruleCode is a member of the supplied publishable-ruleCode set.
 */
export function isAssignmentCandidate(
  observation: GrammarShadowObservation | null,
  publishableRuleCodes: ReadonlySet<string>,
): boolean {
  if (!observation) return false;
  if (!observation.ruleCode) return false;
  if (observation.confidence !== 'HIGH') return false;
  if (observation.ambiguous) return false;
  return publishableRuleCodes.has(observation.ruleCode);
}

/**
 * Resolves the `GrammarRule.id` an automatic assignment should persist for
 * this observation, or `null` if it is not eligible.
 *
 * Deliberately takes `isCandidate` as an argument — the exact boolean
 * already produced by `isAssignmentCandidate` for this same observation and
 * the same published-ruleCode set — rather than recomputing eligibility
 * itself. This guarantees there is exactly one eligibility gate in the
 * whole system: this function can never disagree with, or duplicate the
 * semantics of, `isAssignmentCandidate`.
 *
 * No DB access: `publishedRuleIdByCode` (ruleCode -> GrammarRule.id) must be
 * supplied by the caller, fetched safely and at most once per
 * `recordErrors()` invocation — this function only performs an in-memory
 * lookup. Returns `null` (never throws, never invents an id) if the
 * resolved ruleCode is missing from the supplied map for any reason.
 */
export function resolveAssignableGrammarRuleId(
  observation: GrammarShadowObservation | null,
  isCandidate: boolean,
  publishedRuleIdByCode: ReadonlyMap<string, string>,
): string | null {
  if (!isCandidate || !observation?.ruleCode) return null;
  return publishedRuleIdByCode.get(observation.ruleCode) ?? null;
}
