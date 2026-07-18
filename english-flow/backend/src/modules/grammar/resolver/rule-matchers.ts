import type { MicroCategoryString } from '../../ai/ai.types';
import type { DiffOperation, GrammarDiff } from './grammar-diff';
import type { GrammarRuleCandidate, RuleMatcher } from './resolver.types';

/**
 * One matcher function per approved Grammar MVP ruleCode. Every
 * structural signal and confidence tier below is transcribed from
 * english-flow/docs/content-pedagogy/grammar-resolver-test-cases.md's
 * per-rule signal table and "Diff-specific precedence" section — this
 * file implements that design, it does not invent new criteria.
 *
 * `existingMicroCategory` is accepted by every matcher's signature (per
 * the design doc's contract) but is a WEAK, OPTIONAL signal only — no
 * matcher below uses it as its sole or primary basis for a HIGH/MEDIUM
 * score. It is deliberately unused (or only used as a documented,
 * clearly-labeled tiebreak-adjacent hint) in nearly every matcher, per
 * the task's explicit "do not create fake one-to-one mappings between
 * MicroCategory and GrammarRule" instruction.
 *
 * Precedence between overlapping rules (e.g. MODAL_BASE_VERB vs.
 * DO_DOES_DID_QUESTIONS_NEGATIVES) is achieved entirely through each
 * matcher's own score, not through special-cased cross-rule logic in the
 * resolver — see MODAL_BASE_VERB's Case-B self-downgrade below.
 */

const MODALS = [
  'can',
  'could',
  'must',
  'should',
  'may',
  'might',
  'would',
  'shall',
];
const DO_SUPPORT_WORDS = ['do', 'does', 'did', "don't", "doesn't", "didn't"];
const FREQUENCY_ADVERBS = ['always', 'usually', 'often', 'never', 'sometimes'];

/** Same list classifyMicroCategory() already uses (../../errors/micro-category.classifier.ts), duplicated here per the design doc's own note that matchers keep independent curated lists rather than sharing DB/module state with the legacy classifier. */
const UNCOUNTABLE_NOUNS = [
  'information',
  'advice',
  'evidence',
  'research',
  'equipment',
  'knowledge',
  'feedback',
  'furniture',
  'software',
  'news',
  'progress',
  'compliance',
];

/** Nouns ending in -s that are grammatically singular — never a reliable plural signal (grammar-source-verification.md #12). */
const SINGULAR_DESPITE_S = [
  'news',
  'mathematics',
  'maths',
  'physics',
  'economics',
  'gymnastics',
  'aerobics',
  'measles',
  'mumps',
];
/** Same form singular/plural — an -s-ending corrected form proves nothing either way. */
const SAME_FORM_NOUNS = ['series', 'species'];

const PREPOSITIONS = [
  'in',
  'on',
  'at',
  'for',
  'to',
  'of',
  'with',
  'about',
  'from',
  'by',
  'into',
  'onto',
  'under',
  'over',
  'through',
  'between',
  'among',
  'during',
];

/** Curated verb/adjective + preposition patterns, per grammar-mvp-decision-pack.md's approved BASIC_PREPOSITION_PATTERNS content. */
const PREPOSITION_PATTERNS: Record<string, string[]> = {
  comply: ['with'],
  depend: ['on'],
  responsible: ['for'],
  interested: ['in'],
  good: ['at'],
  listen: ['to'],
  arrive: ['at', 'in'],
};

/** base -> past, both directions checked. Curated common-irregular list per grammar-resolver-test-cases.md. */
const IRREGULAR_PAST_PAIRS: Record<string, string> = {
  go: 'went',
  see: 'saw',
  have: 'had',
  do: 'did',
  be: 'was',
  take: 'took',
  make: 'made',
  come: 'came',
  get: 'got',
};
const IRREGULAR_PAST_TO_BASE: Record<string, string> = Object.fromEntries(
  Object.entries(IRREGULAR_PAST_PAIRS).map(([base, past]) => [past, base]),
);

const FINISHED_TIME_PATTERN =
  /\b(yesterday|last\s+\w+|in\s+(19|20)\d{2}|\w+\s+ago)\b/i;

function includesToken(tokens: string[], word: string): boolean {
  return tokens.includes(word);
}

function hasAnyModal(tokens: string[]): boolean {
  return MODALS.some((m) => tokens.includes(m));
}

function hasAnyDoSupport(tokens: string[]): boolean {
  return DO_SUPPORT_WORDS.some((w) => tokens.includes(w));
}

function isReliablePlural(noun: string): boolean {
  if (!noun.endsWith('s')) return false;
  if (noun.length <= 4) return false;
  if (SINGULAR_DESPITE_S.includes(noun)) return false;
  if (SAME_FORM_NOUNS.includes(noun)) return false;
  return true;
}

function opsOfType(
  diff: GrammarDiff,
  type: DiffOperation['operation'],
): DiffOperation[] {
  return diff.operations.filter((op) => op.operation === type);
}

// ---------------------------------------------------------------------
// Article rules
// ---------------------------------------------------------------------

/** a/an inserted or replacing another word, and the following noun does not carry a reliable plural signal (that case belongs to SINGULAR_PLURAL_ARTICLE_AGREEMENT instead). */
export const articleAAnMatcher: RuleMatcher = {
  ruleCode: 'ARTICLE_A_AN',
  match(diff): GrammarRuleCandidate | null {
    for (const op of [
      ...opsOfType(diff, 'INSERT'),
      ...opsOfType(diff, 'REPLACE'),
    ]) {
      if (op.normalizedCorrected !== 'a' && op.normalizedCorrected !== 'an')
        continue;
      const nextNoun = diff.correctedTokens[op.correctedEnd];
      if (nextNoun && isReliablePlural(nextNoun)) continue; // defers to SINGULAR_PLURAL_ARTICLE_AGREEMENT
      return {
        ruleCode: 'ARTICLE_A_AN',
        score: 3,
        reasons: [
          `'${op.normalizedCorrected}' inserted/changed before a singular noun`,
        ],
      };
    }
    return null;
  },
};

/** 'the' inserted or replacing a/an/gap. */
export const articleTheSpecificMatcher: RuleMatcher = {
  ruleCode: 'ARTICLE_THE_SPECIFIC',
  match(diff): GrammarRuleCandidate | null {
    for (const op of [
      ...opsOfType(diff, 'INSERT'),
      ...opsOfType(diff, 'REPLACE'),
    ]) {
      if (op.normalizedCorrected !== 'the') continue;
      return {
        ruleCode: 'ARTICLE_THE_SPECIFIC',
        score: 3,
        reasons: [
          "'the' inserted/changed in, replacing an indefinite article or a gap",
        ],
      };
    }
    return null;
  },
};

/** Article removed entirely (not replaced) before a plural or known-uncountable noun. */
export const articleZeroGeneralMatcher: RuleMatcher = {
  ruleCode: 'ARTICLE_ZERO_GENERAL',
  match(diff): GrammarRuleCandidate | null {
    for (const op of opsOfType(diff, 'DELETE')) {
      if (!['a', 'an', 'the'].includes(op.normalizedOriginal)) continue;
      const noun = diff.originalTokens[op.originalEnd];
      if (!noun) continue;
      // 'a'/'an' can never legitimately precede an uncountable noun in the
      // first place, regardless of general/specific meaning — removing it
      // is a countability fix, not a general-vs-specific one, so that
      // case is COUNTABLE_UNCOUNTABLE's territory, not this rule's. Only
      // 'the' removed before an uncountable noun is this rule's own
      // pattern (see grammar-mvp-decision-pack.md's "The compliance is
      // important." -> "Compliance is important." example).
      if (op.normalizedOriginal === 'the' && UNCOUNTABLE_NOUNS.includes(noun)) {
        return {
          ruleCode: 'ARTICLE_ZERO_GENERAL',
          score: 3,
          reasons: [`'the' removed before known-uncountable noun '${noun}'`],
        };
      }
      // Only 'the' removed before a plural is ARTICLE_ZERO_GENERAL's own
      // pattern (a specific plural becoming a general statement about the
      // class). 'a'/'an' removed next to a plural noun is a number
      // agreement error, not a general/specific meaning distinction —
      // that case belongs to SINGULAR_PLURAL_ARTICLE_AGREEMENT instead.
      if (op.normalizedOriginal === 'the' && isReliablePlural(noun)) {
        return {
          ruleCode: 'ARTICLE_ZERO_GENERAL',
          score: 2,
          reasons: [
            `'the' removed before plural noun '${noun}' (suffix-based signal)`,
          ],
        };
      }
    }
    return null;
  },
};

/** a/an inserted or removed AND the adjacent noun carries a reliable plural signal. Caps at MEDIUM: the only reliable-plural channel available to this resolver (no sourceContext input) is the suffix heuristic, and the morphology-safety rule forbids treating a bare suffix as HIGH evidence. */
export const singularPluralArticleAgreementMatcher: RuleMatcher = {
  ruleCode: 'SINGULAR_PLURAL_ARTICLE_AGREEMENT',
  match(diff): GrammarRuleCandidate | null {
    for (const op of [
      ...opsOfType(diff, 'DELETE'),
      ...opsOfType(diff, 'INSERT'),
    ]) {
      const articleWord =
        op.operation === 'DELETE'
          ? op.normalizedOriginal
          : op.normalizedCorrected;
      if (articleWord !== 'a' && articleWord !== 'an') continue;
      const noun =
        op.operation === 'DELETE'
          ? diff.originalTokens[op.originalEnd]
          : diff.correctedTokens[op.correctedEnd];
      if (!noun) continue;
      if (SINGULAR_DESPITE_S.includes(noun) || SAME_FORM_NOUNS.includes(noun))
        return null;
      if (isReliablePlural(noun)) {
        return {
          ruleCode: 'SINGULAR_PLURAL_ARTICLE_AGREEMENT',
          score: 2,
          reasons: [
            `a/an ${op.operation === 'DELETE' ? 'removed' : 'inserted'} next to plural-marked noun '${noun}' (suffix-based signal only, capped at MEDIUM)`,
          ],
        };
      }
    }
    return null;
  },
};

// ---------------------------------------------------------------------
// Verb-form rules
// ---------------------------------------------------------------------

/** he/she/it context + exact -s add/remove, do->does, or have->has on the main verb. No modal anywhere in the sentence (defers to MODAL_BASE_VERB); no do/does/did retained (defers to DO_DOES_DID_QUESTIONS_NEGATIVES — a retained 'doesn't works'->'doesn't work' change is do-support double-marking, not a bare missing-suffix error). */
export const presentSimpleThirdPersonMatcher: RuleMatcher = {
  ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
  match(diff): GrammarRuleCandidate | null {
    if (hasAnyModal(diff.originalTokens) || hasAnyModal(diff.correctedTokens))
      return null;
    if (
      hasAnyDoSupport(diff.originalTokens) &&
      hasAnyDoSupport(diff.correctedTokens)
    )
      return null;
    const thirdPersonContext =
      includesToken(diff.originalTokens, 'he') ||
      includesToken(diff.originalTokens, 'she') ||
      includesToken(diff.originalTokens, 'it') ||
      includesToken(diff.correctedTokens, 'he') ||
      includesToken(diff.correctedTokens, 'she') ||
      includesToken(diff.correctedTokens, 'it');
    if (!thirdPersonContext) return null;

    for (const op of opsOfType(diff, 'REPLACE')) {
      if (op.normalizedOriginal === 'do' && op.normalizedCorrected === 'does') {
        return {
          ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
          score: 3,
          reasons: ["'do' -> 'does'"],
        };
      }
      if (
        op.normalizedOriginal === 'have' &&
        op.normalizedCorrected === 'has'
      ) {
        return {
          ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
          score: 3,
          reasons: ["'have' -> 'has'"],
        };
      }
      if (
        op.normalizedCorrected === `${op.normalizedOriginal}s` &&
        op.normalizedOriginal.length > 2
      ) {
        return {
          ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
          score: 3,
          reasons: [
            `'-s' added to main verb: '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
      if (
        op.normalizedOriginal === `${op.normalizedCorrected}s` &&
        op.normalizedCorrected.length > 2
      ) {
        return {
          ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
          score: 3,
          reasons: [
            `'-s' removed from main verb: '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
      if (
        op.normalizedOriginal.endsWith('y') &&
        op.normalizedCorrected === `${op.normalizedOriginal.slice(0, -1)}ies`
      ) {
        return {
          ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
          score: 2,
          reasons: [
            `consonant+y -> -ies pattern: '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
    }
    return null;
  },
};

/** -ed added/removed or a known irregular past-tense pair, in either direction. No do/does/did anywhere (defers to DO_DOES_DID_QUESTIONS_NEGATIVES), no have/has added (defers to PAST_SIMPLE_VS_PRESENT_PERFECT). */
export const pastSimpleFormMatcher: RuleMatcher = {
  ruleCode: 'PAST_SIMPLE_FORM',
  match(diff): GrammarRuleCandidate | null {
    if (
      hasAnyDoSupport(diff.originalTokens) ||
      hasAnyDoSupport(diff.correctedTokens)
    )
      return null;
    const haveAdded =
      (includesToken(diff.correctedTokens, 'have') &&
        !includesToken(diff.originalTokens, 'have')) ||
      (includesToken(diff.correctedTokens, 'has') &&
        !includesToken(diff.originalTokens, 'has'));
    const haveRemoved =
      (includesToken(diff.originalTokens, 'have') &&
        !includesToken(diff.correctedTokens, 'have')) ||
      (includesToken(diff.originalTokens, 'has') &&
        !includesToken(diff.correctedTokens, 'has'));
    if (haveAdded || haveRemoved) return null;

    for (const op of opsOfType(diff, 'REPLACE')) {
      if (
        IRREGULAR_PAST_PAIRS[op.normalizedOriginal] === op.normalizedCorrected
      ) {
        return {
          ruleCode: 'PAST_SIMPLE_FORM',
          score: 3,
          reasons: [
            `known irregular base->past: '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
      if (
        IRREGULAR_PAST_TO_BASE[op.normalizedOriginal] === op.normalizedCorrected
      ) {
        return {
          ruleCode: 'PAST_SIMPLE_FORM',
          score: 3,
          reasons: [
            `known irregular past->base: '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
      const origEd =
        op.normalizedOriginal.endsWith('ed') &&
        op.normalizedOriginal.length > 3;
      const corrEd =
        op.normalizedCorrected.endsWith('ed') &&
        op.normalizedCorrected.length > 3;
      if (origEd !== corrEd) {
        return {
          ruleCode: 'PAST_SIMPLE_FORM',
          score: 2,
          reasons: [
            `regular -ed pattern: '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
    }
    return null;
  },
};

/** have/has inserted (direct signal, HIGH) or have/has REMOVED alongside a finished-time expression — the compensating heuristic for the reverse direction the legacy classifier doesn't catch (MEDIUM). Deliberately narrower than "any verb-tense change alongside a finished-time marker": that would collide with plain PAST_SIMPLE_FORM corrections (e.g. submit->submitted) that have nothing to do with present perfect. */
export const pastSimpleVsPresentPerfectMatcher: RuleMatcher = {
  ruleCode: 'PAST_SIMPLE_VS_PRESENT_PERFECT',
  match(diff): GrammarRuleCandidate | null {
    const haveAdded =
      (includesToken(diff.correctedTokens, 'have') &&
        !includesToken(diff.originalTokens, 'have')) ||
      (includesToken(diff.correctedTokens, 'has') &&
        !includesToken(diff.originalTokens, 'has'));
    if (haveAdded) {
      return {
        ruleCode: 'PAST_SIMPLE_VS_PRESENT_PERFECT',
        score: 3,
        reasons: ["'have'/'has' inserted as auxiliary"],
      };
    }

    const haveRemoved =
      (includesToken(diff.originalTokens, 'have') &&
        !includesToken(diff.correctedTokens, 'have')) ||
      (includesToken(diff.originalTokens, 'has') &&
        !includesToken(diff.correctedTokens, 'has'));
    const finishedTimeSignal =
      FINISHED_TIME_PATTERN.test(diff.originalTokens.join(' ')) ||
      FINISHED_TIME_PATTERN.test(diff.correctedTokens.join(' '));
    if (haveRemoved && finishedTimeSignal) {
      return {
        ruleCode: 'PAST_SIMPLE_VS_PRESENT_PERFECT',
        score: 2,
        reasons: ["'have'/'has' removed alongside a finished-time expression"],
      };
    }
    return null;
  },
};

/** Modal retained unchanged in both texts, following verb's form changed. Logged as a weak secondary candidate (score 1) whenever do-support was ALSO removed in the same diff — Case B: the primary error is "do-support used with a modal," not "malformed verb after modal" — regardless of whether this rule's own verb-form pattern also happens to match (per grammar-resolver-test-cases.md, a modal being merely involved is enough to log it as related, for observability). */
export const modalBaseVerbMatcher: RuleMatcher = {
  ruleCode: 'MODAL_BASE_VERB',
  match(diff): GrammarRuleCandidate | null {
    const retainedModal = MODALS.find(
      (m) =>
        includesToken(diff.originalTokens, m) &&
        includesToken(diff.correctedTokens, m),
    );
    if (!retainedModal) return null;

    const doSupportRemoved = DO_SUPPORT_WORDS.some(
      (w) =>
        includesToken(diff.originalTokens, w) &&
        !includesToken(diff.correctedTokens, w),
    );
    if (doSupportRemoved) {
      return {
        ruleCode: 'MODAL_BASE_VERB',
        score: 1,
        reasons: [
          'do-support incompatible with retained modal verb (secondary candidate — see DO_DOES_DID_QUESTIONS_NEGATIVES)',
        ],
      };
    }

    let matchedReason: string | null = null;
    for (const op of [
      ...opsOfType(diff, 'DELETE'),
      ...opsOfType(diff, 'REPLACE'),
    ]) {
      if (op.operation === 'DELETE' && op.normalizedOriginal === 'to') {
        matchedReason = `'to' removed after retained modal '${retainedModal}'`;
        break;
      }
      if (op.operation === 'REPLACE') {
        if (
          op.normalizedOriginal === `${op.normalizedCorrected}s` &&
          op.normalizedCorrected.length > 2
        ) {
          matchedReason = `'-s' removed after retained modal '${retainedModal}': '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`;
          break;
        }
        if (
          IRREGULAR_PAST_TO_BASE[op.normalizedOriginal] ===
            op.normalizedCorrected ||
          (op.normalizedOriginal.endsWith('ed') &&
            !op.normalizedCorrected.endsWith('ed'))
        ) {
          matchedReason = `past-tense form replaced by base form after retained modal '${retainedModal}': '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`;
          break;
        }
      }
    }
    if (!matchedReason) return null;
    return { ruleCode: 'MODAL_BASE_VERB', score: 3, reasons: [matchedReason] };
  },
};

/** do/does/did retained unchanged + main verb double-marking removed; OR do/does/did removed while a modal is retained (Case B primary side). */
export const doDoesDidQuestionsNegativesMatcher: RuleMatcher = {
  ruleCode: 'DO_DOES_DID_QUESTIONS_NEGATIVES',
  match(diff): GrammarRuleCandidate | null {
    const retainedModal = MODALS.find(
      (m) =>
        includesToken(diff.originalTokens, m) &&
        includesToken(diff.correctedTokens, m),
    );
    const removedDoSupport = DO_SUPPORT_WORDS.find(
      (w) =>
        includesToken(diff.originalTokens, w) &&
        !includesToken(diff.correctedTokens, w),
    );
    if (retainedModal && removedDoSupport) {
      return {
        ruleCode: 'DO_DOES_DID_QUESTIONS_NEGATIVES',
        score: 3,
        reasons: [
          `do-support ('${removedDoSupport}') incompatible with retained modal verb '${retainedModal}'`,
        ],
      };
    }

    const retainedDoSupport = DO_SUPPORT_WORDS.find(
      (w) =>
        includesToken(diff.originalTokens, w) &&
        includesToken(diff.correctedTokens, w),
    );
    if (!retainedDoSupport) return null;

    for (const op of opsOfType(diff, 'REPLACE')) {
      if (
        op.normalizedOriginal === `${op.normalizedCorrected}s` &&
        op.normalizedCorrected.length > 2
      ) {
        return {
          ruleCode: 'DO_DOES_DID_QUESTIONS_NEGATIVES',
          score: 3,
          reasons: [
            `redundant '-s' removed after retained '${retainedDoSupport}': '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
      if (
        op.normalizedOriginal.endsWith('ed') &&
        !op.normalizedCorrected.endsWith('ed') &&
        op.normalizedOriginal.length > 3
      ) {
        return {
          ruleCode: 'DO_DOES_DID_QUESTIONS_NEGATIVES',
          score: 3,
          reasons: [
            `redundant '-ed' removed after retained '${retainedDoSupport}': '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
      if (
        IRREGULAR_PAST_TO_BASE[op.normalizedOriginal] === op.normalizedCorrected
      ) {
        return {
          ruleCode: 'DO_DOES_DID_QUESTIONS_NEGATIVES',
          score: 3,
          reasons: [
            `double-marked irregular verb after retained '${retainedDoSupport}': '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
    }
    return null;
  },
};

// ---------------------------------------------------------------------
// Preposition / word-order / vocabulary rules
// ---------------------------------------------------------------------

/** Looks up a head word in PREPOSITION_PATTERNS, trying the exact token first and then its base form (strips a trailing -s so 'depends'/'complies' match 'depend'/'comply' — this rule's curated list is stored in base form only). */
function lookupPrepositionPattern(headWord: string): string[] | undefined {
  if (PREPOSITION_PATTERNS[headWord]) return PREPOSITION_PATTERNS[headWord];
  if (headWord.endsWith('s'))
    return PREPOSITION_PATTERNS[headWord.slice(0, -1)];
  return undefined;
}

/** Preposition changed AND the head word immediately before it is on the curated MVP pattern list. */
export const basicPrepositionPatternsMatcher: RuleMatcher = {
  ruleCode: 'BASIC_PREPOSITION_PATTERNS',
  match(diff): GrammarRuleCandidate | null {
    for (const op of [
      ...opsOfType(diff, 'REPLACE'),
      ...opsOfType(diff, 'INSERT'),
      ...opsOfType(diff, 'DELETE'),
    ]) {
      const isPrepChange =
        (op.normalizedOriginal !== '' &&
          PREPOSITIONS.includes(op.normalizedOriginal)) ||
        (op.normalizedCorrected !== '' &&
          PREPOSITIONS.includes(op.normalizedCorrected));
      if (!isPrepChange) continue;
      const headWord =
        diff.correctedTokens[op.correctedStart - 1] ??
        diff.originalTokens[op.originalStart - 1];
      if (!headWord) continue;
      const allowed = lookupPrepositionPattern(headWord);
      if (!allowed) continue;
      const newPrep = op.normalizedCorrected || null;
      if (newPrep && allowed.includes(newPrep)) {
        return {
          ruleCode: 'BASIC_PREPOSITION_PATTERNS',
          score: 3,
          reasons: [
            `'${headWord}' + '${newPrep}' matches the curated MVP preposition pattern list`,
          ],
        };
      }
    }
    return null;
  },
};

/** Same token multiset, different order, with a frequency adverb among the moved tokens. */
export const basicWordOrderMatcher: RuleMatcher = {
  ruleCode: 'BASIC_WORD_ORDER',
  match(diff): GrammarRuleCandidate | null {
    if (diff.operations.length === 0) return null;
    const sortedOrig = [...diff.originalTokens].sort();
    const sortedCorr = [...diff.correctedTokens].sort();
    const sameMultiset =
      sortedOrig.length === sortedCorr.length &&
      sortedOrig.every((t, i) => t === sortedCorr[i]);
    if (!sameMultiset) return null;
    if (diff.originalTokens.join(' ') === diff.correctedTokens.join(' '))
      return null;

    const frequencyAdverbInvolved = FREQUENCY_ADVERBS.some(
      (adv) =>
        diff.originalTokens.includes(adv) || diff.correctedTokens.includes(adv),
    );
    return {
      ruleCode: 'BASIC_WORD_ORDER',
      score: frequencyAdverbInvolved ? 3 : 2,
      reasons: [
        frequencyAdverbInvolved
          ? 'same words reordered, frequency adverb involved'
          : 'same words reordered (general S-V-O reorder)',
      ],
    };
  },
};

/** Known-uncountable noun pluralized in the original, an a/an used directly before a known-uncountable noun, or a many/much/few/less swap. */
export const countableUncountableMatcher: RuleMatcher = {
  ruleCode: 'COUNTABLE_UNCOUNTABLE',
  match(
    diff,
    existingMicroCategory: MicroCategoryString | null,
  ): GrammarRuleCandidate | null {
    for (const noun of UNCOUNTABLE_NOUNS) {
      if (diff.originalTokens.includes(`${noun}s`)) {
        return {
          ruleCode: 'COUNTABLE_UNCOUNTABLE',
          score: 3,
          reasons: [
            `known-uncountable noun '${noun}' pluralized in the original`,
          ],
        };
      }
    }
    for (const op of [
      ...opsOfType(diff, 'REPLACE'),
      ...opsOfType(diff, 'DELETE'),
    ]) {
      if (op.normalizedOriginal !== 'a' && op.normalizedOriginal !== 'an')
        continue;
      const noun = diff.originalTokens[op.originalEnd];
      if (noun && UNCOUNTABLE_NOUNS.includes(noun)) {
        return {
          ruleCode: 'COUNTABLE_UNCOUNTABLE',
          score: 3,
          reasons: [
            `'${op.normalizedOriginal}' used directly before known-uncountable noun '${noun}'`,
          ],
        };
      }
    }
    const quantifiers = ['many', 'much', 'few', 'fewer', 'less'];
    for (const op of opsOfType(diff, 'REPLACE')) {
      if (
        quantifiers.includes(op.normalizedOriginal) &&
        quantifiers.includes(op.normalizedCorrected)
      ) {
        return {
          ruleCode: 'COUNTABLE_UNCOUNTABLE',
          score: 3,
          reasons: [
            `quantifier swap: '${op.normalizedOriginal}' -> '${op.normalizedCorrected}'`,
          ],
        };
      }
    }
    // existingMicroCategory referenced only as documentation of the weak-hint contract; never required or authoritative.
    void existingMicroCategory;
    return null;
  },
};

export const RULE_MATCHERS: RuleMatcher[] = [
  articleAAnMatcher,
  articleTheSpecificMatcher,
  articleZeroGeneralMatcher,
  presentSimpleThirdPersonMatcher,
  pastSimpleFormMatcher,
  pastSimpleVsPresentPerfectMatcher,
  modalBaseVerbMatcher,
  basicPrepositionPatternsMatcher,
  basicWordOrderMatcher,
  doDoesDidQuestionsNegativesMatcher,
  countableUncountableMatcher,
  singularPluralArticleAgreementMatcher,
];
