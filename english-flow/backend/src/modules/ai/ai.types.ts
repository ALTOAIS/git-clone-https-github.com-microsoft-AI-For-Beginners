import { LessonContent } from '../content/lesson-content';

/** Режим ответа ИИ: реальная LLM или явно помеченный дев-фолбэк. */
export type AiMode = 'llm' | 'fallback';

/**
 * Почему конкретный ответ ушёл в fallback — различает три разных по смыслу
 * ситуации для UI и логов:
 *  - not_configured: AI_PROVIDER/AI_API_KEY/AI_MODEL не заданы вовсе;
 *  - llm_error: провайдер настроен, но вызов не удался (после всех повторов);
 *  - invalid_json: провайдер ответил, но ответ не удалось разобрать как JSON.
 */
export type FallbackReason = 'not_configured' | 'llm_error' | 'invalid_json';

export interface AiMeta {
  aiMode: AiMode;
  aiError?: string;
  /** Сколько повторных попыток было сделано (0 — с первого раза). */
  retryCount?: number;
  /** Причина fallback — присутствует только когда aiMode === 'fallback'. */
  fallbackReason?: FallbackReason;
  /** HTTP-статус провайдера при последней неудачной попытке (если был). */
  providerStatus?: number;
}

export const ERROR_TYPES = [
  'ARTICLE',
  'VERB_TENSE',
  'VERB_FORM',
  'WORD_ORDER',
  'PREPOSITION',
  'VOCABULARY',
  'COLLOCATION',
  'PRONUNCIATION',
  'LITERAL_TRANSLATION',
  'MISSING_WORD',
  'UNNATURAL_PHRASE',
  'OTHER',
] as const;

export type ErrorTypeString = (typeof ERROR_TYPES)[number];

export interface DetectedError {
  original: string;
  corrected: string;
  explanation: string;
  errorType: ErrorTypeString;
}

export type TranslationVerdict =
  'correct' | 'mostly_correct' | 'unnatural' | 'incorrect';

export interface TranslationEvaluation extends AiMeta {
  verdict: TranslationVerdict;
  correctAnswer: string;
  naturalAlternative?: string;
  explanation: string;
  errors: DetectedError[];
}

export interface SentenceEvaluation extends AiMeta {
  corrected: string;
  natural: string;
  explanation: string;
  errors: DetectedError[];
}

/** Пять уровней качества ответа в повторении (раздел «интеллектуальная проверка»). */
export type ReviewVerdict =
  | 'correct' // полностью правильный
  | 'minor_error' // правильный смысл, небольшая грамматическая ошибка
  | 'unnatural' // понятный, но неестественный
  | 'significant_error' // существенная ошибка
  | 'wrong'; // полностью неправильный

export interface ReviewAnswerEvaluation extends AiMeta {
  verdict: ReviewVerdict;
  /** Считается ли ответ «зачётным» для продвижения по SRS */
  accepted: boolean;
  corrected: string;
  natural: string;
  /** Короткое объяснение правила на русском */
  rule: string;
  /** 1–2 дополнительных примера на английском */
  examples: string[];
  errors: DetectedError[];
}

export interface SpeakingTurnResult extends AiMeta {
  reply: string;
  hintRu?: string;
  done: boolean;
}

export interface SpeakingFeedback extends AiMeta {
  wentWell: string[];
  mistakes: DetectedError[];
  betterPhrases: { original: string; better: string }[];
  vocabulary: { english: string; russian: string }[];
}

export type CefrString =
  'A1' | 'A1_PLUS' | 'A2' | 'A2_PLUS' | 'B1' | 'B1_PLUS' | 'B2' | 'C1';

export interface OpenTasksEvaluation extends AiMeta {
  writingLevel: CefrString;
  speakingLevel: CefrString;
  strengths: string[];
  weaknesses: string[];
  recurringErrors: DetectedError[];
  summary: string;
  suggestedTrack: string;
  recommendedDailyMinutes: number;
}

export interface GeneratedLesson extends AiMeta {
  title: string;
  topic: string;
  objective: string;
  level: CefrString;
  durationMinutes: number;
  content: LessonContent;
}

export interface ExtractedPhrase {
  english: string;
  russian: string;
  category?: string;
  example?: string;
}

export interface ExtractedPhrasesResult extends AiMeta {
  phrases: ExtractedPhrase[];
}

export interface SimplifiedTextResult extends AiMeta {
  simplified: string;
}

export interface ErrorClassification extends AiMeta {
  errorType: ErrorTypeString;
  explanation: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export const MICRO_CATEGORIES = [
  'ARTICLES',
  'THIRD_PERSON_SINGULAR',
  'PRESENT_SIMPLE',
  'PRESENT_PERFECT',
  'PAST_SIMPLE',
  'PREPOSITIONS',
  'WORD_ORDER',
  'COMPLY_VS_COMPLIANCE',
  'MAKE_VS_DO',
  'COUNTABLE_VS_UNCOUNTABLE',
  'COLLOCATIONS',
  'COMPLIANCE_VOCABULARY',
] as const;

export type MicroCategoryString = (typeof MICRO_CATEGORIES)[number];

export interface MicroLessonExercise {
  id: string;
  type: 'fill_blank' | 'correct_sentence' | 'choice';
  prompt: string;
  options?: string[];
  answer: string;
}

export interface MicroLessonContent {
  ruleExplanation: string;
  additionalExamples: string[];
  exercises: MicroLessonExercise[];
}

export interface GeneratedMicroLesson extends AiMeta {
  content: MicroLessonContent;
}
