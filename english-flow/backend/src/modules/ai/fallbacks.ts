import { LessonContent } from '../content/lesson-content';
import {
  CefrString,
  DetectedError,
  ErrorClassification,
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

/**
 * Детерминированные дев-фолбэки для всех ролей ИИ.
 * Используются, когда LLM-провайдер не настроен или недоступен.
 * Каждый результат помечается aiMode='fallback' — интерфейс показывает
 * пользователю, что работает упрощённый режим без реального ИИ.
 */

export function normalizeEn(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:"()«»—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeEn(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeEn(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / Math.max(ta.size, tb.size);
}

export function evaluateTranslationFallback(
  expected: string,
  acceptable: string[],
  userAnswer: string,
): TranslationEvaluation {
  const variants = [expected, ...acceptable];
  const normalizedUser = normalizeEn(userAnswer);
  const exact = variants.some((v) => normalizeEn(v) === normalizedUser);
  const bestOverlap = Math.max(
    ...variants.map((v) => tokenOverlap(v, userAnswer)),
  );

  let verdict: TranslationEvaluation['verdict'];
  if (exact) verdict = 'correct';
  else if (bestOverlap >= 0.75) verdict = 'mostly_correct';
  else if (bestOverlap >= 0.45) verdict = 'unnatural';
  else verdict = 'incorrect';

  return {
    aiMode: 'fallback',
    verdict,
    correctAnswer: expected,
    naturalAlternative: acceptable[0],
    explanation:
      verdict === 'correct'
        ? 'Верно! Ответ совпадает с эталоном.'
        : verdict === 'mostly_correct'
          ? 'Почти верно: смысл передан, сравните с эталоном.'
          : verdict === 'unnatural'
            ? 'Понятно, но звучит неестественно. Сравните с эталонным вариантом.'
            : 'Ответ не совпал с эталоном. Изучите правильный вариант.',
    errors: [],
  };
}

/**
 * Дев-фолбэк оценки ответа в повторении: 5 уровней по совпадению токенов.
 * Без реального ИИ конкретные грамматические ошибки не выделяются —
 * даём безопасный вердикт и сравнение с эталоном.
 */
export function evaluateReviewAnswerFallback(
  expected: string,
  acceptable: string[],
  userAnswer: string,
): ReviewAnswerEvaluation {
  const variants = [expected, ...acceptable];
  const normalizedUser = normalizeEn(userAnswer);
  const exact = variants.some((v) => normalizeEn(v) === normalizedUser);
  const bestOverlap = Math.max(
    ...variants.map((v) => tokenOverlap(v, userAnswer)),
  );

  let verdict: ReviewAnswerEvaluation['verdict'];
  if (exact) verdict = 'correct';
  else if (bestOverlap >= 0.8) verdict = 'minor_error';
  else if (bestOverlap >= 0.55) verdict = 'unnatural';
  else if (bestOverlap >= 0.3) verdict = 'significant_error';
  else verdict = 'wrong';

  const accepted = verdict === 'correct' || verdict === 'minor_error';
  return {
    aiMode: 'fallback',
    verdict,
    accepted,
    corrected: expected,
    natural: expected,
    rule: 'Дев-режим ИИ: подробный разбор правила доступен при подключённом ИИ-провайдере. Сравните свой ответ с эталоном.',
    examples: acceptable.slice(0, 2),
    errors: [],
  };
}

export function evaluateSentenceFallback(
  sentence: string,
  targetPhrase: string,
): SentenceEvaluation {
  const containsTarget = normalizeEn(sentence).includes(
    normalizeEn(targetPhrase).replace(/^to /, ''),
  );
  return {
    aiMode: 'fallback',
    corrected: sentence.trim(),
    natural: sentence.trim(),
    explanation: containsTarget
      ? 'Дев-режим ИИ: предложение принято. Полная проверка грамматики доступна при подключённом ИИ-провайдере.'
      : `Дев-режим ИИ: постарайтесь использовать целевую фразу «${targetPhrase}». Полная проверка доступна при подключённом ИИ-провайдере.`,
    errors: [],
  };
}

export function speakingTurnFallback(
  questions: string[],
  userTurnCount: number,
): SpeakingTurnResult {
  const index = userTurnCount - 1;
  if (index < questions.length) {
    return {
      aiMode: 'fallback',
      reply: `I see, thank you! ${questions[index]}`,
      done: false,
    };
  }
  return {
    aiMode: 'fallback',
    reply:
      'Thank you, that was a good conversation! We can finish here — press "Завершить" to get your feedback.',
    done: true,
  };
}

const FILLER_WORDS = new Set([
  'i',
  'a',
  'an',
  'the',
  'is',
  'am',
  'are',
  'was',
  'were',
  'to',
  'in',
  'on',
  'at',
  'of',
  'and',
  'my',
  'we',
  'it',
  'he',
  'she',
  'they',
  'you',
]);

export function speakingFeedbackFallback(
  userMessages: string[],
): SpeakingFeedback {
  const allWords = userMessages.flatMap((m) =>
    normalizeEn(m).split(' ').filter(Boolean),
  );
  const meaningful = allWords.filter((w) => !FILLER_WORDS.has(w));
  const unique = new Set(meaningful);
  const wentWell: string[] = [];
  if (userMessages.length >= 3) {
    wentWell.push('Вы поддерживали диалог и отвечали на вопросы.');
  }
  if (allWords.length / Math.max(userMessages.length, 1) >= 6) {
    wentWell.push('Ответы достаточно развёрнутые.');
  }
  if (unique.size >= 15) {
    wentWell.push('Хорошее разнообразие лексики.');
  }
  if (wentWell.length === 0) {
    wentWell.push('Вы завершили разговор — это уже практика.');
  }
  return {
    aiMode: 'fallback',
    wentWell: wentWell.slice(0, 3),
    mistakes: [],
    betterPhrases: [],
    vocabulary: [],
  };
}

function levelFromScore(percent: number): CefrString {
  if (percent >= 85) return 'B1';
  if (percent >= 70) return 'A2_PLUS';
  if (percent >= 50) return 'A2';
  if (percent >= 30) return 'A1_PLUS';
  return 'A1';
}

export function evaluateOpenTasksFallback(
  writingAnswers: string[],
  speakingTranscripts: string[],
): OpenTasksEvaluation {
  const avgWords = (texts: string[]) =>
    texts.reduce(
      (sum, t) => sum + normalizeEn(t).split(' ').filter(Boolean).length,
      0,
    ) / Math.max(texts.length, 1);
  const writingScore = Math.min(avgWords(writingAnswers) * 4, 100);
  const speakingScore = Math.min(avgWords(speakingTranscripts) * 4, 100);
  return {
    aiMode: 'fallback',
    writingLevel: levelFromScore(writingScore),
    speakingLevel: levelFromScore(speakingScore),
    strengths: [
      'Вы дали ответы на открытые задания — хорошая база для старта.',
    ],
    weaknesses: [
      'Дев-режим ИИ: детальный анализ письма и речи доступен при подключённом ИИ-провайдере.',
    ],
    recurringErrors: [],
    summary:
      'Оценка выполнена в дев-режиме без реального ИИ: уровни письма и речи определены приблизительно по объёму ответов. Подключите ИИ-провайдера для точной оценки.',
    suggestedTrack: 'Разговорный английский для работы: от A2 к B1',
    recommendedDailyMinutes: 15,
  };
}

export function generateLessonFallback(
  topic: string,
  level: CefrString,
  durationMinutes: number,
): GeneratedLesson {
  const content: LessonContent = {
    newPhrases: [
      {
        english: 'Let me explain the main idea.',
        russian: 'Позвольте объяснить основную мысль.',
        hint: 'лет ми эксплЭйн зэ мэйн айдИа',
        example: `Let me explain the main idea of ${topic}.`,
        context: 'Начало объяснения темы.',
      },
      {
        english: 'In my opinion, this is important because…',
        russian: 'По моему мнению, это важно, потому что…',
        hint: 'ин май опИньон зис из импОртант бикОз',
        example: 'In my opinion, this is important because it reduces risks.',
      },
      {
        english: 'Could you give me an example?',
        russian: 'Не могли бы вы привести пример?',
        hint: 'куд ю гив ми эн игзАмпл',
        example: 'Interesting point. Could you give me an example?',
      },
    ],
    translationTasks: [
      {
        type: 'ru_en',
        prompt: 'Позвольте объяснить основную мысль.',
        answer: 'Let me explain the main idea.',
      },
      {
        type: 'missing',
        prompt: 'Could you give me an ___?',
        answer: 'example',
      },
      {
        type: 'order',
        prompt: 'Соберите предложение',
        answer: 'This is important because it reduces risks.',
        words: [
          'because',
          'This',
          'reduces',
          'is',
          'it',
          'important',
          'risks.',
        ],
      },
    ],
    personalPrompt: {
      phrase: 'In my opinion…',
      instruction: `Выскажите своё мнение по теме «${topic}» (1-2 предложения).`,
    },
    speakingTask: {
      prompt: `Talk about "${topic}" for one minute.`,
      promptRu: `Расскажите о теме «${topic}» в течение одной минуты.`,
    },
    dialogue: {
      title: `Обсуждение темы: ${topic}`,
      aiOpening: `Let's talk about ${topic}. What do you know about it?`,
      questions: [
        'Why is this topic important for you?',
        'Can you give an example from your experience?',
        'What would you like to learn about it?',
      ],
    },
    reviewQuestions: [`Какие фразы по теме «${topic}» вы запомнили?`],
  };
  return {
    aiMode: 'fallback',
    title: `Урок (дев-режим): ${topic}`,
    topic,
    objective: `Базовые фразы для обсуждения темы «${topic}». Урок создан в дев-режиме без реального ИИ — подключите ИИ-провайдера для полноценной генерации.`,
    level,
    durationMinutes,
    content,
  };
}

export function extractPhrasesFallback(text: string): ExtractedPhrasesResult {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.split(' ').length >= 3);
  const phrases = sentences.slice(0, 8).map((s) => {
    const words = s.split(' ').slice(0, 5).join(' ');
    return {
      english: words,
      russian: '(добавьте перевод — дев-режим ИИ)',
      category: 'work',
      example: s.slice(0, 120),
    };
  });
  return { aiMode: 'fallback', phrases };
}

export function simplifyTextFallback(text: string): SimplifiedTextResult {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 8);
  return {
    aiMode: 'fallback',
    simplified: sentences.join(' '),
  };
}

const PREPOSITIONS = new Set([
  'in',
  'on',
  'at',
  'to',
  'for',
  'from',
  'with',
  'by',
  'of',
  'about',
]);

export function classifyErrorFallback(
  original: string,
  corrected: string,
): ErrorClassification {
  const origTokens = normalizeEn(original).split(' ').filter(Boolean);
  const corrTokens = normalizeEn(corrected).split(' ').filter(Boolean);
  const origSet = new Set(origTokens);
  const added = corrTokens.filter((t) => !origSet.has(t));

  let errorType: ErrorClassification['errorType'] = 'OTHER';
  if (added.some((t) => t === 'a' || t === 'an' || t === 'the')) {
    errorType = 'ARTICLE';
  } else if (added.some((t) => PREPOSITIONS.has(t))) {
    errorType = 'PREPOSITION';
  } else if (
    origTokens.length === corrTokens.length &&
    [...origSet].every((t) => corrTokens.includes(t))
  ) {
    errorType = 'WORD_ORDER';
  } else if (corrTokens.length > origTokens.length) {
    errorType = 'MISSING_WORD';
  }

  return {
    aiMode: 'fallback',
    errorType,
    explanation:
      'Тип ошибки определён автоматически в дев-режиме. Подключите ИИ-провайдера для точной классификации.',
  };
}

const MICRO_LESSON_RULES: Record<MicroCategoryString, string> = {
  ARTICLES:
    'Артикль почти всегда обязателен перед исчисляемым существительным в единственном числе. "A/an" используется, когда речь о чём-то одном из многих ("a document"), "the" — когда собеседник понимает, о каком именно предмете речь ("the document we discussed"). Перед неисчисляемыми существительными и множественным числом без конкретики артикль обычно не нужен.',
  THIRD_PERSON_SINGULAR:
    'В Present Simple к глаголу добавляется -s (или -es), если подлежащее — he, she, it или существительное в единственном числе ("he works", "the company complies"). Это единственное время, где форма глагола меняется в зависимости от лица — легко забыть по привычке из русского языка.',
  PRESENT_SIMPLE:
    'Present Simple используется для фактов, привычек и регулярных действий ("I check reports every day"). Важно согласование подлежащего и глагола: I/you/we/they + базовая форма, he/she/it + форма с -s.',
  PRESENT_PERFECT:
    'Present Perfect (have/has + причастие прошедшего времени) используется, когда действие в прошлом связано с настоящим моментом — результат важен сейчас ("I have finished the report"), либо для опыта без указания точного времени. Если указано точное время в прошлом (yesterday, last week), используется Past Simple, а не Present Perfect.',
  PAST_SIMPLE:
    'Past Simple используется для завершённых действий в конкретный момент в прошлом ("I reviewed the contract yesterday"). Правильные глаголы получают окончание -ed, неправильные меняют форму (go → went).',
  PREPOSITIONS:
    'Выбор предлога в английском часто не переводится дословно с русского и запоминается вместе с фразой: "responsible for", "comply with", "depend on", "in accordance with". Лучше запоминать не отдельный предлог, а всю устойчивую связку.',
  WORD_ORDER:
    'В английском предложении обычно фиксированный порядок: подлежащее → сказуемое → дополнение. Обстоятельства времени и места чаще ставятся в конец предложения, а не в начало, как часто бывает в русском.',
  COMPLY_VS_COMPLIANCE:
    '"Comply" — это глагол ("to comply with the law"), а "compliance" — существительное ("compliance with the law"). "Compliant" — прилагательное ("the company is compliant"). Их легко перепутать, потому что по-русски это часто одно и то же слово.',
  MAKE_VS_DO:
    '"Make" обычно используется, когда что-то создаётся или производится ("make a decision", "make a mistake", "make a report"), а "do" — для выполнения действий и задач в целом ("do business", "do a task"). Такие сочетания чаще всего просто запоминаются целиком.',
  COUNTABLE_VS_UNCOUNTABLE:
    'Некоторые существительные в английском не имеют множественного числа, даже если похожее русское слово его имеет: information, advice, evidence, research, equipment. К ним не добавляется -s, и вместо "many" используется "much" или "a lot of".',
  COLLOCATIONS:
    'Некоторые сочетания слов в английском устойчивы и не переводятся дословно — их нужно запоминать целиком, а не собирать по отдельным словам (например: "conduct an investigation", а не "make an investigation").',
  COMPLIANCE_VOCABULARY:
    'Профессиональная комплаенс-лексика (regulator, breach, disclosure, whistleblower, due diligence) имеет точные значения, важные для точной рабочей коммуникации.',
};

const MICRO_LESSON_GENERIC_EXERCISES: Record<
  MicroCategoryString,
  {
    fillBlank: { prompt: string; answer: string };
    choice: { prompt: string; options: string[]; answer: string };
  }
> = {
  ARTICLES: {
    fillBlank: {
      prompt: 'The company must comply with ___ new regulation.',
      answer: 'the',
    },
    choice: {
      prompt: 'She is ___ compliance officer.',
      options: ['a', 'an', 'the'],
      answer: 'a',
    },
  },
  THIRD_PERSON_SINGULAR: {
    fillBlank: {
      prompt: 'The manager usually ___ (check) reports on Monday.',
      answer: 'checks',
    },
    choice: {
      prompt: 'Choose the correct verb: "The department ___ this policy."',
      options: ['follow', 'follows', 'following'],
      answer: 'follows',
    },
  },
  PRESENT_SIMPLE: {
    fillBlank: {
      prompt: 'We ___ (review) every contract before signing.',
      answer: 'review',
    },
    choice: {
      prompt: 'Choose the correct sentence.',
      options: [
        'He work in compliance.',
        'He works in compliance.',
        'He working in compliance.',
      ],
      answer: 'He works in compliance.',
    },
  },
  PRESENT_PERFECT: {
    fillBlank: {
      prompt: 'I ___ (already / finish) the risk assessment.',
      answer: 'have already finished',
    },
    choice: {
      prompt: 'Choose the correct sentence.',
      options: [
        'I have seen this policy yesterday.',
        'I saw this policy yesterday.',
        'I have see this policy yesterday.',
      ],
      answer: 'I saw this policy yesterday.',
    },
  },
  PAST_SIMPLE: {
    fillBlank: {
      prompt: 'We ___ (submit) the report last week.',
      answer: 'submitted',
    },
    choice: {
      prompt: 'Choose the correct past form of "go".',
      options: ['goed', 'went', 'gone'],
      answer: 'went',
    },
  },
  PREPOSITIONS: {
    fillBlank: {
      prompt: 'The company must comply ___ the regulation.',
      answer: 'with',
    },
    choice: {
      prompt:
        'Choose the correct preposition: "She is responsible ___ this project."',
      options: ['for', 'of', 'at'],
      answer: 'for',
    },
  },
  WORD_ORDER: {
    fillBlank: {
      prompt:
        'Rewrite in correct order: "yesterday / the report / I / finished"',
      answer: 'I finished the report yesterday',
    },
    choice: {
      prompt: 'Choose the correctly ordered sentence.',
      options: [
        'Always I check the documents.',
        'I always check the documents.',
        'I check always the documents.',
      ],
      answer: 'I always check the documents.',
    },
  },
  COMPLY_VS_COMPLIANCE: {
    fillBlank: {
      prompt: 'The company must ___ (comply/compliance) with the law.',
      answer: 'comply',
    },
    choice: {
      prompt:
        'Choose the correct word: "This department is responsible for ___."',
      options: ['comply', 'compliance', 'complying with'],
      answer: 'compliance',
    },
  },
  MAKE_VS_DO: {
    fillBlank: {
      prompt: 'We need to ___ (make/do) a decision today.',
      answer: 'make',
    },
    choice: {
      prompt:
        'Choose the correct verb: "Please ___ your homework before the meeting."',
      options: ['make', 'do', 'making'],
      answer: 'do',
    },
  },
  COUNTABLE_VS_UNCOUNTABLE: {
    fillBlank: {
      prompt: 'We do not have ___ (many/much) information about this case.',
      answer: 'much',
    },
    choice: {
      prompt: 'Choose the correct sentence.',
      options: [
        'We collected many evidences.',
        'We collected much evidence.',
        'We collected a evidence.',
      ],
      answer: 'We collected much evidence.',
    },
  },
  COLLOCATIONS: {
    fillBlank: {
      prompt: 'The team will ___ (conduct/make) an investigation.',
      answer: 'conduct',
    },
    choice: {
      prompt: 'Choose the natural collocation.',
      options: ['take a decision', 'make a decision', 'do a decision'],
      answer: 'make a decision',
    },
  },
  COMPLIANCE_VOCABULARY: {
    fillBlank: {
      prompt: 'An employee who reports misconduct is called a ___.',
      answer: 'whistleblower',
    },
    choice: {
      prompt: 'Choose the correct term for "нарушение": ',
      options: ['breach', 'branch', 'brench'],
      answer: 'breach',
    },
  },
};

/**
 * Дев-фолбэк микро-урока: детерминированное правило + упражнения на основе
 * реальных ошибок ученика (если они есть) и общих примеров категории.
 */
export function generateMicroLessonFallback(
  category: MicroCategoryString,
  userExamples: { original: string; corrected: string }[],
): GeneratedMicroLesson {
  const generic = MICRO_LESSON_GENERIC_EXERCISES[category];
  const exercises: MicroLessonExercise[] = [];
  userExamples.slice(0, 2).forEach((ex, i) => {
    exercises.push({
      id: `ex${i + 1}`,
      type: 'correct_sentence',
      prompt: ex.original,
      answer: ex.corrected,
    });
  });
  exercises.push({
    id: `ex${exercises.length + 1}`,
    type: 'fill_blank',
    prompt: generic.fillBlank.prompt,
    answer: generic.fillBlank.answer,
  });
  exercises.push({
    id: `ex${exercises.length + 1}`,
    type: 'choice',
    prompt: generic.choice.prompt,
    options: generic.choice.options,
    answer: generic.choice.answer,
  });

  return {
    aiMode: 'fallback',
    content: {
      ruleExplanation: `${MICRO_LESSON_RULES[category]}\n\nДев-режим ИИ: часть примеров и упражнений ниже общие, персонализированный урок по вашим ошибкам доступен при подключённом ИИ-провайдере.`,
      additionalExamples: [],
      exercises,
    },
  };
}

export function detectedErrorOrNull(value: unknown): DetectedError | null {
  if (!value || typeof value !== 'object') return null;
  const e = value as DetectedError;
  if (typeof e.original !== 'string' || typeof e.corrected !== 'string') {
    return null;
  }
  return e;
}
