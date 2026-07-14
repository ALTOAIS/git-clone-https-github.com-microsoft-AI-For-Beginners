/**
 * Диагностический тест (раздел 6 PRD).
 * correctIndex хранится только на сервере и вырезается перед отдачей клиенту.
 */
export interface DiagnosticChoiceQuestion {
  id: string;
  section: 'vocabulary' | 'grammar' | 'reading' | 'listening';
  prompt: string;
  /** Текст для чтения (reading) */
  passage?: string;
  /** Текст для озвучивания (listening, воспроизводится через TTS на клиенте) */
  audioText?: string;
  options: string[];
  correctIndex: number;
}

export interface DiagnosticOpenTask {
  id: string;
  section: 'writing' | 'speaking';
  prompt: string;
  promptEn: string;
}

export const DIAGNOSTIC_CHOICE_QUESTIONS: DiagnosticChoiceQuestion[] = [
  // ------- Vocabulary (10) -------
  {
    id: 'v1',
    section: 'vocabulary',
    prompt: 'Выберите перевод слова «риск»',
    options: ['report', 'risk', 'rule', 'rate'],
    correctIndex: 1,
  },
  {
    id: 'v2',
    section: 'vocabulary',
    prompt: 'Выберите перевод фразы «конфликт интересов»',
    options: [
      'conflict of interest',
      'interest of conflict',
      'conflict interests',
      'interesting conflict',
    ],
    correctIndex: 0,
  },
  {
    id: 'v3',
    section: 'vocabulary',
    prompt: '«assess» означает…',
    options: ['утвердить', 'оценить', 'отменить', 'подписать'],
    correctIndex: 1,
  },
  {
    id: 'v4',
    section: 'vocabulary',
    prompt: 'Дополните: We need to ___ the risk.',
    options: ['do', 'make', 'assess', 'stay'],
    correctIndex: 2,
  },
  {
    id: 'v5',
    section: 'vocabulary',
    prompt: 'Выберите перевод: «предотвращать коррупцию»',
    options: [
      'promote corruption',
      'prevent corruption',
      'present corruption',
      'prepare corruption',
    ],
    correctIndex: 1,
  },
  {
    id: 'v6',
    section: 'vocabulary',
    prompt: '«отчёт» по-английски — это…',
    options: ['reason', 'record', 'report', 'request'],
    correctIndex: 2,
  },
  {
    id: 'v7',
    section: 'vocabulary',
    prompt: 'Дополните: I ___ as a compliance officer.',
    options: ['work', 'job', 'walk', 'make'],
    correctIndex: 0,
  },
  {
    id: 'v8',
    section: 'vocabulary',
    prompt: '«requirements» означает…',
    options: ['рекомендации', 'требования', 'результаты', 'решения'],
    correctIndex: 1,
  },
  {
    id: 'v9',
    section: 'vocabulary',
    prompt: 'Выберите правильное значение: «to hire»',
    options: ['уволить', 'нанять', 'повысить', 'обучить'],
    correctIndex: 1,
  },
  {
    id: 'v10',
    section: 'vocabulary',
    prompt: 'Дополните: Could you ___ me your phone number?',
    options: ['say', 'speak', 'give', 'put'],
    correctIndex: 2,
  },

  // ------- Grammar (10) -------
  {
    id: 'g1',
    section: 'grammar',
    prompt: 'I am ___ compliance officer.',
    options: ['a', 'an', 'the', '—'],
    correctIndex: 0,
  },
  {
    id: 'g2',
    section: 'grammar',
    prompt: 'She ___ in Astana.',
    options: ['live', 'lives', 'living', 'is live'],
    correctIndex: 1,
  },
  {
    id: 'g3',
    section: 'grammar',
    prompt: 'Look! The manager ___ a presentation now.',
    options: ['gives', 'gave', 'is giving', 'give'],
    correctIndex: 2,
  },
  {
    id: 'g4',
    section: 'grammar',
    prompt: 'Yesterday I ___ at home.',
    options: ['am', 'was', 'were', 'be'],
    correctIndex: 1,
  },
  {
    id: 'g5',
    section: 'grammar',
    prompt: 'We ___ to the park last weekend.',
    options: ['go', 'goes', 'went', 'gone'],
    correctIndex: 2,
  },
  {
    id: 'g6',
    section: 'grammar',
    prompt: 'Next year I ___ take an English exam.',
    options: ['will', 'did', 'am', 'was'],
    correctIndex: 0,
  },
  {
    id: 'g7',
    section: 'grammar',
    prompt: 'Employees ___ disclose a conflict of interest.',
    options: ['must', 'musts', 'have', 'are'],
    correctIndex: 0,
  },
  {
    id: 'g8',
    section: 'grammar',
    prompt: 'Выберите правильный порядок слов:',
    options: [
      'I every day English study.',
      'I study English every day.',
      'Every day study I English.',
      'I English study every day.',
    ],
    correctIndex: 1,
  },
  {
    id: 'g9',
    section: 'grammar',
    prompt: 'The report is ___ the table.',
    options: ['in', 'at', 'on', 'to'],
    correctIndex: 2,
  },
  {
    id: 'g10',
    section: 'grammar',
    prompt: 'I usually go ___ work by car.',
    options: ['at', 'to', 'in', 'on'],
    correctIndex: 1,
  },

  // ------- Reading (2 текста × 2 вопроса) -------
  {
    id: 'r1',
    section: 'reading',
    passage:
      'Aidar works at a bank in Almaty. He starts work at nine and finishes at six. At lunch he usually meets his colleagues in a small cafe near the office. In the evening he studies English because he wants to work with foreign clients.',
    prompt: 'Where does Aidar work?',
    options: ['At a school', 'At a bank', 'At a cafe', 'At a hospital'],
    correctIndex: 1,
  },
  {
    id: 'r2',
    section: 'reading',
    passage:
      'Aidar works at a bank in Almaty. He starts work at nine and finishes at six. At lunch he usually meets his colleagues in a small cafe near the office. In the evening he studies English because he wants to work with foreign clients.',
    prompt: 'Why does Aidar study English?',
    options: [
      'He wants to move to London.',
      'He wants to work with foreign clients.',
      'His manager told him to study.',
      'He wants to teach English.',
    ],
    correctIndex: 1,
  },
  {
    id: 'r3',
    section: 'reading',
    passage:
      'Every company has rules. A compliance officer checks that employees follow these rules and the law. When there is a problem, the compliance officer investigates it and writes a report for management. This work helps the company avoid fines and protect its reputation.',
    prompt: 'What does a compliance officer check?',
    options: [
      'That employees follow the rules and the law',
      'That the office is clean',
      'That salaries are high',
      'That computers work well',
    ],
    correctIndex: 0,
  },
  {
    id: 'r4',
    section: 'reading',
    passage:
      'Every company has rules. A compliance officer checks that employees follow these rules and the law. When there is a problem, the compliance officer investigates it and writes a report for management. This work helps the company avoid fines and protect its reputation.',
    prompt: 'How does this work help the company?',
    options: [
      'It increases sales.',
      'It helps avoid fines and protect reputation.',
      'It makes employees work faster.',
      'It reduces salaries.',
    ],
    correctIndex: 1,
  },

  // ------- Listening (3, текст озвучивается TTS на клиенте) -------
  {
    id: 'l1',
    section: 'listening',
    audioText:
      'Good morning! The meeting will start at ten thirty in room five.',
    prompt: 'Когда начнётся встреча?',
    options: ['В 10:13', 'В 10:30', 'В 13:00', 'В 5:10'],
    correctIndex: 1,
  },
  {
    id: 'l2',
    section: 'listening',
    audioText:
      'Please send me the report by Friday. It is very important for the board meeting.',
    prompt: 'Прослушайте и дополните: Please send me the ___ by Friday.',
    options: ['risk', 'report', 'request', 'reason'],
    correctIndex: 1,
  },
  {
    id: 'l3',
    section: 'listening',
    audioText:
      'I am sorry, but the director is not in the office today. He will be back tomorrow morning.',
    prompt: 'Когда директор вернётся в офис?',
    options: [
      'Сегодня вечером',
      'Завтра утром',
      'В понедельник',
      'Через неделю',
    ],
    correctIndex: 1,
  },
];

export const DIAGNOSTIC_OPEN_TASKS: DiagnosticOpenTask[] = [
  {
    id: 'w1',
    section: 'writing',
    prompt:
      'Представьтесь письменно: имя, город, работа, семья (2–4 предложения).',
    promptEn: 'Introduce yourself: name, city, job, family (2–4 sentences).',
  },
  {
    id: 'w2',
    section: 'writing',
    prompt: 'Опишите, что вы делали вчера (2–4 предложения).',
    promptEn: 'Describe what you did yesterday (2–4 sentences).',
  },
  {
    id: 'w3',
    section: 'writing',
    prompt: 'Объясните, почему вы хотите выучить английский (2–4 предложения).',
    promptEn: 'Explain why you want to learn English (2–4 sentences).',
  },
  {
    id: 's1',
    section: 'speaking',
    prompt: 'Представьтесь голосом: имя, откуда вы, чем занимаетесь.',
    promptEn: 'Introduce yourself: your name, where you are from, what you do.',
  },
  {
    id: 's2',
    section: 'speaking',
    prompt: 'Расскажите о своей работе: должность, основные задачи.',
    promptEn: 'Describe your work: your position and your main tasks.',
  },
  {
    id: 's3',
    section: 'speaking',
    prompt:
      'Ситуация: иностранный коллега спрашивает, как ваша компания оценивает риски. Ответьте ему.',
    promptEn:
      'Situation: a foreign colleague asks how your company assesses risks. Answer him.',
  },
];
