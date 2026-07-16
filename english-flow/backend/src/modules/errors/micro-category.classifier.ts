import { MicroCategoryString } from '../ai/ai.types';

/**
 * Детерминированная (не-ИИ) классификация ошибки в узкую категорию для
 * адаптивных микро-уроков. Работает по эвристикам над diff'ом original/corrected,
 * чтобы не менять 5 существующих промптов детекции ошибок и не рисковать
 * каскадными регрессиями в JSON-контракте ИИ.
 */

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

const COMPLIANCE_TERMS = [
  'regulator',
  'regulatory',
  'audit',
  'auditor',
  'risk',
  'governance',
  'anti-corruption',
  'anticorruption',
  'aml',
  'kyc',
  'sanction',
  'sanctions',
  'disclosure',
  'whistleblower',
  'bribery',
  'due diligence',
  'control',
  'policy',
  'policies',
  'oversight',
  'misconduct',
  'violation',
  'breach',
  'enforcement',
  'internal control',
];

const UNCOUNTABLE_HINTS = [
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
];

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

function hasWord(words: string[], list: string[]): boolean {
  return words.some((w) => list.includes(w));
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return [...a].sort().join(' ') === [...b].sort().join(' ');
}

export function classifyMicroCategory(
  original: string,
  corrected: string,
): MicroCategoryString | null {
  const orig = tokens(original);
  const corr = tokens(corrected);
  const combined = [...orig, ...corr];

  // Доменная лексика — проверяем в первую очередь, т.к. она специфична.
  if (
    combined.some(
      (w) =>
        w.includes('comply') ||
        w.includes('complian') ||
        w.includes('compliant'),
    )
  ) {
    return 'COMPLY_VS_COMPLIANCE';
  }
  if (
    COMPLIANCE_TERMS.some(
      (term) =>
        corrected.toLowerCase().includes(term) ||
        original.toLowerCase().includes(term),
    )
  ) {
    return 'COMPLIANCE_VOCABULARY';
  }

  // make/do
  const makeDoOrig = orig.filter((w) =>
    ['make', 'makes', 'made', 'do', 'does', 'did'].includes(w),
  );
  const makeDoCorr = corr.filter((w) =>
    ['make', 'makes', 'made', 'do', 'does', 'did'].includes(w),
  );
  if (
    makeDoOrig.length > 0 &&
    makeDoCorr.length > 0 &&
    makeDoOrig.join(',') !== makeDoCorr.join(',')
  ) {
    return 'MAKE_VS_DO';
  }

  // Артикли: разница именно в наличии/отсутствии a/an/the.
  const origArticles = orig.filter((w) => ['a', 'an', 'the'].includes(w));
  const corrArticles = corr.filter((w) => ['a', 'an', 'the'].includes(w));
  const nonArticleOrig = orig.filter((w) => !['a', 'an', 'the'].includes(w));
  const nonArticleCorr = corr.filter((w) => !['a', 'an', 'the'].includes(w));
  if (
    origArticles.join(',') !== corrArticles.join(',') &&
    sameMultiset(nonArticleOrig, nonArticleCorr)
  ) {
    return 'ARTICLES';
  }

  // Countable/uncountable: uncountable noun pluralised, or much/many/a lot of/fewer/less swap.
  if (
    UNCOUNTABLE_HINTS.some((noun) =>
      original.toLowerCase().includes(`${noun}s`),
    ) ||
    (hasWord(orig, ['many', 'much', 'few', 'fewer', 'less']) &&
      hasWord(corr, ['many', 'much', 'few', 'fewer', 'less']) &&
      orig.join(',') !== corr.join(','))
  ) {
    return 'COUNTABLE_VS_UNCOUNTABLE';
  }

  // Предлоги: одно слово заменено, оба варианта — предлоги (или один предлог добавлен/убран).
  const prepOrig = orig.filter((w) => PREPOSITIONS.includes(w));
  const prepCorr = corr.filter((w) => PREPOSITIONS.includes(w));
  if (prepOrig.join(',') !== prepCorr.join(',')) {
    const nonPrepOrig = orig.filter((w) => !PREPOSITIONS.includes(w));
    const nonPrepCorr = corr.filter((w) => !PREPOSITIONS.includes(w));
    if (sameMultiset(nonPrepOrig, nonPrepCorr)) {
      return 'PREPOSITIONS';
    }
  }

  // Present perfect: has/have + причастие (частый маркер -ed или неправильные формы been/done/gone/seen...)
  if (
    /\b(has|have)\s+\w+/i.test(corrected) &&
    !/\b(has|have)\s+\w+/i.test(original)
  ) {
    return 'PRESENT_PERFECT';
  }

  // Порядок слов: тот же набор слов, другой порядок.
  if (
    orig.length > 2 &&
    sameMultiset(orig, corr) &&
    orig.join(' ') !== corr.join(' ')
  ) {
    return 'WORD_ORDER';
  }

  // Third person singular: he/she/it + глагол без -s -> глагол с -s (или наоборот отсутствие -s).
  const thirdPersonPattern = /\b(he|she|it|[a-z]+ (he|she|it))\b/i;
  if (thirdPersonPattern.test(original) || thirdPersonPattern.test(corrected)) {
    const addedS = corr.some((w, i) => {
      const before = orig[i];
      return before && w === `${before}s` && w.length > 3;
    });
    const removedS = orig.some((w, i) => {
      const after = corr[i];
      return after && w === `${after}s` && w.length > 3;
    });
    if (addedS || removedS) return 'THIRD_PERSON_SINGULAR';
  }

  // Past simple: -ed добавлено/убрано или неправильная форма прошедшего времени.
  const pastEdOrig = orig.some((w) => w.endsWith('ed') && w.length > 3);
  const pastEdCorr = corr.some((w) => w.endsWith('ed') && w.length > 3);
  if (pastEdOrig !== pastEdCorr) {
    return 'PAST_SIMPLE';
  }

  // Present simple как более общий откат для оставшихся видо-временных различий.
  if (
    hasWord(orig, ['am', 'is', 'are', 'do', 'does']) ||
    hasWord(corr, ['am', 'is', 'are', 'do', 'does'])
  ) {
    if (orig.join(' ') !== corr.join(' ')) return 'PRESENT_SIMPLE';
  }

  // Коллокации как финальный откат — устойчивые словосочетания, не подошедшие под другое.
  if (
    orig.length <= 4 &&
    corr.length <= 4 &&
    orig.join(' ') !== corr.join(' ')
  ) {
    return 'COLLOCATIONS';
  }

  return null;
}
