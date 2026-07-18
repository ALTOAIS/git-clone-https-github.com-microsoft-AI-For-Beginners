/**
 * Deterministic structural validation for the Grammar MVP content source
 * (grammar-rules.data.ts) and review manifest (grammar-review-manifest.ts),
 * run before every import so a malformed source can never reach the
 * database. Hand-rolled, no external library — matches the existing
 * isValidLessonContent() pattern (../content/lesson-content.ts).
 */

import { EXPECTED_GRAMMAR_RULE_CODES } from './grammar-rules.expected-codes';
import type { GrammarRuleContentSource } from './grammar-rules.data';
import type { GrammarRuleReviewEntry } from './grammar-review-manifest';
import {
  findUnsupportedExerciseTypes,
  isValidGrammarExerciseTemplateSet,
} from './exercise-templates';

export interface GrammarSourceValidationResult {
  valid: boolean;
  errors: string[];
}

function findDuplicates(codes: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const code of codes) {
    if (seen.has(code)) duplicates.add(code);
    seen.add(code);
  }
  return [...duplicates];
}

/** Every required non-empty string field, per rule, missing or blank. */
function findMissingRequiredContent(rule: GrammarRuleContentSource): string[] {
  const missing: string[] = [];
  if (!rule.ruleCode || rule.ruleCode.trim().length === 0)
    missing.push('ruleCode');
  if (!rule.titleRu || rule.titleRu.trim().length === 0)
    missing.push('titleRu');
  if (!rule.shortExplanationRu || rule.shortExplanationRu.trim().length === 0) {
    missing.push('shortExplanationRu');
  }
  if (!rule.explanationRu || rule.explanationRu.trim().length === 0)
    missing.push('explanationRu');
  if (!rule.cefrLevel) missing.push('cefrLevel');
  if (!Array.isArray(rule.examples) || rule.examples.length === 0)
    missing.push('examples');
  else {
    rule.examples.forEach((example, index) => {
      if (!example.sentence || example.sentence.trim().length === 0) {
        missing.push(`examples[${index}].sentence`);
      }
      if (!example.exampleType) missing.push(`examples[${index}].exampleType`);
    });
  }
  return missing;
}

/**
 * Validates the full content source list: exactly the 12 expected
 * ruleCodes (no more, no fewer, no duplicates), required content present,
 * and every rule's exerciseTemplates using only supported exercise types.
 */
export function validateGrammarRulesSource(
  rules: GrammarRuleContentSource[],
): GrammarSourceValidationResult {
  const errors: string[] = [];
  const codes = rules.map((r) => r.ruleCode);

  const duplicates = findDuplicates(codes);
  if (duplicates.length > 0) {
    errors.push(
      `Duplicate ruleCode(s) found in source: ${duplicates.join(', ')}`,
    );
  }

  const uniqueCodes = new Set(codes);
  const missingExpected = EXPECTED_GRAMMAR_RULE_CODES.filter(
    (c) => !uniqueCodes.has(c),
  );
  const unexpectedExtra = [...uniqueCodes].filter(
    (c) => !EXPECTED_GRAMMAR_RULE_CODES.includes(c),
  );
  if (missingExpected.length > 0) {
    errors.push(`Missing expected ruleCode(s): ${missingExpected.join(', ')}`);
  }
  if (unexpectedExtra.length > 0) {
    errors.push(
      `Unexpected ruleCode(s) not in the approved set of 12: ${unexpectedExtra.join(', ')}`,
    );
  }
  if (rules.length !== EXPECTED_GRAMMAR_RULE_CODES.length) {
    errors.push(
      `Expected exactly ${EXPECTED_GRAMMAR_RULE_CODES.length} rules, found ${rules.length}`,
    );
  }

  for (const rule of rules) {
    const missing = findMissingRequiredContent(rule);
    if (missing.length > 0) {
      errors.push(
        `Rule "${rule.ruleCode || '(unknown)'}" is missing required content: ${missing.join(', ')}`,
      );
    }

    if (!isValidGrammarExerciseTemplateSet(rule.exerciseTemplates)) {
      const unsupported = findUnsupportedExerciseTypes(rule.exerciseTemplates);
      if (unsupported.length > 0) {
        errors.push(
          `Rule "${rule.ruleCode}" uses unsupported exercise type(s): ${unsupported.join(', ')}`,
        );
      } else {
        errors.push(
          `Rule "${rule.ruleCode}" has an invalid exerciseTemplates structure`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates the review manifest: no duplicate ruleCodes, and every
 * content-source ruleCode has a corresponding manifest entry (checked
 * against the same rules list passed to validateGrammarRulesSource).
 */
export function validateGrammarReviewManifest(
  manifest: GrammarRuleReviewEntry[],
  rules: GrammarRuleContentSource[],
): GrammarSourceValidationResult {
  const errors: string[] = [];
  const manifestCodes = manifest.map((m) => m.ruleCode);

  const duplicates = findDuplicates(manifestCodes);
  if (duplicates.length > 0) {
    errors.push(
      `Duplicate ruleCode(s) found in review manifest: ${duplicates.join(', ')}`,
    );
  }

  const manifestCodeSet = new Set(manifestCodes);
  const missingManifestEntries = rules
    .map((r) => r.ruleCode)
    .filter((code) => !manifestCodeSet.has(code));
  if (missingManifestEntries.length > 0) {
    errors.push(
      `Content source ruleCode(s) with no review manifest entry: ${missingManifestEntries.join(', ')}`,
    );
  }

  for (const entry of manifest) {
    if (entry.sourceVerificationStatus === 'VERIFIED_DIRECTLY') {
      errors.push(
        `Rule "${entry.ruleCode}" claims VERIFIED_DIRECTLY, but no rule in this import round has cleared direct source verification — refusing to import an unsupported verification tier.`,
      );
    }
    if (
      entry.sourceVerificationStatus ===
      'VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE'
    ) {
      errors.push(
        `Rule "${entry.ruleCode}" claims VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE, but no rule in this import round has cleared that verification tier — refusing to import an unsupported verification tier.`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
