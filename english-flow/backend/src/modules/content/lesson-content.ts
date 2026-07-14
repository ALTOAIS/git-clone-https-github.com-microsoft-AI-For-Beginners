/**
 * Структура содержимого урока (Lesson.contentJson).
 * Единый формат для сидовых уроков и уроков, сгенерированных ИИ.
 */
export interface LessonPhrase {
  english: string;
  russian: string;
  hint?: string;
  example?: string;
  context?: string;
}

export type TranslationTaskType = 'ru_en' | 'en_ru' | 'missing' | 'order';

export interface TranslationTask {
  type: TranslationTaskType;
  prompt: string;
  answer: string;
  /** Для type=order: слова в перемешанном порядке */
  words?: string[];
  /** Допустимые альтернативные ответы */
  acceptable?: string[];
}

export interface LessonContent {
  newPhrases: LessonPhrase[];
  grammarPoint?: {
    title: string;
    explanation: string;
    examples: string[];
  };
  translationTasks: TranslationTask[];
  personalPrompt: {
    phrase: string;
    instruction: string;
  };
  speakingTask: {
    prompt: string;
    promptRu: string;
  };
  dialogue: {
    title: string;
    aiOpening: string;
    questions: string[];
  };
  reviewQuestions?: string[];
}

export function isValidLessonContent(value: unknown): value is LessonContent {
  if (!value || typeof value !== 'object') return false;
  const c = value as LessonContent;
  return (
    Array.isArray(c.newPhrases) &&
    c.newPhrases.every(
      (p) =>
        p &&
        typeof p.english === 'string' &&
        p.english.length > 0 &&
        typeof p.russian === 'string',
    ) &&
    Array.isArray(c.translationTasks) &&
    c.translationTasks.every(
      (t) =>
        t &&
        ['ru_en', 'en_ru', 'missing', 'order'].includes(t.type) &&
        typeof t.prompt === 'string' &&
        typeof t.answer === 'string',
    ) &&
    !!c.personalPrompt &&
    typeof c.personalPrompt.phrase === 'string' &&
    !!c.speakingTask &&
    typeof c.speakingTask.prompt === 'string' &&
    !!c.dialogue &&
    typeof c.dialogue.aiOpening === 'string' &&
    Array.isArray(c.dialogue.questions)
  );
}
