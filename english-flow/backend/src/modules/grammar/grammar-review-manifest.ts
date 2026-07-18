/**
 * Git-tracked human review manifest for the Grammar MVP content import.
 *
 * Transcribed exactly from
 * english-flow/docs/content-pedagogy/grammar-rules-human-review.md
 * ("Per-rule review table (final — 12 of 12)"). This is gate 2
 * (human documentation decision) only — it does NOT represent gate 3
 * (production publication decision), which is `NOT APPROVED` for all 12
 * rules with no exceptions and is never read by the import pipeline.
 *
 * `sourceVerificationStatus` here mirrors the exact Prisma enum value
 * documented for all 12 rules (`PARTIALLY_VERIFIED` — none reaches
 * `VERIFIED_DIRECTLY`/`VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE`).
 * `reviewedContentVersion` is 1 for all 12 — this is the first import of
 * this reviewed content.
 */

import type { SourceVerificationStatus } from '@prisma/client';

export type HumanDocumentationDecision =
  'APPROVE' | 'APPROVE_AFTER_REVISION' | 'APPROVE_WITH_CAVEAT';

export interface GrammarRuleReviewEntry {
  ruleCode: string;
  humanDecision: HumanDocumentationDecision;
  sourceVerificationStatus: SourceVerificationStatus;
  reviewedContentVersion: number;
}

export const GRAMMAR_REVIEW_MANIFEST: GrammarRuleReviewEntry[] = [
  {
    ruleCode: 'ARTICLE_A_AN',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'ARTICLE_THE_SPECIFIC',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'ARTICLE_ZERO_GENERAL',
    humanDecision: 'APPROVE_AFTER_REVISION',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'PAST_SIMPLE_FORM',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'PAST_SIMPLE_VS_PRESENT_PERFECT',
    humanDecision: 'APPROVE_AFTER_REVISION',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'MODAL_BASE_VERB',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'BASIC_PREPOSITION_PATTERNS',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'BASIC_WORD_ORDER',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'DO_DOES_DID_QUESTIONS_NEGATIVES',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'COUNTABLE_UNCOUNTABLE',
    humanDecision: 'APPROVE_WITH_CAVEAT',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
  {
    ruleCode: 'SINGULAR_PLURAL_ARTICLE_AGREEMENT',
    humanDecision: 'APPROVE',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    reviewedContentVersion: 1,
  },
];
