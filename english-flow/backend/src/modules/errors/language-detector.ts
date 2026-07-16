/**
 * Детерминированная (не-ИИ) классификация языка ответа ученика — раздел 9
 * ТЗ требует, чтобы Empty/Cyrillic-определение было детерминированным, а не
 * зависело от доступности LLM.
 */

export type DetectedLanguageValue = 'EN' | 'RU' | 'MIXED' | 'EMPTY' | 'UNCLEAR';

const CYRILLIC_RE = /[а-яёА-ЯЁ]/g;
const LATIN_RE = /[a-zA-Z]/g;
const VOWEL_RE = /[aeiou]/;

/** Грубая эвристика «похоже на случайный набор символов»: нет ни одного
 * латинского слова длиной >=2 с гласной внутри. */
function looksLikeGibberish(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length === 0) return true;
  return !words.some((w) => w.length >= 2 && VOWEL_RE.test(w));
}

export function detectAnswerLanguage(text: string): DetectedLanguageValue {
  const trimmed = text.trim();
  if (!trimmed) return 'EMPTY';

  const cyrillicCount = (trimmed.match(CYRILLIC_RE) ?? []).length;
  const latinCount = (trimmed.match(LATIN_RE) ?? []).length;
  const totalLetters = cyrillicCount + latinCount;

  if (totalLetters === 0) return 'UNCLEAR'; // только цифры/пунктуация

  const cyrillicRatio = cyrillicCount / totalLetters;
  if (cyrillicRatio >= 0.9) return 'RU';
  if (cyrillicRatio <= 0.1) {
    return looksLikeGibberish(trimmed) ? 'UNCLEAR' : 'EN';
  }
  return 'MIXED';
}

/**
 * Для смешанного ответа пытается надёжно выделить английскую часть.
 * Возвращает null, если английской части недостаточно (нужно попросить
 * повторить ответ полностью на английском) — раздел 3 ТЗ.
 */
export function extractEnglishPart(text: string): string | null {
  const englishWords = text.match(/[a-zA-Z']+/g) ?? [];
  if (englishWords.length < 2) return null;
  const candidate = englishWords.join(' ');
  if (looksLikeGibberish(candidate)) return null;
  return candidate;
}

export interface LanguageIssueInfo {
  detectedLanguage: 'RU' | 'MIXED' | 'EMPTY' | 'UNCLEAR';
  message: string;
  hint?: string;
  firstWord?: string;
  example?: string;
}

const MESSAGES: Record<'RU' | 'MIXED' | 'EMPTY' | 'UNCLEAR', string> = {
  RU: 'Вы ответили по-русски. Попробуйте выразить эту мысль на английском.',
  MIXED:
    'Ответ похож на смесь русского и английского. Попробуйте выразить мысль полностью на английском.',
  EMPTY: 'Ответ пустой. Введите вариант на английском.',
  UNCLEAR: 'Ответ не удалось распознать. Попробуйте ещё раз.',
};

/**
 * Строит честное (детерминированное, без ИИ) сообщение о проблеме языка
 * ответа, с необязательной подсказкой на основе уже известного эталона.
 */
export function buildLanguageIssue(
  detected: 'RU' | 'MIXED' | 'EMPTY' | 'UNCLEAR',
  expected?: string,
): LanguageIssueInfo {
  const firstWord = expected?.trim().split(/\s+/)[0];
  return {
    detectedLanguage: detected,
    message: MESSAGES[detected],
    hint: firstWord ? `Начните с: "${firstWord}"` : undefined,
    firstWord,
    example: expected,
  };
}
