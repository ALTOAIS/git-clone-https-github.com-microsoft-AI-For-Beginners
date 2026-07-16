import { MicroCategoryString } from '../ai/ai.types';
import { MICRO_LESSON_RULES } from '../ai/fallbacks';

/**
 * Развёрнутое объяснение правила по категории — переиспользуется из
 * контента микро-уроков (не дублируется). Используется для кнопки
 * «Подробнее о правиле» в карточке ошибки. Детерминированно, без ИИ.
 */
export const CATEGORY_RULE_DETAILS = MICRO_LESSON_RULES;

/**
 * Один дополнительный пример на категорию — только для отображения в
 * карточке ошибки («Дополнительный пример»), не участвует в проверке
 * ответа. Детерминированно, без ИИ (раздел 9 ТЗ).
 */
export const CATEGORY_ADDITIONAL_EXAMPLE: Record<MicroCategoryString, string> =
  {
    ARTICLES: 'She is a compliance officer.',
    THIRD_PERSON_SINGULAR: 'He checks reports every Monday.',
    PRESENT_SIMPLE: 'The department follows this policy.',
    PRESENT_PERFECT: 'I have already finished the risk assessment.',
    PAST_SIMPLE: 'Yesterday I went to work.',
    PREPOSITIONS: 'She is responsible for compliance.',
    WORD_ORDER: 'I always check the documents.',
    COMPLY_VS_COMPLIANCE: 'This department is responsible for compliance.',
    MAKE_VS_DO: 'We need to make a decision today.',
    COUNTABLE_VS_UNCOUNTABLE: 'We collected much evidence.',
    COLLOCATIONS: 'The team will conduct an investigation.',
    COMPLIANCE_VOCABULARY:
      'An employee who reports misconduct is called a whistleblower.',
  };

/**
 * Упрощённая версия правила (1 короткое предложение) — для кнопки «Не понял
 * объяснение» (раздел 3 доработок): основной текст ошибки уже показан в
 * карточке, здесь — более простая формулировка того же правила, а не новый
 * ИИ-вызов. Часть детерминированной Grammar Knowledge Base.
 */
export const CATEGORY_SIMPLIFIED_RULE: Record<MicroCategoryString, string> = {
  ARTICLES:
    'Перед одним предметом из многих — a/an, перед конкретным, уже известным — the.',
  THIRD_PERSON_SINGULAR:
    'После he/she/it в настоящем времени к глаголу добавляется -s.',
  PRESENT_SIMPLE:
    'Present Simple — для фактов и привычек. He/she/it требует -s у глагола.',
  PRESENT_PERFECT:
    'Present Perfect — когда результат важен сейчас, а не когда именно это было.',
  PAST_SIMPLE:
    'Past Simple — для завершённого действия в конкретный момент в прошлом.',
  PREPOSITIONS:
    'Предлог запоминается вместе с фразой целиком, не переводится дословно.',
  WORD_ORDER:
    'Порядок в английском: подлежащее → сказуемое → дополнение → обстоятельство.',
  COMPLY_VS_COMPLIANCE:
    'Comply — глагол, compliance — существительное, compliant — прилагательное.',
  MAKE_VS_DO: 'Make — когда что-то создаётся; do — когда действие выполняется.',
  COUNTABLE_VS_UNCOUNTABLE:
    'У неисчисляемых слов (information, advice) нет множественного числа и -s.',
  COLLOCATIONS:
    'Такие сочетания слов запоминаются целиком, а не собираются по отдельности.',
  COMPLIANCE_VOCABULARY:
    'Профессиональные термины имеют точное значение — не путайте близкие по смыслу.',
};

/**
 * Короткая «формула» правила — ещё компактнее упрощённого объяснения.
 */
export const CATEGORY_RULE_FORMULA: Record<MicroCategoryString, string> = {
  ARTICLES: 'a/an (одно из многих) · the (то самое, известное)',
  THIRD_PERSON_SINGULAR: 'he/she/it + глагол-s',
  PRESENT_SIMPLE: 'he/she/it + глагол-s · остальные + базовая форма',
  PRESENT_PERFECT: 'have/has + причастие прошедшего времени (V3)',
  PAST_SIMPLE: 'глагол + -ed (или неправильная форма)',
  PREPOSITIONS: 'глагол/прилагательное + фиксированный предлог',
  WORD_ORDER: 'подлежащее → сказуемое → дополнение → время/место',
  COMPLY_VS_COMPLIANCE:
    'comply (глагол) · compliance (сущ.) · compliant (прил.)',
  MAKE_VS_DO: 'make — создать/принять · do — выполнить/заняться',
  COUNTABLE_VS_UNCOUNTABLE: 'much/a lot of + неисчисляемое (без -s)',
  COLLOCATIONS: 'глагол + существительное — устойчивая пара',
  COMPLIANCE_VOCABULARY: 'термин = точное значение в контексте комплаенса',
};

export interface HelpDetails {
  /** Упрощённая версия объяснения (1 предложение). */
  simplified: string;
  /** Короткая формула правила, если применимо. */
  formula: string | null;
  /** Один контраст «неправильно → правильно» — берётся из самой ошибки. */
  contrast: { wrong: string; right: string };
}

/**
 * Детерминированный (без ИИ) набор данных для кнопки «Не понял объяснение»:
 * упрощённое объяснение + формула из Grammar Knowledge Base (если категория
 * определена), иначе — честный fallback на исходное explanation записи.
 * Контраст всегда берётся из originalText/correctedText самой ошибки —
 * ничего не выдумывается.
 */
export function buildHelpDetails(
  microCategory: string | null,
  originalText: string,
  correctedText: string,
  explanation: string,
): HelpDetails {
  const category = microCategory as MicroCategoryString | null;
  const simplified =
    (category && CATEGORY_SIMPLIFIED_RULE[category]) ||
    explanation ||
    'Сравните ваш вариант с правильным — отличие показано ниже.';
  const formula = (category && CATEGORY_RULE_FORMULA[category]) || null;
  return {
    simplified,
    formula,
    contrast: { wrong: originalText, right: correctedText },
  };
}

export interface BlankExercise {
  /** Предложение с пропуском, например "Yesterday I ___ home." */
  promptWithBlank: string;
  /** Слово/фраза, которая должна быть в пропуске */
  answer: string;
}

/**
 * Строит задание с пропуском из пары original/corrected — детерминированно,
 * без ИИ. Используется для повторной проверки (раздел 5: «менять
 * предложение и контекст»), чтобы не переспрашивать дословно то же
 * предложение. Возвращает null, если различие слишком сложное для
 * надёжного детерминированного пропуска (тогда вызывающий код показывает
 * обычное "исправьте предложение целиком").
 */
export function buildBlankExercise(
  original: string,
  corrected: string,
): BlankExercise | null {
  const origWords = original.trim().split(/\s+/);
  const corrWords = corrected.trim().split(/\s+/);
  if (origWords.length !== corrWords.length || origWords.length === 0) {
    return null;
  }
  const diffIndexes: number[] = [];
  for (let i = 0; i < corrWords.length; i++) {
    const a = origWords[i].toLowerCase().replace(/[.,!?;:]/g, '');
    const b = corrWords[i].toLowerCase().replace(/[.,!?;:]/g, '');
    if (a !== b) diffIndexes.push(i);
  }
  // Надёжно только для одного изменённого слова — иначе пропуск неоднозначен.
  if (diffIndexes.length !== 1) return null;
  const idx = diffIndexes[0];
  const answer = corrWords[idx].replace(/[.,!?;:]$/, '');
  const promptWithBlank = corrWords
    .map((w, i) => (i === idx ? '___' : w))
    .join(' ');
  return { promptWithBlank, answer };
}
