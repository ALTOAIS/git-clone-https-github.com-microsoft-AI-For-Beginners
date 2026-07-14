/**
 * Сценарии разговорной практики (раздел 12 PRD).
 * Вопросы используются ИИ-собеседником как канва диалога и
 * дев-фолбэком как готовый сценарий.
 */
export interface SpeakingScenario {
  id: string;
  mode: string;
  titleRu: string;
  titleEn: string;
  level: 'A1' | 'A2' | 'B1';
  estimatedMinutes: number;
  aiOpening: string;
  questions: string[];
}

export const SPEAKING_MODES = [
  { id: 'free', ru: 'Свободный разговор' },
  { id: 'everyday', ru: 'Повседневная ситуация' },
  { id: 'work', ru: 'Работа' },
  { id: 'compliance', ru: 'Комплаенс' },
  { id: 'interview', ru: 'Интервью' },
  { id: 'travel', ru: 'Путешествие' },
  { id: 'presentation', ru: 'Презентация' },
  { id: 'document', ru: 'Обсуждение документа' },
  { id: 'daily_question', ru: 'Вопрос дня' },
];

export const SPEAKING_SCENARIOS: SpeakingScenario[] = [
  // --- Повседневные ---
  {
    id: 'introduce-yourself',
    mode: 'everyday',
    titleRu: 'Представьтесь',
    titleEn: 'Introduce yourself',
    level: 'A1',
    estimatedMinutes: 5,
    aiOpening:
      "Hello! Nice to meet you. What's your name and where are you from?",
    questions: [
      'What do you do for work?',
      'Do you have a family?',
      'What do you like to do in your free time?',
      'Why are you learning English?',
    ],
  },
  {
    id: 'family',
    mode: 'everyday',
    titleRu: 'Расскажите о семье',
    titleEn: 'Talk about your family',
    level: 'A1',
    estimatedMinutes: 5,
    aiOpening: 'Tell me about your family. Do you have children?',
    questions: [
      'How old are your children?',
      'What do you like to do together?',
      'Who cooks dinner in your family?',
      'How do you spend weekends?',
    ],
  },
  {
    id: 'typical-day',
    mode: 'everyday',
    titleRu: 'Опишите обычный день',
    titleEn: 'Describe your typical day',
    level: 'A1',
    estimatedMinutes: 5,
    aiOpening:
      'What does your typical day look like? When do you usually get up?',
    questions: [
      'How do you get to work?',
      'What do you usually do at lunch?',
      'What do you do after work?',
      'What time do you go to bed?',
    ],
  },
  {
    id: 'hobbies',
    mode: 'everyday',
    titleRu: 'Хобби и увлечения',
    titleEn: 'Talk about hobbies',
    level: 'A1',
    estimatedMinutes: 5,
    aiOpening: 'What do you like to do when you are not working?',
    questions: [
      'What books do you like to read?',
      'Do you play any games or sports?',
      'How much time do you spend on your hobby?',
      'What new hobby would you like to try?',
    ],
  },
  {
    id: 'weekend-plans',
    mode: 'everyday',
    titleRu: 'Планы на выходные',
    titleEn: 'Describe weekend plans',
    level: 'A2',
    estimatedMinutes: 5,
    aiOpening: 'The weekend is coming! What are you going to do?',
    questions: [
      'Are you going to spend time with your family?',
      'What did you do last weekend?',
      'Do you prefer to rest at home or go out?',
      'What is your perfect weekend?',
    ],
  },

  // --- Профессиональные ---
  {
    id: 'my-role',
    mode: 'work',
    titleRu: 'Моя роль комплаенс-офицера',
    titleEn: 'Explain your role as a compliance officer',
    level: 'A2',
    estimatedMinutes: 6,
    aiOpening:
      'I heard you work in compliance. What exactly does a compliance officer do?',
    questions: [
      'What are you responsible for?',
      'Who do you report to?',
      'What does a normal working day look like for you?',
      'What is the most interesting part of your job?',
    ],
  },
  {
    id: 'conflict-of-interest',
    mode: 'compliance',
    titleRu: 'Объясните конфликт интересов',
    titleEn: 'Describe a conflict of interest',
    level: 'B1',
    estimatedMinutes: 6,
    aiOpening:
      'Our new employees often ask about conflicts of interest. How would you explain what a conflict of interest is?',
    questions: [
      'Can you give a simple example?',
      'What should an employee do in this situation?',
      'How does your company manage conflicts of interest?',
      'What happens if someone does not disclose it?',
    ],
  },
  {
    id: 'risk-assessment',
    mode: 'compliance',
    titleRu: 'Оценка комплаенс-рисков',
    titleEn: 'Explain compliance risk assessment',
    level: 'B1',
    estimatedMinutes: 6,
    aiOpening:
      'We want to improve our risk assessment process. How does your company assess compliance risks?',
    questions: [
      'How do you identify risks?',
      'How do you decide which risks are the most serious?',
      'What do you do with high risks?',
      'How often do you repeat the assessment?',
    ],
  },
  {
    id: 'anti-corruption',
    mode: 'compliance',
    titleRu: 'Антикоррупционные меры',
    titleEn: 'Discuss anti-corruption measures',
    level: 'B1',
    estimatedMinutes: 6,
    aiOpening:
      'Anti-corruption is a big topic now. What measures does your company take to prevent corruption?',
    questions: [
      'Do you train employees about anti-corruption?',
      'How can employees report a problem?',
      'What is the role of management in this work?',
      'What was the most difficult case in your practice?',
    ],
  },
  {
    id: 'monitoring-results',
    mode: 'work',
    titleRu: 'Презентация результатов мониторинга',
    titleEn: 'Present monitoring results',
    level: 'B1',
    estimatedMinutes: 6,
    aiOpening:
      'Imagine I am a member of the management board. Please present the results of your compliance monitoring.',
    questions: [
      'What were the main findings?',
      'Which recommendations did you give?',
      'What are the next steps?',
      'What support do you need from management?',
    ],
  },
  {
    id: 'recommendations',
    mode: 'work',
    titleRu: 'Обсуждение рекомендаций с руководством',
    titleEn: 'Discuss recommendations with management',
    level: 'B1',
    estimatedMinutes: 6,
    aiOpening:
      'I read your report. Some recommendations look expensive. Why should we implement them?',
    questions: [
      'What happens if we do nothing?',
      'Which recommendation is the most important?',
      'How long will implementation take?',
      'How will we measure the results?',
    ],
  },
  {
    id: 'ask-colleague',
    mode: 'work',
    titleRu: 'Вопросы иностранному коллеге о рисках',
    titleEn: 'Ask a foreign colleague about risk assessment',
    level: 'A2',
    estimatedMinutes: 5,
    aiOpening:
      "Hi! I'm the compliance manager from our London office. You wanted to ask me about our risk assessment approach, right? Go ahead!",
    questions: [
      'Great question. We use a five-step model. What else would you like to know?',
      'We assess risks twice a year. Does your company do it more often?',
      'Our biggest challenge is data quality. What is yours?',
    ],
  },
  {
    id: 'policy-purpose',
    mode: 'compliance',
    titleRu: 'Цель комплаенс-политики',
    titleEn: 'Explain the purpose of a compliance policy',
    level: 'B1',
    estimatedMinutes: 5,
    aiOpening:
      'Some employees say policies are just bureaucracy. How would you explain the purpose of a compliance policy?',
    questions: [
      'How does a policy help a normal employee?',
      'What happens when there is no policy?',
      'How do you make people actually read policies?',
    ],
  },

  // --- Другие режимы ---
  {
    id: 'job-interview',
    mode: 'interview',
    titleRu: 'Собеседование на работу',
    titleEn: 'Job interview practice',
    level: 'A2',
    estimatedMinutes: 6,
    aiOpening:
      'Welcome! Thank you for coming to the interview. First, please tell me a little about yourself.',
    questions: [
      'What is your experience in compliance?',
      'What are your strengths?',
      'Why do you want to work in an international company?',
      'Where do you see yourself in five years?',
    ],
  },
  {
    id: 'airport',
    mode: 'travel',
    titleRu: 'В аэропорту',
    titleEn: 'At the airport',
    level: 'A1',
    estimatedMinutes: 5,
    aiOpening:
      'Good afternoon! Welcome to the check-in desk. May I see your passport and ticket, please?',
    questions: [
      'Do you have any luggage to check in?',
      'Would you like a window seat or an aisle seat?',
      'Your flight boards at gate twelve at three o’clock. Do you have any questions?',
    ],
  },
  {
    id: 'hotel',
    mode: 'travel',
    titleRu: 'Заселение в отель',
    titleEn: 'Checking into a hotel',
    level: 'A1',
    estimatedMinutes: 5,
    aiOpening: 'Good evening! Welcome to our hotel. Do you have a reservation?',
    questions: [
      'Could you spell your last name, please?',
      'Would you like breakfast included?',
      'Here is your key. Do you need help with your luggage?',
    ],
  },
  {
    id: 'self-presentation',
    mode: 'presentation',
    titleRu: 'Короткая самопрезентация',
    titleEn: 'Short self-presentation',
    level: 'A2',
    estimatedMinutes: 5,
    aiOpening:
      'Imagine you are at an international compliance conference. Please introduce yourself and your work to the group.',
    questions: [
      'What project are you most proud of?',
      'What would you like to learn at this conference?',
      'How can other participants contact you?',
    ],
  },
  {
    id: 'daily-question',
    mode: 'daily_question',
    titleRu: 'Вопрос дня',
    titleEn: 'Question of the day',
    level: 'A2',
    estimatedMinutes: 3,
    aiOpening:
      'Here is your question of the day: What was the best part of your day so far, and why?',
    questions: [
      'Interesting! And what was the most difficult part?',
      'What are you looking forward to tomorrow?',
    ],
  },
];
