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
