import { LessonContent } from './lesson-content';

/**
 * Сидовый семидневный учебный план (раздел 26 PRD).
 */
export interface SeedLesson {
  dayNumber: number;
  title: string;
  topic: string;
  level: 'A1' | 'A2' | 'B1';
  durationMinutes: number;
  objective: string;
  content: LessonContent;
}

export const WEEK_LESSONS: SeedLesson[] = [
  {
    dayNumber: 1,
    title: 'День 1. Рассказ о себе',
    topic: 'Introducing myself',
    level: 'A1',
    durationMinutes: 15,
    objective:
      'Уверенно представиться: имя, город, семья, работа, увлечения (I am / I work / I live / I have / I like).',
    content: {
      newPhrases: [
        {
          english: 'Nice to meet you.',
          russian: 'Приятно познакомиться.',
          hint: 'найс ту мит ю',
          example: 'Hello, my name is Miras. Nice to meet you.',
          context: 'Первая фраза при знакомстве.',
        },
        {
          english: 'I am from Kazakhstan.',
          russian: 'Я из Казахстана.',
          hint: 'ай эм фром казахстАн',
          example: 'I am from Kazakhstan, from the city of Astana.',
        },
        {
          english: 'Let me introduce myself.',
          russian: 'Позвольте представиться.',
          hint: 'лет ми интродьЮс майсЭлф',
          example: 'Let me introduce myself: my name is Miras.',
          context: 'Официальное начало презентации или встречи.',
        },
        {
          english: 'In my free time I read books.',
          russian: 'В свободное время я читаю книги.',
          hint: 'ин май фри тайм ай рид букс',
          example: 'In my free time I read books and play with my children.',
        },
        {
          english: 'I have been working there for five years.',
          russian: 'Я работаю там уже пять лет.',
          hint: 'ай хэв бин уОркинг зэа фор файв йирз',
          example:
            'I work at a holding company. I have been working there for five years.',
          context: 'Опыт работы — частый вопрос при знакомстве.',
        },
      ],
      grammarPoint: {
        title: 'Глагол to be и Present Simple при рассказе о себе',
        explanation:
          'О себе говорим через am/is/are и Present Simple: I am a compliance officer. I live in Astana. I work at a company. Не забывайте артикль “a” перед профессией.',
        examples: [
          'I am a compliance officer.',
          'I live in Astana.',
          'I work at a national holding company.',
        ],
      },
      translationTasks: [
        {
          type: 'ru_en',
          prompt: 'Меня зовут Мирас.',
          answer: 'My name is Miras.',
          acceptable: ['I am Miras.'],
        },
        {
          type: 'ru_en',
          prompt: 'Я работаю комплаенс-офицером.',
          answer: 'I work as a compliance officer.',
          acceptable: ['I am a compliance officer.'],
        },
        {
          type: 'missing',
          prompt: 'I am ___ compliance officer.',
          answer: 'a',
        },
        {
          type: 'order',
          prompt: 'Соберите предложение',
          answer: 'I live in Astana with my family.',
          words: ['family.', 'live', 'I', 'with', 'in', 'my', 'Astana'],
        },
        {
          type: 'en_ru',
          prompt: 'Nice to meet you.',
          answer: 'Приятно познакомиться.',
        },
      ],
      personalPrompt: {
        phrase: 'Let me introduce myself.',
        instruction:
          'Составьте 2–3 предложения о себе, начиная с “Let me introduce myself”.',
      },
      speakingTask: {
        prompt:
          'Introduce yourself for one minute: name, city, family, job, hobbies.',
        promptRu:
          'Представьтесь на одну минуту: имя, город, семья, работа, увлечения.',
      },
      dialogue: {
        title: 'Знакомство с иностранным коллегой',
        aiOpening:
          "Hello! I'm Alex, your new colleague from the London office. Nice to meet you! What's your name?",
        questions: [
          'Where are you from?',
          'What do you do at the company?',
          'Do you have a family?',
          'What do you like to do in your free time?',
        ],
      },
      reviewQuestions: [
        'Как сказать «Позвольте представиться»?',
        'Какой артикль нужен перед профессией?',
      ],
    },
  },
  {
    dayNumber: 2,
    title: 'День 2. Семья и мой обычный день',
    topic: 'My family and daily routine',
    level: 'A1',
    durationMinutes: 15,
    objective: 'Рассказывать о семье и распорядке дня в Present Simple.',
    content: {
      newPhrases: [
        {
          english: 'I usually get up at seven.',
          russian: 'Я обычно встаю в семь.',
          hint: 'ай Южуали гет ап эт сЭвэн',
          example: 'I usually get up at seven and drink coffee.',
        },
        {
          english: 'I take my children to school.',
          russian: 'Я отвожу детей в школу.',
          hint: 'ай тэйк май чИлдрен ту скул',
          example: 'Every morning I take my children to school.',
        },
        {
          english: 'After work I spend time with my family.',
          russian: 'После работы я провожу время с семьёй.',
          hint: 'Афтэ уорк ай спенд тайм уиз май фЭмили',
          example: 'After work I spend time with my family at home.',
        },
        {
          english: 'My wife works as a doctor.',
          russian: 'Моя жена работает врачом.',
          hint: 'май уайф уоркс эз э дОктор',
          example: 'My wife works as a doctor at a city hospital.',
          context: 'Замените профессию на реальную.',
        },
        {
          english: 'We have dinner together.',
          russian: 'Мы ужинаем вместе.',
          hint: 'уи хэв дИнэ тугЭзэ',
          example: 'In the evening we have dinner together.',
        },
      ],
      grammarPoint: {
        title: 'Present Simple: он/она + окончание -s',
        explanation:
          'В Present Simple после he/she/it глагол получает -s: My wife works. My son plays. Для I/we/they окончание не нужно: I work, we play.',
        examples: [
          'My son plays football.',
          'My wife works as a doctor.',
          'I get up at seven.',
        ],
      },
      translationTasks: [
        {
          type: 'ru_en',
          prompt: 'У меня двое детей.',
          answer: 'I have two children.',
        },
        {
          type: 'missing',
          prompt: 'My wife ___ as a doctor.',
          answer: 'works',
        },
        {
          type: 'order',
          prompt: 'Соберите предложение',
          answer: 'I take my children to school every morning.',
          words: [
            'every',
            'children',
            'I',
            'to',
            'morning.',
            'take',
            'school',
            'my',
          ],
        },
        {
          type: 'ru_en',
          prompt: 'После работы я провожу время с семьёй.',
          answer: 'After work I spend time with my family.',
        },
        {
          type: 'en_ru',
          prompt: 'We have dinner together.',
          answer: 'Мы ужинаем вместе.',
        },
      ],
      personalPrompt: {
        phrase: 'I usually get up at…',
        instruction:
          'Опишите своё обычное утро в 2–3 предложениях (Present Simple).',
      },
      speakingTask: {
        prompt: 'Describe your normal weekday from morning to evening.',
        promptRu: 'Опишите свой обычный будний день с утра до вечера.',
      },
      dialogue: {
        title: 'Разговор о семье и распорядке дня',
        aiOpening:
          'Hi! Yesterday you told me about your job. And what about your family? Do you have children?',
        questions: [
          'What time do you usually get up?',
          'What do you do after work?',
          'What does your family like to do together?',
        ],
      },
    },
  },
  {
    dayNumber: 3,
    title: 'День 3. Вчерашний день',
    topic: 'Yesterday',
    level: 'A2',
    durationMinutes: 15,
    objective:
      'Рассказывать о прошедших событиях в Past Simple: went, worked, played, spent, had.',
    content: {
      newPhrases: [
        {
          english: 'Yesterday I worked until six.',
          russian: 'Вчера я работал до шести.',
          hint: 'йЕстэдэй ай уоркт антИл сикс',
          example: 'Yesterday I worked until six and then went home.',
        },
        {
          english: 'We went to the park.',
          russian: 'Мы пошли в парк.',
          hint: 'уи уэнт ту зэ парк',
          example: 'On Saturday we went to the park with the children.',
        },
        {
          english: 'I had a busy day.',
          russian: 'У меня был напряжённый день.',
          hint: 'ай хэд э бИзи дэй',
          example: 'I had a busy day: three meetings and one report.',
        },
        {
          english: 'I spent the evening at home.',
          russian: 'Я провёл вечер дома.',
          hint: 'ай спент зи Ивнинг эт хоум',
          example: 'I spent the evening at home with my family.',
        },
        {
          english: 'We played football together.',
          russian: 'Мы вместе играли в футбол.',
          hint: 'уи плейд фУтбол тугЭзэ',
          example: 'My son and I played football together in the yard.',
        },
      ],
      grammarPoint: {
        title: 'Past Simple: правильные и неправильные глаголы',
        explanation:
          'Прошедшее время: правильные глаголы получают -ed (worked, played), неправильные меняют форму: go → went, have → had, spend → spent.',
        examples: [
          'Yesterday I worked until six.',
          'We went for a walk.',
          'I had a meeting in the morning.',
        ],
      },
      translationTasks: [
        {
          type: 'ru_en',
          prompt: 'Вчера я был дома и играл с детьми.',
          answer: 'Yesterday I was at home and played with my children.',
        },
        {
          type: 'missing',
          prompt: 'After that, we ___ for a walk. (go)',
          answer: 'went',
        },
        {
          type: 'order',
          prompt: 'Соберите предложение',
          answer: 'I had a busy day at work yesterday.',
          words: ['busy', 'I', 'yesterday.', 'a', 'work', 'had', 'day', 'at'],
        },
        {
          type: 'ru_en',
          prompt: 'Я провёл вечер дома.',
          answer: 'I spent the evening at home.',
        },
        {
          type: 'en_ru',
          prompt: 'We went to the park.',
          answer: 'Мы пошли в парк.',
        },
      ],
      personalPrompt: {
        phrase: 'Yesterday I…',
        instruction:
          'Расскажите, что вы делали вчера (3 предложения в Past Simple).',
      },
      speakingTask: {
        prompt: 'Describe your yesterday evening: what did you do after work?',
        promptRu: 'Опишите вчерашний вечер: что вы делали после работы?',
      },
      dialogue: {
        title: 'Как прошёл вчерашний день',
        aiOpening: 'Good morning! How was your day yesterday? What did you do?',
        questions: [
          'Did you work a lot yesterday?',
          'What did you do in the evening?',
          'Did you spend time with your children?',
        ],
      },
    },
  },
  {
    dayNumber: 4,
    title: 'День 4. Планы и цели',
    topic: 'Plans and goals',
    level: 'A2',
    durationMinutes: 15,
    objective:
      'Говорить о будущем и целях: will, going to, want to, plan to, would like to.',
    content: {
      newPhrases: [
        {
          english: 'I am going to study English every day.',
          russian: 'Я собираюсь заниматься английским каждый день.',
          hint: 'ай эм гОуинг ту стАди Инглиш Эври дэй',
          example: 'I am going to study English every day for fifteen minutes.',
        },
        {
          english: 'I plan to take an exam next year.',
          russian: 'Я планирую сдать экзамен в следующем году.',
          hint: 'ай плэн ту тэйк эн игзЭм некст йир',
          example: 'I plan to take an English exam next year.',
        },
        {
          english: 'I would like to study abroad.',
          russian: 'Я хотел бы учиться за рубежом.',
          hint: 'ай вуд лайк ту стАди эброд',
          example: 'I would like to study abroad in the future.',
        },
        {
          english: 'It will help me in my career.',
          russian: 'Это поможет мне в карьере.',
          hint: 'ит уил хелп ми ин май кэрИэ',
          example: 'Good English will help me in my career.',
        },
        {
          english: 'My goal is to speak confidently.',
          russian: 'Моя цель — говорить уверенно.',
          hint: 'май гОул из ту спик кОнфидэнтли',
          example: 'My goal is to speak confidently at work meetings.',
        },
      ],
      grammarPoint: {
        title: 'Будущее: will и going to',
        explanation:
          '“Going to” — планы и намерения: I am going to study. “Will” — решения, обещания и предсказания: It will help me. “Would like to” — вежливое «хотел бы».',
        examples: [
          'I am going to practise every day.',
          'English will open new opportunities.',
          'I would like to work with foreign partners.',
        ],
      },
      translationTasks: [
        {
          type: 'ru_en',
          prompt: 'Я хочу улучшить свой английский.',
          answer: 'I want to improve my English.',
        },
        {
          type: 'missing',
          prompt: 'I am ___ to study English every day.',
          answer: 'going',
        },
        {
          type: 'order',
          prompt: 'Соберите предложение',
          answer: 'English can open new career opportunities.',
          words: ['career', 'English', 'new', 'can', 'opportunities.', 'open'],
        },
        {
          type: 'ru_en',
          prompt: 'Я хотел бы учиться за рубежом.',
          answer: 'I would like to study abroad.',
        },
        {
          type: 'en_ru',
          prompt: 'My goal is to speak confidently.',
          answer: 'Моя цель — говорить уверенно.',
        },
      ],
      personalPrompt: {
        phrase: 'My goal is to…',
        instruction:
          'Напишите о своей главной цели в английском (1–2 предложения).',
      },
      speakingTask: {
        prompt:
          'Explain why you want to learn English and what your plans are.',
        promptRu:
          'Объясните, почему вы хотите выучить английский и какие у вас планы.',
      },
      dialogue: {
        title: 'Цели изучения английского',
        aiOpening:
          "I heard you are learning English now. That's great! Why do you want to improve your English?",
        questions: [
          'How is English useful for your career?',
          'Are you going to take any exams?',
          'What are your plans for the next year?',
        ],
      },
    },
  },
  {
    dayNumber: 5,
    title: 'День 5. Моя работа',
    topic: 'My work',
    level: 'A2',
    durationMinutes: 15,
    objective:
      'Описывать свою роль и задачи: compliance officer, policy, risk, report, recommendation, monitoring.',
    content: {
      newPhrases: [
        {
          english: 'I am responsible for compliance monitoring.',
          russian: 'Я отвечаю за комплаенс-мониторинг.',
          hint: 'ай эм риспОнсибл фор комплАйенс мОниторинг',
          example: 'I am responsible for compliance monitoring in our company.',
          context: 'Ключевая фраза для описания роли.',
        },
        {
          english: 'I prepare reports for management.',
          russian: 'Я готовлю отчёты для руководства.',
          hint: 'ай припЭа рипОртс фор мЭниджмент',
          example: 'Every quarter I prepare reports for management.',
        },
        {
          english: 'We develop compliance policies.',
          russian: 'Мы разрабатываем комплаенс-политики.',
          hint: 'уи дивЭлоп комплАйенс пОлисиз',
          example: 'We develop compliance policies for all subsidiaries.',
        },
        {
          english: 'I give recommendations to departments.',
          russian: 'Я даю рекомендации подразделениям.',
          hint: 'ай гив рекомендЭйшнс ту дипАртментс',
          example: 'After the review I give recommendations to departments.',
        },
        {
          english: 'My main task is to manage risks.',
          russian: 'Моя основная задача — управлять рисками.',
          hint: 'май мэйн таск из ту мЭнидж рискс',
          example: 'My main task is to manage compliance risks.',
        },
      ],
      grammarPoint: {
        title: 'Конструкции для описания обязанностей',
        explanation:
          '“I am responsible for + существительное/герундий” (I am responsible for monitoring), “My main task is to + глагол” (My main task is to manage risks).',
        examples: [
          'I am responsible for compliance monitoring.',
          'My main task is to prevent violations.',
          'I am responsible for preparing reports.',
        ],
      },
      translationTasks: [
        {
          type: 'ru_en',
          prompt: 'представить отчёт',
          answer: 'submit a report',
        },
        {
          type: 'ru_en',
          prompt: 'рассмотреть политику',
          answer: 'review a policy',
        },
        {
          type: 'missing',
          prompt: 'I am responsible ___ compliance monitoring.',
          answer: 'for',
        },
        {
          type: 'order',
          prompt: 'Соберите предложение',
          answer: 'I prepare reports for management every quarter.',
          words: [
            'for',
            'reports',
            'I',
            'every',
            'management',
            'prepare',
            'quarter.',
          ],
        },
        {
          type: 'en_ru',
          prompt: 'We develop compliance policies.',
          answer: 'Мы разрабатываем комплаенс-политики.',
        },
      ],
      personalPrompt: {
        phrase: 'I am responsible for…',
        instruction:
          'Опишите 2–3 свои рабочие обязанности, используя “I am responsible for”.',
      },
      speakingTask: {
        prompt:
          'Explain your role at work: what do you do as a compliance officer?',
        promptRu:
          'Объясните свою роль на работе: чем вы занимаетесь как комплаенс-офицер?',
      },
      dialogue: {
        title: 'Рассказ о работе иностранному коллеге',
        aiOpening:
          'You mentioned you work in compliance. Interesting! What exactly do you do?',
        questions: [
          'What are you responsible for?',
          'Do you prepare reports? For whom?',
          'What is the most difficult part of your job?',
        ],
      },
    },
  },
  {
    dayNumber: 6,
    title: 'День 6. Комплаенс-риски',
    topic: 'Compliance risks',
    level: 'B1',
    durationMinutes: 15,
    objective:
      'Объяснять работу с рисками: identify, assess, prevent, mitigate, monitor.',
    content: {
      newPhrases: [
        {
          english: 'First, we identify the risks.',
          russian: 'Сначала мы выявляем риски.',
          hint: 'фёрст уи айдЭнтифай зэ рискс',
          example: 'First, we identify the risks in every business process.',
        },
        {
          english: 'Then we assess their impact.',
          russian: 'Затем мы оцениваем их влияние.',
          hint: 'зэн уи эсЭс зэир Импэкт',
          example: 'Then we assess their impact and probability.',
        },
        {
          english: 'We develop measures to mitigate risks.',
          russian: 'Мы разрабатываем меры по снижению рисков.',
          hint: 'уи дивЭлоп мЭжэс ту мИтигейт рискс',
          example: 'We develop measures to mitigate the most serious risks.',
        },
        {
          english: 'Our goal is to prevent violations.',
          russian: 'Наша цель — предотвращать нарушения.',
          hint: 'Ауэ гОул из ту привЭнт вайолЭйшнс',
          example: 'Our goal is to prevent violations before they happen.',
        },
        {
          english: 'We monitor the results regularly.',
          russian: 'Мы регулярно отслеживаем результаты.',
          hint: 'уи мОнитэ зэ ризАлтс рЭгьюлэли',
          example: 'We monitor the results regularly and report to management.',
        },
      ],
      grammarPoint: {
        title: 'Последовательность действий: First, Then, After that, Finally',
        explanation:
          'Чтобы описать процесс, используйте слова-связки: First — сначала, Then — затем, After that — после этого, Finally — в конце.',
        examples: [
          'First, we identify the risks.',
          'Then we assess their impact.',
          'Finally, we monitor the results.',
        ],
      },
      translationTasks: [
        {
          type: 'ru_en',
          prompt: 'выявить комплаенс-риск',
          answer: 'identify a compliance risk',
        },
        {
          type: 'ru_en',
          prompt: 'снизить риск',
          answer: 'mitigate a risk',
        },
        {
          type: 'missing',
          prompt: 'We need to ___ the risk. (оценить)',
          answer: 'assess',
        },
        {
          type: 'order',
          prompt: 'Соберите предложение',
          answer: 'Our goal is to prevent corruption.',
          words: ['prevent', 'Our', 'to', 'corruption.', 'goal', 'is'],
        },
        {
          type: 'en_ru',
          prompt: 'We monitor the results regularly.',
          answer: 'Мы регулярно отслеживаем результаты.',
        },
      ],
      personalPrompt: {
        phrase: 'First, we identify the risks. Then…',
        instruction:
          'Опишите процесс оценки рисков в вашей компании (3 предложения со связками First / Then / Finally).',
      },
      speakingTask: {
        prompt:
          'Explain how a company assesses compliance risks, step by step.',
        promptRu: 'Объясните по шагам, как компания оценивает комплаенс-риски.',
      },
      dialogue: {
        title: 'Обсуждение оценки рисков с коллегой',
        aiOpening:
          'We are starting a risk assessment in our office next month. How does your company assess compliance risks?',
        questions: [
          'How do you identify risks?',
          'What do you do with high risks?',
          'How often do you monitor the results?',
        ],
      },
    },
  },
  {
    dayNumber: 7,
    title: 'День 7. Итоги недели',
    topic: 'Weekly review',
    level: 'A2',
    durationMinutes: 15,
    objective:
      'Повторить фразы недели, пройти короткий тест и записать двухминутный голосовой рассказ.',
    content: {
      newPhrases: [
        {
          english: 'Let me summarize my week.',
          russian: 'Позвольте подвести итоги моей недели.',
          hint: 'лет ми сАмэрайз май уик',
          example: 'Let me summarize my week: I studied English every day.',
        },
        {
          english: 'I have learned many new phrases.',
          russian: 'Я выучил много новых фраз.',
          hint: 'ай хэв лёрнд мЭни нью фрЭйзиз',
          example: 'This week I have learned many new phrases about my work.',
        },
      ],
      grammarPoint: {
        title: 'Повторение недели',
        explanation:
          'Вспомните: артикль “a” перед профессией; Present Simple для привычек; Past Simple для вчерашних событий; going to для планов; связки First/Then/Finally для процессов.',
        examples: [
          'I am a compliance officer.',
          'Yesterday I worked until six.',
          'I am going to study every day.',
        ],
      },
      translationTasks: [
        {
          type: 'ru_en',
          prompt: 'Я работаю в сфере комплаенса.',
          answer: 'I work in the compliance field.',
        },
        {
          type: 'ru_en',
          prompt: 'Вчера я был дома и играл с детьми.',
          answer: 'Yesterday I was at home and played with my children.',
        },
        {
          type: 'ru_en',
          prompt: 'Как ваша компания оценивает комплаенс-риски?',
          answer: 'How does your company assess compliance risks?',
        },
        {
          type: 'missing',
          prompt: 'English can ___ new career opportunities.',
          answer: 'open',
        },
        {
          type: 'order',
          prompt: 'Соберите предложение',
          answer: 'I want to speak English confidently at work.',
          words: [
            'English',
            'I',
            'at',
            'confidently',
            'want',
            'speak',
            'work.',
            'to',
          ],
        },
      ],
      personalPrompt: {
        phrase: 'Let me summarize my week.',
        instruction:
          'Подведите итоги недели: что вы выучили и что было самым сложным (2–3 предложения).',
      },
      speakingTask: {
        prompt:
          'Record a two-minute summary: introduce yourself, describe your work, your family and your goals in English.',
        promptRu:
          'Запишите двухминутный рассказ: представьтесь, расскажите о работе, семье и своих целях в английском.',
      },
      dialogue: {
        title: 'Итоги первой недели',
        aiOpening:
          'Congratulations, you finished your first week of practice! What did you learn this week?',
        questions: [
          'What was the most difficult part?',
          'Which phrases do you remember best?',
          'What do you want to practise next week?',
        ],
      },
      reviewQuestions: [
        'Назовите пять глаголов для работы с рисками.',
        'Как рассказать о планах на будущее?',
      ],
    },
  },
];
