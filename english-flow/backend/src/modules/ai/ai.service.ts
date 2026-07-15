import { Injectable, Logger } from '@nestjs/common';
import { isValidLessonContent } from '../content/lesson-content';
import {
  AiMode,
  CefrString,
  ConversationTurn,
  DetectedError,
  ERROR_TYPES,
  ErrorClassification,
  ErrorTypeString,
  ExtractedPhrasesResult,
  GeneratedLesson,
  GeneratedMicroLesson,
  MicroCategoryString,
  MicroLessonExercise,
  OpenTasksEvaluation,
  ReviewAnswerEvaluation,
  SentenceEvaluation,
  SimplifiedTextResult,
  SpeakingFeedback,
  SpeakingTurnResult,
  TranslationEvaluation,
} from './ai.types';
import {
  classifyErrorFallback,
  evaluateOpenTasksFallback,
  evaluateReviewAnswerFallback,
  evaluateSentenceFallback,
  evaluateTranslationFallback,
  extractPhrasesFallback,
  generateLessonFallback,
  generateMicroLessonFallback,
  simplifyTextFallback,
  speakingFeedbackFallback,
  speakingTurnFallback,
} from './fallbacks';
import { LlmClient } from './llm.client';
import {
  CONTENT_SIMPLIFIER_PROMPT,
  DIAGNOSTIC_EVALUATOR_PROMPT,
  ERROR_CLASSIFIER_PROMPT,
  GRAMMAR_CORRECTOR_PROMPT,
  LESSON_GENERATOR_PROMPT,
  MICRO_LESSON_GENERATOR_PROMPT,
  PHRASE_EXTRACTOR_PROMPT,
  REVIEW_EVALUATOR_PROMPT,
  PLAN_GENERATOR_PROMPT,
  SPEAKING_FEEDBACK_PROMPT,
  SPEAKING_PARTNER_PROMPT,
  TRANSLATION_EVALUATOR_PROMPT,
} from './prompts/prompts';

const CEFR_VALUES: CefrString[] = [
  'A1',
  'A1_PLUS',
  'A2',
  'A2_PLUS',
  'B1',
  'B1_PLUS',
  'B2',
  'C1',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly llm: LlmClient) {}

  get isRealAi(): boolean {
    return this.llm.isConfigured;
  }

  /** Общая обёртка: LLM с валидацией → детерминированный фолбэк. */
  private async withFallback<T extends { aiMode: string; aiError?: string }>(
    useCase: string,
    llmCall: () => Promise<T>,
    fallback: () => T,
  ): Promise<T> {
    if (!this.llm.isConfigured) {
      return fallback();
    }
    try {
      return await llmCall();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`LLM-вызов ${useCase} не удался: ${message}`);
      const result = fallback();
      result.aiError = message;
      return result;
    }
  }

  private sanitizeErrors(value: unknown): DetectedError[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (e) =>
          e &&
          typeof e.original === 'string' &&
          typeof e.corrected === 'string',
      )
      .map((e) => ({
        original: e.original,
        corrected: e.corrected,
        explanation: typeof e.explanation === 'string' ? e.explanation : '',
        errorType: this.sanitizeErrorType(e.errorType),
      }))
      .slice(0, 5);
  }

  private sanitizeErrorType(value: unknown): ErrorTypeString {
    return ERROR_TYPES.includes(value as ErrorTypeString)
      ? (value as ErrorTypeString)
      : 'OTHER';
  }

  private sanitizeCefr(value: unknown, def: CefrString = 'A2'): CefrString {
    return CEFR_VALUES.includes(value as CefrString)
      ? (value as CefrString)
      : def;
  }

  // ------------------------------------------------------------------
  // 2. Оценщик переводов
  // ------------------------------------------------------------------
  evaluateTranslation(input: {
    direction: 'ru_en' | 'en_ru';
    prompt: string;
    expected: string;
    acceptable?: string[];
    userAnswer: string;
    level: string;
  }): Promise<TranslationEvaluation> {
    return this.withFallback<TranslationEvaluation>(
      'evaluateTranslation',
      async () => {
        const raw = await this.llm.chatJson<TranslationEvaluation>(
          TRANSLATION_EVALUATOR_PROMPT,
          `Направление: ${input.direction === 'ru_en' ? 'с русского на английский' : 'с английского на русский'}
Задание: ${input.prompt}
Эталонный ответ: ${input.expected}
${input.acceptable?.length ? `Допустимые варианты: ${input.acceptable.join(' | ')}` : ''}
Уровень ученика: ${input.level}
Ответ ученика: ${input.userAnswer}`,
        );
        if (
          !['correct', 'mostly_correct', 'unnatural', 'incorrect'].includes(
            raw.verdict,
          )
        ) {
          throw new Error('LLM вернул неизвестный verdict');
        }
        return {
          aiMode: 'llm' as AiMode,
          verdict: raw.verdict,
          correctAnswer: raw.correctAnswer || input.expected,
          naturalAlternative: raw.naturalAlternative || undefined,
          explanation: raw.explanation || '',
          errors: this.sanitizeErrors(raw.errors),
        };
      },
      () =>
        evaluateTranslationFallback(
          input.expected,
          input.acceptable ?? [],
          input.userAnswer,
        ),
    );
  }

  // ------------------------------------------------------------------
  // 2b. Оценщик ответов в повторении (5 уровней + правило + примеры)
  // ------------------------------------------------------------------
  evaluateReviewAnswer(input: {
    taskType: string;
    targetEnglish: string;
    russian: string;
    acceptable?: string[];
    userAnswer: string;
    level: string;
  }): Promise<ReviewAnswerEvaluation> {
    const VALID: ReviewAnswerEvaluation['verdict'][] = [
      'correct',
      'minor_error',
      'unnatural',
      'significant_error',
      'wrong',
    ];
    return this.withFallback<ReviewAnswerEvaluation>(
      'evaluateReviewAnswer',
      async () => {
        const raw = await this.llm.chatJson<ReviewAnswerEvaluation>(
          REVIEW_EVALUATOR_PROMPT,
          `Тип задания: ${input.taskType}
Целевая фраза (эталон, английский): ${input.targetEnglish}
Русский смысл: ${input.russian}
${input.acceptable?.length ? `Допустимые варианты: ${input.acceptable.join(' | ')}` : ''}
Уровень ученика: ${input.level}
Ответ ученика: ${input.userAnswer}`,
        );
        if (!VALID.includes(raw.verdict)) {
          throw new Error('LLM вернул неизвестный verdict');
        }
        const accepted =
          raw.verdict === 'correct' || raw.verdict === 'minor_error';
        return {
          aiMode: 'llm' as AiMode,
          verdict: raw.verdict,
          accepted,
          corrected: raw.corrected || input.targetEnglish,
          natural: raw.natural || raw.corrected || input.targetEnglish,
          rule: raw.rule || '',
          examples: Array.isArray(raw.examples)
            ? raw.examples.filter((e) => typeof e === 'string').slice(0, 2)
            : [],
          errors: this.sanitizeErrors(raw.errors),
        };
      },
      () =>
        evaluateReviewAnswerFallback(
          input.targetEnglish,
          input.acceptable ?? [],
          input.userAnswer,
        ),
    );
  }

  // ------------------------------------------------------------------
  // 3. Корректор грамматики / личных предложений
  // ------------------------------------------------------------------
  evaluateSentence(input: {
    sentence: string;
    targetPhrase: string;
    level: string;
    context?: string;
  }): Promise<SentenceEvaluation> {
    return this.withFallback(
      'evaluateSentence',
      async () => {
        const raw = await this.llm.chatJson<SentenceEvaluation>(
          GRAMMAR_CORRECTOR_PROMPT,
          `Целевая фраза: ${input.targetPhrase}
${input.context ? `Контекст задания: ${input.context}` : ''}
Уровень ученика: ${input.level}
Предложение ученика: ${input.sentence}`,
        );
        if (!raw.corrected) throw new Error('LLM не вернул исправление');
        return {
          aiMode: 'llm' as AiMode,
          corrected: raw.corrected,
          natural: raw.natural || raw.corrected,
          explanation: raw.explanation || '',
          errors: this.sanitizeErrors(raw.errors),
        };
      },
      () => evaluateSentenceFallback(input.sentence, input.targetPhrase),
    );
  }

  // ------------------------------------------------------------------
  // 1. Оценщик диагностики (открытые задания)
  // ------------------------------------------------------------------
  evaluateDiagnosticOpenTasks(input: {
    writingAnswers: { prompt: string; answer: string }[];
    speakingTranscripts: { prompt: string; transcript: string }[];
    sectionScores: Record<string, number>;
  }): Promise<OpenTasksEvaluation> {
    return this.withFallback(
      'evaluateDiagnostic',
      async () => {
        const raw = await this.llm.chatJson<OpenTasksEvaluation>(
          DIAGNOSTIC_EVALUATOR_PROMPT,
          `Баллы закрытых секций (в процентах): ${JSON.stringify(input.sectionScores)}
Письменные ответы:
${input.writingAnswers.map((w, i) => `${i + 1}. Задание: ${w.prompt}\nОтвет: ${w.answer || '(пусто)'}`).join('\n')}
Транскрипты устных ответов:
${input.speakingTranscripts.map((s, i) => `${i + 1}. Задание: ${s.prompt}\nТранскрипт: ${s.transcript || '(пусто)'}`).join('\n')}`,
        );
        return {
          aiMode: 'llm' as AiMode,
          writingLevel: this.sanitizeCefr(raw.writingLevel),
          speakingLevel: this.sanitizeCefr(raw.speakingLevel, 'A1'),
          strengths: Array.isArray(raw.strengths)
            ? raw.strengths.slice(0, 5)
            : [],
          weaknesses: Array.isArray(raw.weaknesses)
            ? raw.weaknesses.slice(0, 5)
            : [],
          recurringErrors: this.sanitizeErrors(raw.recurringErrors),
          summary: raw.summary || '',
          suggestedTrack:
            raw.suggestedTrack || 'Разговорный английский для работы',
          recommendedDailyMinutes:
            Number(raw.recommendedDailyMinutes) > 0
              ? Math.min(Number(raw.recommendedDailyMinutes), 60)
              : 15,
        };
      },
      () =>
        evaluateOpenTasksFallback(
          input.writingAnswers.map((w) => w.answer),
          input.speakingTranscripts.map((s) => s.transcript),
        ),
    );
  }

  // ------------------------------------------------------------------
  // 4. Генератор уроков
  // ------------------------------------------------------------------
  generateLesson(input: {
    topic: string;
    level: CefrString;
    durationMinutes: number;
    phraseCount: number;
    focusSkill?: string;
    context?: string;
    sourceText?: string;
  }): Promise<GeneratedLesson> {
    return this.withFallback(
      'generateLesson',
      async () => {
        const raw = await this.llm.chatJson<GeneratedLesson>(
          LESSON_GENERATOR_PROMPT,
          `Тема: ${input.topic}
Уровень: ${input.level}
Длительность: ${input.durationMinutes} минут
Количество новых фраз: ${input.phraseCount}
${input.focusSkill ? `Фокусный навык: ${input.focusSkill}` : ''}
${input.context ? `Контекст: ${input.context}` : ''}
${input.sourceText ? `Материал-источник (используй его лексику):\n"""\n${input.sourceText.slice(0, 12000)}\n"""` : ''}`,
        );
        if (!isValidLessonContent(raw.content)) {
          throw new Error('LLM вернул урок в неожидаемом формате');
        }
        return {
          aiMode: 'llm' as AiMode,
          title: raw.title || input.topic,
          topic: raw.topic || input.topic,
          objective: raw.objective || '',
          level: this.sanitizeCefr(raw.level, input.level),
          durationMinutes:
            Number(raw.durationMinutes) > 0
              ? Number(raw.durationMinutes)
              : input.durationMinutes,
          content: raw.content,
        };
      },
      () =>
        generateLessonFallback(input.topic, input.level, input.durationMinutes),
    );
  }

  // ------------------------------------------------------------------
  // 5. Разговорный партнёр
  // ------------------------------------------------------------------
  speakingTurn(input: {
    scenarioTitle: string;
    scenarioQuestions: string[];
    level: string;
    history: ConversationTurn[];
    userMessage: string;
    userTurnCount: number;
    allowRussianHints: boolean;
  }): Promise<SpeakingTurnResult> {
    return this.withFallback<SpeakingTurnResult>(
      'speakingTurn',
      async () => {
        const historyText = input.history
          .slice(-12)
          .map((t) => `${t.role === 'user' ? 'Ученик' : 'Ты'}: ${t.text}`)
          .join('\n');
        const raw = await this.llm.chatJson<SpeakingTurnResult>(
          SPEAKING_PARTNER_PROMPT,
          `Сценарий: ${input.scenarioTitle}
Канва вопросов (используй как ориентир, адаптируйся к ответам): ${input.scenarioQuestions.join(' | ')}
Уровень ученика: ${input.level}
Подсказки на русском ${input.allowRussianHints ? 'разрешены при затруднениях' : 'давай только если ученик явно просит помощи'}.
История диалога:
${historyText}
Новая реплика ученика: ${input.userMessage}`,
        );
        if (!raw.reply) throw new Error('LLM не вернул реплику');
        return {
          aiMode: 'llm' as AiMode,
          reply: raw.reply,
          hintRu: raw.hintRu || undefined,
          done: !!raw.done,
        };
      },
      () => speakingTurnFallback(input.scenarioQuestions, input.userTurnCount),
    );
  }

  // ------------------------------------------------------------------
  // 6. Оценщик разговорной практики
  // ------------------------------------------------------------------
  speakingFeedback(input: {
    scenarioTitle: string;
    level: string;
    transcript: ConversationTurn[];
  }): Promise<SpeakingFeedback> {
    const userMessages = input.transcript
      .filter((t) => t.role === 'user')
      .map((t) => t.text);
    return this.withFallback(
      'speakingFeedback',
      async () => {
        const raw = await this.llm.chatJson<SpeakingFeedback>(
          SPEAKING_FEEDBACK_PROMPT,
          `Сценарий: ${input.scenarioTitle}
Уровень ученика: ${input.level}
Транскрипт:
${input.transcript.map((t) => `${t.role === 'user' ? 'Ученик' : 'ИИ'}: ${t.text}`).join('\n')}`,
        );
        return {
          aiMode: 'llm' as AiMode,
          wentWell: Array.isArray(raw.wentWell) ? raw.wentWell.slice(0, 3) : [],
          mistakes: this.sanitizeErrors(raw.mistakes),
          betterPhrases: Array.isArray(raw.betterPhrases)
            ? raw.betterPhrases
                .filter((p) => p && p.original && p.better)
                .slice(0, 5)
            : [],
          vocabulary: Array.isArray(raw.vocabulary)
            ? raw.vocabulary
                .filter((v) => v && v.english && v.russian)
                .slice(0, 5)
            : [],
        };
      },
      () => speakingFeedbackFallback(userMessages),
    );
  }

  // ------------------------------------------------------------------
  // 7. Классификатор ошибок
  // ------------------------------------------------------------------
  classifyError(input: {
    original: string;
    corrected: string;
  }): Promise<ErrorClassification> {
    return this.withFallback(
      'classifyError',
      async () => {
        const raw = await this.llm.chatJson<ErrorClassification>(
          ERROR_CLASSIFIER_PROMPT,
          `Фраза ученика: ${input.original}\nИсправление: ${input.corrected}`,
        );
        return {
          aiMode: 'llm' as AiMode,
          errorType: this.sanitizeErrorType(raw.errorType),
          explanation: raw.explanation || '',
        };
      },
      () => classifyErrorFallback(input.original, input.corrected),
    );
  }

  // ------------------------------------------------------------------
  // 8. Экстрактор фраз
  // ------------------------------------------------------------------
  extractPhrases(input: {
    text: string;
    count: number;
    level: string;
  }): Promise<ExtractedPhrasesResult> {
    return this.withFallback(
      'extractPhrases',
      async () => {
        const raw = await this.llm.chatJson<ExtractedPhrasesResult>(
          PHRASE_EXTRACTOR_PROMPT,
          `Количество фраз: до ${input.count}
Уровень ученика: ${input.level}
Текст:
"""
${input.text.slice(0, 16000)}
"""`,
        );
        if (!Array.isArray(raw.phrases) || raw.phrases.length === 0) {
          throw new Error('LLM не вернул фразы');
        }
        return {
          aiMode: 'llm' as AiMode,
          phrases: raw.phrases
            .filter((p) => p && p.english && p.russian)
            .slice(0, input.count),
        };
      },
      () => extractPhrasesFallback(input.text),
    );
  }

  // ------------------------------------------------------------------
  // 9. Упрощатель текстов
  // ------------------------------------------------------------------
  simplifyText(input: {
    text: string;
    level: string;
  }): Promise<SimplifiedTextResult> {
    return this.withFallback(
      'simplifyText',
      async () => {
        const raw = await this.llm.chatJson<SimplifiedTextResult>(
          CONTENT_SIMPLIFIER_PROMPT,
          `Уровень ученика: ${input.level}\nТекст:\n"""\n${input.text.slice(0, 16000)}\n"""`,
        );
        if (!raw.simplified) throw new Error('LLM не вернул текст');
        return { aiMode: 'llm' as AiMode, simplified: raw.simplified };
      },
      () => simplifyTextFallback(input.text),
    );
  }

  // ------------------------------------------------------------------
  // 10. Генератор учебного плана (недельная рекомендация)
  // ------------------------------------------------------------------
  generatePlanRecommendation(input: { profileSummary: string }): Promise<
    {
      recommendation: string;
      focusSkills: string[];
      suggestedTopics: string[];
    } & { aiMode: 'llm' | 'fallback'; aiError?: string }
  > {
    return this.withFallback(
      'generatePlanRecommendation',
      async () => {
        const raw = await this.llm.chatJson<{
          recommendation: string;
          focusSkills: string[];
          suggestedTopics: string[];
        }>(PLAN_GENERATOR_PROMPT, `Профиль ученика:\n${input.profileSummary}`);
        if (!raw.recommendation) throw new Error('LLM не вернул рекомендацию');
        return {
          aiMode: 'llm' as AiMode,
          recommendation: raw.recommendation,
          focusSkills: Array.isArray(raw.focusSkills) ? raw.focusSkills : [],
          suggestedTopics: Array.isArray(raw.suggestedTopics)
            ? raw.suggestedTopics
            : [],
        };
      },
      () => ({
        aiMode: 'fallback' as AiMode,
        recommendation:
          'Фокус недели: короткие ежедневные занятия — повторение фраз, один диалог с ИИ и работа над ошибками. Дев-режим ИИ: персональная рекомендация доступна при подключённом провайдере.',
        focusSkills: ['speaking', 'vocabulary'],
        suggestedTopics: ['Рассказ о себе', 'Моя работа', 'Комплаенс-риски'],
      }),
    );
  }

  // ------------------------------------------------------------------
  // 11. Генератор адаптивных микро-уроков по реальным ошибкам ученика
  // ------------------------------------------------------------------
  generateMicroLesson(input: {
    category: MicroCategoryString;
    level: string;
    userExamples: { original: string; corrected: string }[];
  }): Promise<GeneratedMicroLesson> {
    return this.withFallback<GeneratedMicroLesson>(
      'generateMicroLesson',
      async () => {
        const raw = await this.llm.chatJson<{
          ruleExplanation: string;
          additionalExamples: string[];
          exercises: unknown;
        }>(
          MICRO_LESSON_GENERATOR_PROMPT,
          `Категория ошибки: ${input.category}
Уровень ученика: ${input.level}
Реальные ошибки ученика (что сказал -> как правильно):
${input.userExamples.map((e, i) => `${i + 1}. "${e.original}" -> "${e.corrected}"`).join('\n')}`,
        );
        if (!raw.ruleExplanation) {
          throw new Error('LLM не вернул объяснение правила');
        }
        const exercises = this.sanitizeMicroExercises(raw.exercises);
        if (exercises.length === 0) {
          throw new Error('LLM не вернул упражнения');
        }
        return {
          aiMode: 'llm' as AiMode,
          content: {
            ruleExplanation: raw.ruleExplanation,
            additionalExamples: Array.isArray(raw.additionalExamples)
              ? raw.additionalExamples
                  .filter((e) => typeof e === 'string')
                  .slice(0, 3)
              : [],
            exercises,
          },
        };
      },
      () => generateMicroLessonFallback(input.category, input.userExamples),
    );
  }

  private sanitizeMicroExercises(value: unknown): MicroLessonExercise[] {
    if (!Array.isArray(value)) return [];
    const VALID_TYPES = ['fill_blank', 'correct_sentence', 'choice'];
    return value
      .filter(
        (e) =>
          e &&
          typeof e.prompt === 'string' &&
          typeof e.answer === 'string' &&
          VALID_TYPES.includes(e.type),
      )
      .map((e, i) => ({
        id: typeof e.id === 'string' ? e.id : `ex${i + 1}`,
        type: e.type,
        prompt: e.prompt,
        options: Array.isArray(e.options)
          ? e.options.filter((o: unknown) => typeof o === 'string')
          : undefined,
        answer: e.answer,
      }))
      .slice(0, 6);
  }
}
