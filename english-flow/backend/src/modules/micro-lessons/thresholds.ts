import { MicroCategoryString } from '../ai/ai.types';

/**
 * Порог срабатывания адаптивного микро-урока по категории: количество
 * ошибок за окно наблюдения (lookbackDays), после которого система
 * предлагает ученику разобрать паттерн.
 */
export const MICRO_LESSON_THRESHOLDS: Record<
  MicroCategoryString,
  { count: number; lookbackDays: number }
> = {
  THIRD_PERSON_SINGULAR: { count: 5, lookbackDays: 30 },
  ARTICLES: { count: 7, lookbackDays: 30 },
  PREPOSITIONS: { count: 6, lookbackDays: 30 },
  PRESENT_PERFECT: { count: 4, lookbackDays: 30 },
  PRESENT_SIMPLE: { count: 5, lookbackDays: 30 },
  PAST_SIMPLE: { count: 5, lookbackDays: 30 },
  WORD_ORDER: { count: 5, lookbackDays: 30 },
  COMPLY_VS_COMPLIANCE: { count: 3, lookbackDays: 30 },
  MAKE_VS_DO: { count: 4, lookbackDays: 30 },
  COUNTABLE_VS_UNCOUNTABLE: { count: 4, lookbackDays: 30 },
  COLLOCATIONS: { count: 5, lookbackDays: 30 },
  COMPLIANCE_VOCABULARY: { count: 4, lookbackDays: 30 },
};
