/**
 * Computes governance fields (contentStatus, sourceVerificationStatus,
 * contentVersion) for the Grammar MVP import, kept structurally separate
 * from the learner-facing content in grammar-rules.data.ts.
 *
 * Design intent: `ImportContentStatus` below excludes `'PUBLISHED'` and
 * `'ARCHIVED'` at the type level, so this module cannot produce a
 * published/archived plan even by mistake — there is no runtime branch to
 * audit for a force-publish path because the return type makes one
 * unrepresentable.
 *
 * contentStatus policy:
 *   - `REVIEWED` when the manifest records an APPROVE-family human
 *     documentation decision (gate 2) for that ruleCode. Human review is
 *     genuinely complete for all 12 rules per
 *     grammar-rules-human-review.md, so REVIEWED is factually accurate,
 *     not an overstatement. REVIEWED does not unlock publication — the
 *     separate, unmet gate is sourceVerificationStatus reaching
 *     VERIFIED_DIRECTLY / VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE.
 *   - `DRAFT` for any ruleCode absent from the manifest, or present
 *     without an APPROVE-family decision. This is the safe default.
 *
 * sourceVerificationStatus policy: taken verbatim from the manifest
 * (PARTIALLY_VERIFIED for all 12 rules today) — never upgraded by this
 * import regardless of contentStatus.
 */

import type { GrammarRuleContentSource } from './grammar-rules.data';
import type {
  GrammarRuleReviewEntry,
  HumanDocumentationDecision,
} from './grammar-review-manifest';

export type ImportContentStatus = 'DRAFT' | 'REVIEWED';

export interface GrammarRuleImportPlanEntry {
  ruleCode: string;
  contentStatus: ImportContentStatus;
  sourceVerificationStatus: GrammarRuleReviewEntry['sourceVerificationStatus'];
  contentVersion: number;
}

const APPROVE_FAMILY: readonly HumanDocumentationDecision[] = [
  'APPROVE',
  'APPROVE_AFTER_REVISION',
  'APPROVE_WITH_CAVEAT',
];

function isApproveFamily(decision: HumanDocumentationDecision): boolean {
  return APPROVE_FAMILY.includes(decision);
}

/**
 * Pure function: given the content source list and the review manifest,
 * returns one governance plan entry per content-source ruleCode. Throws
 * if a content-source ruleCode has no manifest entry — an import must
 * never guess a review decision.
 */
export function computeImportPlan(
  rules: GrammarRuleContentSource[],
  manifest: GrammarRuleReviewEntry[],
): GrammarRuleImportPlanEntry[] {
  const manifestByCode = new Map(
    manifest.map((entry) => [entry.ruleCode, entry]),
  );

  return rules.map((rule) => {
    const entry = manifestByCode.get(rule.ruleCode);
    if (!entry) {
      throw new Error(
        `No human review manifest entry found for ruleCode "${rule.ruleCode}" — refusing to import unreviewed content.`,
      );
    }

    const contentStatus: ImportContentStatus = isApproveFamily(
      entry.humanDecision,
    )
      ? 'REVIEWED'
      : 'DRAFT';

    return {
      ruleCode: rule.ruleCode,
      contentStatus,
      sourceVerificationStatus: entry.sourceVerificationStatus,
      contentVersion: entry.reviewedContentVersion,
    };
  });
}
