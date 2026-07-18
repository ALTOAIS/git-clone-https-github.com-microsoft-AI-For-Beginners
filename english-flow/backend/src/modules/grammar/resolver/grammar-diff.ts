import { detectAnswerLanguage } from '../../errors/language-detector';

/**
 * Token-level structural diff between a learner's original text and its
 * corrected form — INSERT/DELETE/REPLACE only (MOVE deferred; word-order
 * changes are representable as paired DELETE+INSERT or REPLACE, per
 * english-flow/docs/content-pedagogy/grammar-resolver-contract.md).
 *
 * Pure, deterministic, synchronous. No AI, no I/O, no randomness — the
 * same (original, corrected) pair always produces the same GrammarDiff.
 */

export const GRAMMAR_DIFF_SCHEMA_VERSION = '1.0' as const;
export const GRAMMAR_DIFF_EXTRACTOR_VERSION = 'grammar-diff-v1' as const;

export type DiffOperationType = 'INSERT' | 'DELETE' | 'REPLACE';
export type DiffReliability = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DiffOperation {
  operation: DiffOperationType;
  originalStart: number;
  originalEnd: number;
  correctedStart: number;
  correctedEnd: number;
  originalText: string;
  correctedText: string;
  /** Lowercased, punctuation-stripped — same normalization classifyMicroCategory() already applies. */
  normalizedOriginal: string;
  normalizedCorrected: string;
}

export interface GrammarDiff {
  diffSchemaVersion: typeof GRAMMAR_DIFF_SCHEMA_VERSION;
  operations: DiffOperation[];
  extractorVersion: typeof GRAMMAR_DIFF_EXTRACTOR_VERSION;
  reliability: DiffReliability;
  /** Whitespace-split tokens, in order, normalized form only — exposed for matchers that need whole-sentence context beyond individual operations (e.g. "is there a modal anywhere in the sentence"). */
  originalTokens: string[];
  correctedTokens: string[];
}

interface Token {
  raw: string;
  normalized: string;
}

function tokenize(text: string): Token[] {
  const raw = text.trim().split(/\s+/).filter(Boolean);
  return raw.map((r) => ({
    raw: r,
    normalized: r.toLowerCase().replace(/[^a-z']/g, ''),
  }));
}

type EditStep =
  | { type: 'equal'; aIndex: number; bIndex: number }
  | { type: 'delete'; aIndex: number }
  | { type: 'insert'; bIndex: number };

/**
 * Classic LCS dynamic-programming alignment over normalized token arrays,
 * backtracked into an edit script. O(n*m) — sentence-length inputs only,
 * never used on arbitrary-length documents.
 */
function alignTokens(a: Token[], b: Token[]): EditStep[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i].normalized === b[j].normalized
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const steps: EditStep[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i].normalized === b[j].normalized) {
      steps.push({ type: 'equal', aIndex: i, bIndex: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      steps.push({ type: 'delete', aIndex: i });
      i++;
    } else {
      steps.push({ type: 'insert', bIndex: j });
      j++;
    }
  }
  while (i < n) {
    steps.push({ type: 'delete', aIndex: i });
    i++;
  }
  while (j < m) {
    steps.push({ type: 'insert', bIndex: j });
    j++;
  }
  return steps;
}

/**
 * Groups a run of consecutive delete/insert steps (no 'equal' between
 * them) into one operation: DELETE-only -> DELETE, INSERT-only -> INSERT,
 * both -> REPLACE. Tracks running positions in both sequences as it walks
 * `steps` once — an 'equal' step advances both positions together, so the
 * running counters are always the correct start position for the next
 * group, including a pure INSERT/DELETE group with nothing on the other
 * side to anchor to.
 */
function groupSteps(
  steps: EditStep[],
  a: Token[],
  b: Token[],
): DiffOperation[] {
  const operations: DiffOperation[] = [];
  let aPos = 0;
  let bPos = 0;
  let idx = 0;

  while (idx < steps.length) {
    const step = steps[idx];
    if (step.type === 'equal') {
      aPos++;
      bPos++;
      idx++;
      continue;
    }

    const originalStart = aPos;
    const correctedStart = bPos;
    let end = idx;
    while (end < steps.length && steps[end].type !== 'equal') {
      const s = steps[end];
      if (s.type === 'delete') aPos++;
      else bPos++;
      end++;
    }
    const originalEndIdx = aPos;
    const correctedEndIdx = bPos;

    const originalSlice = a.slice(originalStart, originalEndIdx);
    const correctedSlice = b.slice(correctedStart, correctedEndIdx);
    const hasDelete = originalEndIdx > originalStart;
    const hasInsert = correctedEndIdx > correctedStart;
    const operation: DiffOperationType =
      hasDelete && hasInsert ? 'REPLACE' : hasDelete ? 'DELETE' : 'INSERT';

    operations.push({
      operation,
      originalStart,
      originalEnd: originalEndIdx,
      correctedStart,
      correctedEnd: correctedEndIdx,
      originalText: originalSlice.map((t) => t.raw).join(' '),
      correctedText: correctedSlice.map((t) => t.raw).join(' '),
      normalizedOriginal: originalSlice.map((t) => t.normalized).join(' '),
      normalizedCorrected: correctedSlice.map((t) => t.normalized).join(' '),
    });

    idx = end;
  }
  return operations;
}

/**
 * Reliability grading — how trustworthy this specific diff extraction is,
 * independent of any rule matching. Resolver confidence can never exceed
 * this tier (see resolver.ts). Concrete, documented thresholds (no single
 * decided formula existed before this file; this is the implementation):
 *
 *  - LOW immediately if either text fails the existing deterministic
 *    language gate (detectAnswerLanguage) as non-English/empty/unclear —
 *    a diff over non-English or gibberish text is not a trustworthy basis
 *    for a grammar-rule match.
 *  - Otherwise HIGH when the edit is small and focused: at most 2
 *    operations AND at most 40% of the longer token sequence touched.
 *  - MEDIUM when still reasonably contained: at most 4 operations AND at
 *    most 60% touched.
 *  - LOW otherwise (many scattered changes, or a near-total rewrite) —
 *    the diff extraction itself is not judged reliable enough to support
 *    HIGH/MEDIUM resolver confidence, regardless of what any individual
 *    matcher would otherwise compute.
 */
function gradeReliability(
  operations: DiffOperation[],
  originalTokens: Token[],
  correctedTokens: Token[],
  originalText: string,
  correctedText: string,
): DiffReliability {
  const origLang = detectAnswerLanguage(originalText);
  const corrLang = detectAnswerLanguage(correctedText);
  const languageOk = (lang: string) => lang === 'EN' || lang === 'MIXED';
  if (!languageOk(origLang) || !languageOk(corrLang)) {
    return 'LOW';
  }

  const touchedTokens = operations.reduce((sum, op) => {
    const origSpan = op.originalEnd - op.originalStart;
    const corrSpan = op.correctedEnd - op.correctedStart;
    return sum + Math.max(origSpan, corrSpan);
  }, 0);
  const longerLength = Math.max(
    originalTokens.length,
    correctedTokens.length,
    1,
  );
  const changeRatio = touchedTokens / longerLength;

  if (operations.length <= 2 && changeRatio <= 0.4) return 'HIGH';
  if (operations.length <= 4 && changeRatio <= 0.6) return 'MEDIUM';
  return 'LOW';
}

/**
 * Computes the structural diff between a learner's original text and its
 * corrected form. No such extractor existed anywhere in the repository
 * before this file — this is new code (see resolver-inspection report),
 * not a reuse of an existing pipeline. Deliberately reuses the same
 * lowercasing/punctuation-stripping normalization style already used by
 * classifyMicroCategory() (../../errors/micro-category.classifier.ts) so
 * both deterministic layers treat tokens consistently.
 */
export function computeGrammarDiff(
  originalText: string,
  correctedText: string,
): GrammarDiff {
  const originalTokens = tokenize(originalText);
  const correctedTokens = tokenize(correctedText);
  const steps = alignTokens(originalTokens, correctedTokens);
  const operations = groupSteps(steps, originalTokens, correctedTokens);
  const reliability = gradeReliability(
    operations,
    originalTokens,
    correctedTokens,
    originalText,
    correctedText,
  );

  return {
    diffSchemaVersion: GRAMMAR_DIFF_SCHEMA_VERSION,
    operations,
    extractorVersion: GRAMMAR_DIFF_EXTRACTOR_VERSION,
    reliability,
    originalTokens: originalTokens.map((t) => t.normalized),
    correctedTokens: correctedTokens.map((t) => t.normalized),
  };
}
