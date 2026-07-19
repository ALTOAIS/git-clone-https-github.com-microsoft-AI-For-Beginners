import { resolveGrammarRule } from './resolver';
import type {
  GrammarResolverResult,
  GrammarRuleCode,
  GrammarRuleResolverInput,
  ResolverConfidence,
} from './resolver.types';

/**
 * Shadow-mode observation layer for the Grammar MVP resolver
 * (grammar-mvp-v1). This module never persists anything and never
 * activates automatic assignment — it exists only to safely run the
 * existing, unmodified resolver against real ErrorRecord creation
 * inputs and produce non-sensitive, structured metadata for logging.
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
