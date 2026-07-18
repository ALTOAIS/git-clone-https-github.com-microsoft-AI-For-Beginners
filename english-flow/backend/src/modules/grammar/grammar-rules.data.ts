/**
 * Grammar MVP — 12 rules' learner-facing content.
 *
 * Transcribed verbatim from the single source of truth,
 * english-flow/docs/content-pedagogy/grammar-mvp-decision-pack.md (the
 * final, human-documentation-reviewed text — see
 * grammar-rules-human-review.md for the per-rule review decisions this
 * content reflects). No explanation here was invented independently of
 * that document; content is not duplicated elsewhere, only imported from
 * it into a code-based, typed, importable form.
 *
 * This file intentionally contains ONLY learner-facing content fields —
 * no contentStatus, sourceVerificationStatus, or contentVersion. Those
 * are governance fields computed by the import script from
 * grammar-review-manifest.ts, never authored per-rule here. This keeps
 * it structurally impossible for a rule's own content definition to ever
 * specify PUBLISHED (or any status at all).
 */

import type { CefrLevel } from '@prisma/client';
import {
  GRAMMAR_EXERCISE_SCHEMA_VERSION,
  type GrammarExerciseTemplateSet,
} from './exercise-templates';

export type GrammarExampleTypeSource =
  'CORRECT' | 'INCORRECT' | 'CONTRAST' | 'CONTEXT' | 'EXCEPTION';

export interface GrammarRuleExampleSource {
  exampleType: GrammarExampleTypeSource;
  sentence: string;
  correction?: string;
  explanation?: string;
  context?: string;
}

export interface GrammarRuleContentSource {
  ruleCode: string;
  titleRu: string;
  titleEn?: string;
  shortExplanationRu: string;
  explanationRu: string;
  formula?: string;
  cefrLevel: CefrLevel;
  exerciseTemplates: GrammarExerciseTemplateSet;
  examples: GrammarRuleExampleSource[];
}

export const GRAMMAR_RULES_SOURCE: GrammarRuleContentSource[] = [
  // 1. ARTICLE_A_AN
  {
    ruleCode: 'ARTICLE_A_AN',
    titleRu: 'Артикли a/an',
    titleEn: 'Articles a/an',
    shortExplanationRu:
      'Перед исчисляемым существительным в единственном числе при первом/общем упоминании нужен артикль a или an. A — перед согласным звуком, an — перед гласным звуком (важен звук, а не буква).',
    explanationRu:
      'Артикли a/an ставятся перед исчисляемым существительным в единственном числе, когда вы упоминаете предмет впервые, говорите о нём как об одном из многих, или классифицируете что-то («She is a lawyer»). Выбор между a и an определяется звуком, с которого начинается следующее слово, а не буквой: an hour (звук гласной, хотя h — согласная буква), a university (звук согласной /j/, хотя u — гласная буква).',
    formula:
      'a/an + singular countable noun (по звуку: согласный звук → a, гласный звук → an)',
    cefrLevel: 'A1',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'article-a-an-fill-1',
          type: 'fill_blank',
          prompt: 'She works as ___ auditor.',
          answer: 'an',
        },
        {
          id: 'article-a-an-choice-1',
          type: 'choice',
          prompt: 'He bought ___ car.',
          options: ['a', 'an', 'the'],
          answer: 'a',
        },
        {
          id: 'article-a-an-correct-1',
          type: 'correct_sentence',
          prompt: 'I need a hour to review this.',
          answer: 'I need an hour to review this.',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'She is compliance officer.',
        correction: 'She is a compliance officer.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'He needs a hour to finish.',
        correction: 'He needs an hour to finish.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'I saw a elephant at the zoo.',
        correction: 'I saw an elephant at the zoo.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: "It's an united approach to risk.",
        correction: "It's a united approach to risk.",
        explanation: 'united начинается со звука /j/, поэтому a, не an.',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'I bought a book yesterday.',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'She is a compliance officer at an international bank.',
        context: 'professional',
      },
      {
        exampleType: 'EXCEPTION',
        sentence: 'She has a university degree in law.',
        explanation:
          'university пишется с гласной, но начинается со звука /j/ (согласный) — поэтому a, не an.',
      },
    ],
  },

  // 2. ARTICLE_THE_SPECIFIC
  {
    ruleCode: 'ARTICLE_THE_SPECIFIC',
    titleRu: 'Артикль the для конкретного предмета',
    titleEn: 'Article "the" for specific reference',
    shortExplanationRu:
      'The используется, когда и говорящий, и слушающий понимают, о каком именно предмете речь — потому что он уже упоминался, единственный в своём роде, или ясен из ситуации.',
    explanationRu:
      'The ставится перед существительным, когда объект конкретен для обоих собеседников — не любой из многих, а тот самый. Это происходит в трёх основных случаях: (1) предмет уже упоминался раньше в разговоре («I read a report. The report was long.»); (2) предмет единственный в своём роде или очевиден из контекста («the sun», «the CEO of our company»); (3) уточнён следующим словом/фразой («the report you sent me»). Важно: the не означает автоматически «любое существительное, упомянутое раньше» — если контекст неоднозначен или речь о новом, ещё не уточнённом предмете, снова нужен a/an, а не the.',
    formula: 'the + noun (конкретный/уже известный обеим сторонам объект)',
    cefrLevel: 'A1_PLUS',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'article-the-specific-fill-1',
          type: 'fill_blank',
          prompt:
            'The company must comply with ___ new regulation (the one we discussed).',
          answer: 'the',
        },
        {
          id: 'article-the-specific-choice-1',
          type: 'choice',
          prompt: 'I read a report yesterday. ___ report was 40 pages.',
          options: ['A', 'An', 'The'],
          answer: 'The',
        },
        {
          id: 'article-the-specific-correct-1',
          type: 'correct_sentence',
          prompt: 'CEO signed the document this morning.',
          answer: 'The CEO signed the document this morning.',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'I read report. Report was very detailed.',
        correction: 'I read a report. The report was very detailed.',
        explanation: 'второе упоминание того же отчёта',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'Please send me a document we discussed yesterday.',
        correction: 'Please send me the document we discussed yesterday.',
        explanation:
          '«we discussed yesterday» уточняет, какой именно документ — не любой',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'CEO of our company is on vacation.',
        correction: 'The CEO of our company is on vacation.',
        explanation: 'единственный в своей компании, уточнён «of our company»',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'I found the keys under the sofa.',
        context:
          'everyday — свои ключи, уже известные из ситуации, не любые ключи',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'The regulator reviewed the report we submitted last week.',
        context:
          'professional — конкретный регулятор и конкретный отчёт, оба уточнены',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'I read a report yesterday.',
        explanation: 'первое упоминание — любой из многих, ещё не уточнён',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'I read the report you sent me.',
        explanation: 'тот самый, уточнён придаточным «you sent me»',
      },
    ],
  },

  // 3. ARTICLE_ZERO_GENERAL — preserves the four-way comparison + singular-countable constraint
  {
    ruleCode: 'ARTICLE_ZERO_GENERAL',
    titleRu: 'Отсутствие артикля в общем значении',
    titleEn: 'Zero article for general reference',
    shortExplanationRu:
      'Перед существительными во множественном числе и перед неисчисляемыми существительными в общем значении артикль не нужен. Но это не универсальная формула «general = no article» — исчисляемое существительное в единственном числе почти всегда требует a/an, даже когда речь идёт о нём в общем смысле.',
    explanationRu:
      'Выбор артикля в общем значении зависит от двух признаков одновременно, а не только от того, «общее это утверждение или нет»: (1) general meaning или specific meaning, и (2) singular countable, plural countable или uncountable noun. Формула «general → no article» верна только для plural countable и uncountable существительных. Для singular countable существительного общее значение не отменяет необходимость a/an — так работает «a/an + singular countable noun» независимо от того, конкретен предмет или нет (сравните с ARTICLE_A_AN).\n\n' +
      'Сопоставление четырёх форм (a report / the report / reports / the reports):\n' +
      '- "a report" — один какой-то отчёт (singular countable, любой из многих)\n' +
      '- "the report" — конкретный, идентифицируемый отчёт (singular countable, specific)\n' +
      '- "reports" — отчёты вообще, как класс (plural countable, general)\n' +
      '- "the reports" — конкретные, идентифицируемые отчёты (plural countable, specific)\n\n' +
      'Тот же принцип для uncountable: "information" (общее понятие) vs "the information in this report" (конкретная информация, уточнённая придаточным/контекстом) — но здесь нет формы вроде "an information", поскольку information неисчисляемо (см. COUNTABLE_UNCOUNTABLE).\n\n' +
      'Обязательное ограничение: singular countable существительное обычно нельзя оставлять без determiner только потому, что значение общее — "Report is important" неверно именно потому, что report здесь singular countable без артикля, а не потому, что смысл не общий. Общий смысл для report выражается либо через "A report is important" (любой отчёт как представитель класса), либо через множественное число "Reports are important" (отчёты как класс) — не через голое единственное число.',
    formula:
      '∅ + plural noun или ∅ + uncountable noun только для general meaning; a/an + singular countable noun работает независимо от general/specific; the + noun (любого числа/исчисляемости) для specific meaning',
    cefrLevel: 'A2',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      // The decision-pack's fill_blank exercise for this rule has an
      // empty-string answer ("no article") — not representable as a valid
      // fill_blank exercise for the current runtime (nothing to type).
      // Dropped; the choice and correct_sentence exercises below already
      // cover both facets of the rule (no-article for uncountable general,
      // and the singular-countable-cannot-be-bare constraint).
      exercises: [
        {
          id: 'article-zero-general-choice-1',
          type: 'choice',
          prompt: 'We need ___ evidence before we act.',
          options: ['a', 'the', '(no article)'],
          answer: '(no article)',
        },
        {
          id: 'article-zero-general-correct-1',
          type: 'correct_sentence',
          prompt: 'Report is important for every decision.',
          answer: 'A report is important for every decision.',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'The compliance is important for every company.',
        correction: 'Compliance is important for every company.',
        explanation:
          'uncountable, general meaning — ни о какой конкретной компании речи нет',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'We need a evidences to proceed.',
        correction: 'We need evidence to proceed.',
        explanation: 'uncountable, general meaning',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'The regulators usually check documents twice a year.',
        correction: 'Regulators usually check documents twice a year.',
        explanation:
          'plural countable, general meaning — «usually» сигнализирует обобщение',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'Report is important.',
        correction: 'A report is important. (или Reports are important.)',
        explanation:
          'singular countable в общем значении — голая форма без артикля здесь неверна независимо от «общности» смысла',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'Employees need training.',
        context: 'everyday — plural countable, general',
      },
      {
        exampleType: 'CORRECT',
        sentence:
          'Regulators expect full transparency from financial institutions.',
        context: 'professional — оба существительных plural countable general',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'Employees need training.',
        explanation: 'general — сотрудники вообще',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'The employees in our department need training.',
        explanation:
          'specific — конкретная группа, уточнённая «in our department»',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'Information is important.',
        explanation: 'general, uncountable',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'The information in this report is important.',
        explanation: 'specific, уточнена «in this report»',
      },
    ],
  },

  // 4. PRESENT_SIMPLE_THIRD_PERSON
  {
    ruleCode: 'PRESENT_SIMPLE_THIRD_PERSON',
    titleRu: 'Present Simple: he/she/it',
    titleEn: 'Present Simple third-person singular',
    shortExplanationRu:
      'В обычных утвердительных предложениях Present Simple именно форма he/she/it требует окончания -s/-es у смыслового глагола. У have и do — особые формы: has, does.',
    explanationRu:
      'Когда подлежащее — he, she, it (или существительное в единственном числе, которое можно заменить на одно из них), глагол в утвердительном предложении Present Simple получает окончание: обычно -s («works»), после глаголов, оканчивающихся на -ch, -s, -ss, -sh, -x, -z — -es («watches», «goes», «fixes»), после согласной + y окончание меняется на -ies («study» → «studies», но «play» → «plays», т.к. перед y гласная). Два глагола меняют форму полностью: have → has, do → does. Это единственное простое утвердительное время, где окончание смыслового глагола зависит именно от подлежащего he/she/it — в русском языке такого нет, поэтому легко забыть.',
    formula: 'he/she/it + verb-s/-es/-ies · have→has · do→does',
    cefrLevel: 'A1',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'present-simple-third-person-fill-1',
          type: 'fill_blank',
          prompt: 'The manager usually ___ (check) reports on Monday.',
          answer: 'checks',
        },
        {
          id: 'present-simple-third-person-choice-1',
          type: 'choice',
          prompt: 'The department ___ this policy.',
          options: ['follow', 'follows', 'following'],
          answer: 'follows',
        },
        {
          id: 'present-simple-third-person-fill-2',
          type: 'fill_blank',
          prompt: 'She ___ (study) the new regulation every week.',
          answer: 'studies',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'He work in compliance.',
        correction: 'He works in compliance.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'She have two reports to review.',
        correction: 'She has two reports to review.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'The department do not follow this policy.',
        correction: 'The department does not follow this policy.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'He studys the new regulation every week.',
        correction: 'He studies the new regulation every week.',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'She checks her email every morning.',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'The department follows this policy.',
        context: 'professional',
      },
    ],
  },

  // 5. PAST_SIMPLE_FORM
  {
    ruleCode: 'PAST_SIMPLE_FORM',
    titleRu: 'Past Simple: форма глагола',
    titleEn: 'Past Simple verb form',
    shortExplanationRu:
      'Правильные глаголы в Past Simple получают окончание -ed (worked). Неправильные глаголы меняют форму полностью и их нужно запоминать (go → went).',
    explanationRu:
      'Past Simple образуется двумя способами. Правильные глаголы («regular verbs») получают окончание -ed: work → worked, check → checked. Есть предсказуемые изменения написания: если глагол оканчивается на -e, добавляется только -d (live → lived); если на согласную+y — -y меняется на -ied (study → studied); если на одну гласную+согласную в ударном слоге — согласная удваивается (stop → stopped). Неправильные глаголы («irregular verbs») меняют форму не по правилу, а произвольно — их нужно запоминать по одному. Наиболее частые в деловом/повседневном английском: go→went, see→saw, have→had, do→did, take→took, make→made, come→came, get→got, be→was/were. Для практики важен не подсчёт общего числа неправильных глаголов, а сам список частотных форм. Это правило только про утвердительные предложения — в вопросах и отрицаниях используется did + базовая форма глагола без -ed (см. DO_DOES_DID_QUESTIONS_NEGATIVES).',
    formula:
      'regular: verb + -ed (spelling: -e→+d, consonant+y→-ied, single-vowel+consonant→doubled+ed) · irregular: запоминаемая форма (go→went)',
    cefrLevel: 'A1_PLUS',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'past-simple-form-fill-1',
          type: 'fill_blank',
          prompt: 'We ___ (submit) the report last week.',
          answer: 'submitted',
        },
        {
          id: 'past-simple-form-choice-1',
          type: 'choice',
          prompt: 'Choose the correct past form of "go".',
          options: ['goed', 'went', 'gone'],
          answer: 'went',
        },
        {
          id: 'past-simple-form-correct-1',
          type: 'correct_sentence',
          prompt: 'She goed to the meeting yesterday.',
          answer: 'She went to the meeting yesterday.',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'Yesterday I go to work.',
        correction: 'Yesterday I went to work.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'We submit the report last week.',
        correction: 'We submitted the report last week.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'She goed to the meeting.',
        correction: 'She went to the meeting.',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'Yesterday I went to work.',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'We submitted the report last week.',
        context: 'professional',
      },
      {
        exampleType: 'EXCEPTION',
        sentence: 'She was in the office yesterday.',
        explanation:
          'be — самый неправильный глагол (was/were, меняется по лицу — единственный past-tense verb с этим свойством).',
      },
    ],
  },

  // 6. PAST_SIMPLE_VS_PRESENT_PERFECT — preserves the four-situation framework, contrast, no-date example
  {
    ruleCode: 'PAST_SIMPLE_VS_PRESENT_PERFECT',
    titleRu: 'Past Simple или Present Perfect',
    titleEn: 'Past Simple vs. Present Perfect',
    shortExplanationRu:
      'Оба времени говорят о прошлом, но по-разному организуют временную перспективу: Past Simple — законченное событие в прошлом, часто часть рассказа; Present Perfect — прошлое, рассматриваемое из настоящего момента (результат, опыт, незаконченный период).',
    explanationRu:
      'Основная рамка: оба времени описывают прошлое, но различаются тем, как говорящий организует временную перспективу, а не просто наличием/отсутствием даты.\n\n' +
      'Past Simple используется, когда событие: (1) относится к завершённому прошлому периоду; (2) представлено как законченное событие; (3) является частью последовательного рассказа о прошлом. Примеры: «I finished the report yesterday.», «We completed the audit last month.», «She worked for this company from 2020 to 2023.», «I opened the file, read the report and called my manager.» (последовательность событий — типичный контекст Past Simple). Важно: Past Simple может использоваться без явной даты, когда контекст уже помещает события в завершённое прошлое — например, «I lost my passport during the trip.» не называет точную календарную дату, но «during the trip» уже устанавливает законченный прошлый эпизод.\n\n' +
      'Present Perfect используется, когда прошлое рассматривается из настоящего момента, включая четыре основные ситуации: (1) текущий результат («I have finished the report. You can review it now.»); (2) жизненный опыт («I have worked with international clients.»); (3) ещё не завершившийся период («I have completed three tasks today.» — день ещё не закончился); (4) действие или состояние, начавшееся раньше и продолжающееся сейчас («I have worked here since 2022.»).\n\n' +
      'Обязательный контраст: «I worked here for five years.» (завершённый период в прошлом — уже не работаю) vs «I have worked here for five years.» (период продолжается сейчас — всё ещё работаю); разница не в самом слове «for», а в том, продолжается ли ситуация сейчас.\n\n' +
      'Signal words — это не безошибочный автоматический классификатор, а полезный, но не абсолютный ориентир. Дополнительные ограничения: (1) отсутствие точного времени не означает автоматически Present Perfect — см. «I lost my passport during the trip.», где Past Simple использован без даты; (2) наличие «важного результата» само по себе недостаточно для выбора Present Perfect — нужен ещё и правильный временной фокус; (3) yesterday/last week/in 2024 — сильные признаки завершённого прошлого времени, но не единственный самостоятельный classifier; (4) смысл и временной контекст важнее одного signal word.',
    formula:
      'Present Perfect: have/has + V3 (result now / life experience / unfinished period / started-in-past-continuing-now) · Past Simple: V-ed/irregular (finished event, часть narrative, дата не обязательна если контекст уже завершённый)',
    cefrLevel: 'B1',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'past-vs-present-perfect-fill-1',
          type: 'fill_blank',
          prompt: 'I ___ (already / finish) the risk assessment.',
          answer: 'have already finished',
        },
        {
          id: 'past-vs-present-perfect-choice-1',
          type: 'choice',
          prompt: 'Choose the correct sentence.',
          options: [
            'I have seen this policy yesterday.',
            'I saw this policy yesterday.',
            'I have see this policy yesterday.',
          ],
          answer: 'I saw this policy yesterday.',
        },
        {
          id: 'past-vs-present-perfect-correct-1',
          type: 'correct_sentence',
          prompt: 'We work here since 2020.',
          answer: 'We have worked here since 2020.',
        },
        {
          id: 'past-vs-present-perfect-choice-2',
          type: 'choice',
          prompt: 'I ___ my passport during the trip.',
          options: ['lost', 'have lost'],
          answer: 'lost',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'I have seen this policy yesterday.',
        correction: 'I saw this policy yesterday.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'I have see this policy yesterday.',
        correction: 'I saw this policy yesterday.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'We work here since 2020.',
        correction: 'We have worked here since 2020.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'Have you finished the report last week?',
        correction: 'Did you finish the report last week?',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'I have already finished the risk assessment.',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'The regulator has not responded to our request yet.',
        context: 'professional',
      },
      {
        exampleType: 'CONTEXT',
        sentence: 'I opened the file, read the report and called my manager.',
        explanation:
          'narrative — последовательность завершённых событий, Past Simple без явной даты',
      },
      {
        exampleType: 'CONTEXT',
        sentence: 'I lost my passport during the trip.',
        explanation:
          'Past Simple без точной календарной даты — «during the trip» уже устанавливает законченный прошлый эпизод; отсутствие даты не означает автоматически Present Perfect',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'I worked here for five years.',
        explanation: 'завершённый период в прошлом — уже не работаю',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'I have worked here for five years.',
        explanation: 'период продолжается сейчас — всё ещё работаю',
      },
    ],
  },

  // 7. MODAL_BASE_VERB
  {
    ruleCode: 'MODAL_BASE_VERB',
    titleRu: 'Модальные глаголы + база',
    titleEn: 'Modal + base verb',
    shortExplanationRu:
      'После модальных глаголов (can, must, should, may, might, could, would) всегда идёт базовая форма глагола — без to, без -s и без окончания прошедшего времени.',
    explanationRu:
      'Модальные глаголы (can, must, should, may, might, could, would и другие) не меняют форму по лицам и не берут -to/-s/-ed сами — и требуют, чтобы следующий за ними глагол тоже стоял в базовой форме, без изменений. Три частые ошибки, которых стоит избегать: (1) не добавляйте to («must to comply» неверно, нужно «must comply»); (2) не добавляйте -s даже после he/she/it («she can works» неверно, нужно «she can work»); (3) не используйте форму прошедшего времени, даже если предложение о прошлом («could went» неверно) — для прошлого нужна отдельная конструкция modal + have + V3 («could have gone»), которая не входит в это MVP-правило.',
    formula:
      'modal (can/must/should/may/might/could/would) + base verb (без to, без -s, без -ed)',
    cefrLevel: 'A2',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'modal-base-verb-fill-1',
          type: 'fill_blank',
          prompt: 'Employees must ___ (report) any conflict of interest.',
          answer: 'report',
        },
        {
          id: 'modal-base-verb-choice-1',
          type: 'choice',
          prompt: 'Choose the correct sentence.',
          options: [
            'She can works from home.',
            'She can work from home.',
            'She can to work from home.',
          ],
          answer: 'She can work from home.',
        },
        {
          id: 'modal-base-verb-correct-1',
          type: 'correct_sentence',
          prompt: 'We should reported the incident.',
          answer: 'We should report the incident.',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'The company must to comply with this regulation.',
        correction: 'The company must comply with this regulation.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'She can works from home on Fridays.',
        correction: 'She can work from home on Fridays.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'We should reported the incident immediately.',
        correction: 'We should report the incident immediately.',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'You should call her before you visit.',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'Employees must report any conflict of interest immediately.',
        context: 'professional',
      },
      {
        exampleType: 'EXCEPTION',
        sentence: 'You ought to inform your manager.',
        explanation:
          'ought to — единственный распространённый (semi-)модальный глагол, который, наоборот, требует to.',
      },
    ],
  },

  // 8. BASIC_PREPOSITION_PATTERNS — preserves arrive in/at distinction, no-universal-formula framing
  {
    ruleCode: 'BASIC_PREPOSITION_PATTERNS',
    titleRu: 'Устойчивые предложные конструкции',
    titleEn: 'Fixed preposition patterns',
    shortExplanationRu:
      'Предлог после многих глаголов и прилагательных не переводится дословно с русского — он часть устойчивой конструкции, которую нужно запоминать целиком.',
    explanationRu:
      'Это правило не претендует на охват всех предлогов английского языка единым принципом — вместо этого это curated набор самых частых устойчивых конструкций «глагол/прилагательное + предлог» для делового и повседневного английского: comply with, depend on, responsible for, interested in, good at, listen to, arrive at (здание/точка) / in (город, страна). Предлог здесь не выбирается по логике, а является фиксированной частью словосочетания, как в русском «отвечать за что-то». Основной способ выучить эти конструкции — запоминать их целиком, каждую как отдельную лексическую единицу, не как применение общего правила.',
    formula:
      'verb/adjective + fixed preposition (запоминается как единое целое, не выводится по формуле)',
    cefrLevel: 'A2_PLUS',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'basic-preposition-patterns-fill-1',
          type: 'fill_blank',
          prompt: 'The company must comply ___ the regulation.',
          answer: 'with',
        },
        {
          id: 'basic-preposition-patterns-choice-1',
          type: 'choice',
          prompt: 'She is responsible ___ this project.',
          options: ['for', 'of', 'at'],
          answer: 'for',
        },
        {
          id: 'basic-preposition-patterns-correct-1',
          type: 'correct_sentence',
          prompt: 'This depends of the audit outcome.',
          answer: 'This depends on the audit outcome.',
        },
        {
          id: 'basic-preposition-patterns-choice-2',
          type: 'choice',
          prompt:
            'We ___ Kazakhstan on Monday, then we ___ the office at 9 AM.',
          options: ['arrived in / arrived at', 'arrived at / arrived in'],
          answer: 'arrived in / arrived at',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'The company must comply to the regulation.',
        correction: 'The company must comply with the regulation.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'She is responsible of this project.',
        correction: 'She is responsible for this project.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'This depends of the outcome of the audit.',
        correction: 'This depends on the outcome of the audit.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'We arrived to the office at 9 AM.',
        correction: 'We arrived at the office at 9 AM.',
      },
      {
        exampleType: 'CORRECT',
        sentence: "I'm interested in learning English.",
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'She is responsible for compliance.',
        context: 'professional',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'We arrived in London.',
        explanation: 'arrive in — город',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'She arrived in Kazakhstan.',
        explanation: 'arrive in — страна',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'We arrived at the office.',
        explanation: 'arrive at — конкретное место/точка',
      },
      {
        exampleType: 'CONTRAST',
        sentence: 'He arrived at the airport.',
        explanation: 'arrive at — конкретное место/точка',
      },
      {
        exampleType: 'EXCEPTION',
        sentence: 'We arrived home yesterday.',
        explanation:
          'arrive home/here/there не требует предлога вообще — не «arrived at home».',
      },
    ],
  },

  // 9. BASIC_WORD_ORDER — reorder-type exercise rephrased as correct_sentence per accepted design
  {
    ruleCode: 'BASIC_WORD_ORDER',
    titleRu: 'Базовый порядок слов',
    titleEn: 'Basic word order',
    shortExplanationRu:
      'В английском предложении обычно порядок: подлежащее → сказуемое → дополнение. Наречия частоты (always, usually) обычно ставятся перед смысловым глаголом, но после to be.',
    explanationRu:
      "В отличие от русского, где порядок слов гибкий, английский язык в основном опирается на порядок слов, чтобы показать, кто выполняет действие: subject (подлежащее) → verb (сказуемое) → object/complement (дополнение). Наречия частоты (always, usually, often, never) — частый источник ошибок: они обычно ставятся перед смысловым глаголом («I always check the documents»), но после глагола to be («She is always late»); «always» в отрицаниях — ещё одно исключение, стоит после be/do + not, тогда как большинство других наречий частоты — перед («She isn't always late», но «She doesn't usually eat lunch here»). Позиция обстоятельств времени/места в конце предложения — это базовый ориентир для A1, а не абсолютное правило: порядок слов в английском достаточно гибкий, и вынесение обстоятельства в начало предложения («Yesterday, I finished the report») — это стилистически нормальный вариант, а не ошибка, особенно для акцента.",
    formula:
      'Subject + Verb + Object (+ Adverb of frequency перед verb / после to be) (+ Time/Place — часто в конце, но не обязательно)',
    cefrLevel: 'A1',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'basic-word-order-correct-1',
          type: 'correct_sentence',
          prompt: 'Yesterday I the report finished.',
          answer: 'I finished the report yesterday.',
        },
        {
          id: 'basic-word-order-choice-1',
          type: 'choice',
          prompt: 'Choose the correctly ordered sentence.',
          options: [
            'Always I check the documents.',
            'I always check the documents.',
            'I check always the documents.',
          ],
          answer: 'I always check the documents.',
        },
        {
          id: 'basic-word-order-correct-2',
          type: 'correct_sentence',
          prompt: 'She always is late for meetings.',
          answer: 'She is always late for meetings.',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'Always I check the documents.',
        correction: 'I always check the documents.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'I check always the documents.',
        correction: 'I always check the documents.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'She always is late for meetings.',
        correction: 'She is always late for meetings.',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'I always check the documents.',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'The auditor usually reviews the reports on Fridays.',
        context: 'professional',
      },
      {
        exampleType: 'EXCEPTION',
        sentence: 'Yesterday, I finished the report.',
        explanation:
          'вынесение обстоятельства времени в начало для акцента — нормальный, не ошибочный вариант (British Council: позиция наречий «очень гибкая»).',
      },
    ],
  },

  // 10. DO_DOES_DID_QUESTIONS_NEGATIVES
  {
    ruleCode: 'DO_DOES_DID_QUESTIONS_NEGATIVES',
    titleRu: 'Вопросы и отрицания с do/does/did',
    titleEn: 'Do-support in questions and negatives',
    shortExplanationRu:
      'В вопросах и отрицаниях Present/Past Simple используется do/does/did, а смысловой глагол остаётся в базовой форме — без -s и без -ed.',
    explanationRu:
      'Когда вы задаёте вопрос или строите отрицание в Present Simple или Past Simple (кроме глагола to be), появляется вспомогательный глагол do/does (настоящее время) или did (прошедшее время), а смысловой глагол возвращается к базовой форме, теряя любые окончания. Present Simple: do/does + subject + base verb («Does she work here?», «I do not agree»). Past Simple: did + subject + base verb («Did you finish the report?», «We did not submit it»). Главная ошибка — двойная маркировка: нельзя пометить и вспомогательный, и смысловой глагол одновременно («did went» неверно — did уже показывает прошедшее время; нужно «did go»). Та же логика для -s: «does she works» неверно (does уже показывает 3-е лицо; нужно «does she work»).',
    formula:
      'Do/Does + subject + base verb (present) · Did + subject + base verb (past) · do/does/did + not + base verb (negative)',
    cefrLevel: 'A1_PLUS',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'do-does-did-fill-1',
          type: 'fill_blank',
          prompt: '___ you ___ (finish) the report yesterday?',
          answer: 'Did / finish',
        },
        {
          id: 'do-does-did-choice-1',
          type: 'choice',
          prompt: 'Choose the correct question.',
          options: [
            'Does she works on Fridays?',
            'Does she work on Fridays?',
            'Do she works on Fridays?',
          ],
          answer: 'Does she work on Fridays?',
        },
        {
          id: 'do-does-did-correct-1',
          type: 'correct_sentence',
          prompt: 'Did you went to the meeting?',
          answer: 'Did you go to the meeting?',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'Did you went to the meeting?',
        correction: 'Did you go to the meeting?',
      },
      {
        exampleType: 'INCORRECT',
        sentence: "She doesn't works on Fridays.",
        correction: "She doesn't work on Fridays.",
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'Does she has the report?',
        correction: 'Does she have the report?',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'Did you call your mother yesterday?',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'Did the regulator approve the new policy?',
        context: 'professional',
      },
      {
        exampleType: 'EXCEPTION',
        sentence: 'You finished the report?',
        explanation:
          'вопрос через интонацию без do-support грамматически допустим в разговорной речи, но не рекомендуется для делового письменного английского.',
      },
    ],
  },

  // 11. COUNTABLE_UNCOUNTABLE — preserves the contextual-countability caveat (evidence/research/feedback/software/work/knowledge/experience)
  {
    ruleCode: 'COUNTABLE_UNCOUNTABLE',
    titleRu: 'Исчисляемые и неисчисляемые существительные',
    titleEn: 'Countable vs. uncountable nouns',
    shortExplanationRu:
      'Неисчисляемые существительные (information, advice, evidence, equipment) обычно не имеют множественного числа и не берут a/an в значении, которое описывает это правило — это не универсальное лингвистическое свойство слова навсегда. В обычной речи для количества чаще используется a lot of, а much — в вопросах, отрицаниях и более формальном стиле.',
    explanationRu:
      'Некоторые английские существительные, которые в русском кажутся «счётными», в английском грамматически обычно неисчисляемы в том значении, которое описывает это правило — у них нет формы множественного числа в этом значении (нельзя «informations», «advices», «evidences»), и они не берут артикль a/an. Частые проблемные слова: information, advice, evidence, research, equipment, knowledge, feedback, furniture, software, news, progress.\n\n' +
      'Обязательная оговорка: «неисчисляемое» здесь не означает «слово никогда не бывает исчисляемым» — это описание конкретного, самого частого значения слова, а не универсальное лингвистическое определение. У отдельных слов есть countable senses в другом контексте, регистре или профессиональном значении. В частности: evidence — как юридический термин может встречаться в форме «evidences» в некоторых специализированных/устаревших контекстах, но в стандартном современном употреблении неисчисляемо; research — обычно неисчисляемо («research shows»), но «a research» иногда встречается в некоторых научных/институциональных контекстах как «исследовательский проект» (не рекомендуется для MVP-уровня, отмечено как edge case); feedback — стандартно неисчисляемо, встречается счётным реже, чем остальные в списке (наименее подтверждено источниками); software — неисчисляемо как обозначение ПО в целом, но профессионалы иногда говорят «a software» неформально для «программа/приложение» (не рекомендуется как учебная норма); work — неисчисляемо в значении «работа/усилие», но исчисляемо в значении «произведение» («a work of art», «works of art»); knowledge — стандартно неисчисляемо, устойчиво во всех проверенных источниках; experience — неисчисляемо в значении «опыт вообще» («She has experience in compliance»), но исчисляемо в значении «отдельный случай/событие» («a frightening experience»).\n\n' +
      "Для количества неисчисляемых в обычных утвердительных предложениях чаще звучит естественно a lot of («We collected a lot of evidence» / «substantial evidence» в более формальном/деловом контексте) — much тоже грамматически верно, но в утвердительных предложениях воспринимается более формально/книжно; much типичен в вопросах и отрицаниях («Is there much evidence?», «There isn't much evidence»). Many/few — только для исчисляемого множественного числа («many reports», «few documents»), не для неисчисляемых. Some/any работают с обоими типами одинаково.",
    formula:
      'uncountable (в описанном значении), affirmative: a lot of / substantial + noun (no plural, no a/an); uncountable, question/negative/formal: much + noun also natural · countable plural: many/few + noun-s',
    cefrLevel: 'A2',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      exercises: [
        {
          id: 'countable-uncountable-fill-1',
          type: 'fill_blank',
          prompt: 'We do not have ___ (many/much) information about this case.',
          answer: 'much',
        },
        {
          id: 'countable-uncountable-choice-1',
          type: 'choice',
          prompt: 'Choose the correct sentence.',
          options: [
            'We collected many evidences.',
            'We collected a lot of evidence.',
            'We collected a evidence.',
          ],
          answer: 'We collected a lot of evidence.',
        },
        {
          id: 'countable-uncountable-correct-1',
          type: 'correct_sentence',
          prompt: 'Please give me an advice.',
          answer: 'Please give me some advice.',
        },
        {
          id: 'countable-uncountable-choice-2',
          type: 'choice',
          prompt: 'Can you give me some ___?',
          options: ['advice', 'a advice', 'a piece of advice'],
          answer: 'advice',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'We collected many evidences.',
        correction: 'We collected a lot of evidence.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'We do not have many information about this case.',
        correction: 'We do not have much information about this case.',
        explanation: 'отрицание — much здесь звучит естественно',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'Please give me an advice.',
        correction: 'Please give me some advice.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'We need more equipments for this project.',
        correction:
          'We need more equipment for this project. (или We need more pieces of equipment for this project.)',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'Can you give me some advice?',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'We collected substantial evidence during the investigation.',
        context: 'professional',
      },
      {
        exampleType: 'CONTEXT',
        sentence: 'a piece of information',
        explanation:
          'single-item workaround для неисчисляемого information (some information / a piece of information)',
      },
      {
        exampleType: 'CONTEXT',
        sentence: 'a piece of advice',
        explanation:
          'single-item workaround для неисчисляемого advice (some advice / a piece of advice)',
      },
      {
        exampleType: 'CONTEXT',
        sentence: 'pieces of equipment',
        explanation:
          'workaround для неисчисляемого equipment (equipment / pieces of equipment)',
      },
      {
        exampleType: 'EXCEPTION',
        sentence: 'This is a fascinating work of art.',
        explanation:
          'work неисчисляемо в значении «работа/усилие», но исчисляемо в значении «произведение» (a work of art / works of art).',
      },
    ],
  },

  // 12. SINGULAR_PLURAL_ARTICLE_AGREEMENT
  {
    ruleCode: 'SINGULAR_PLURAL_ARTICLE_AGREEMENT',
    titleRu: 'Согласование числа и артикля',
    titleEn: 'Number/article agreement',
    shortExplanationRu:
      'A/an ставится только перед существительным в единственном числе. Перед множественным числом a/an не ставится вообще.',
    explanationRu:
      'A/an всегда сочетается только с существительным в единственном числе: «a books», «an apples» — неверные сочетания. Если существительное во множественном числе и речь идёт об общем количестве — артикль не нужен вообще (см. ARTICLE_ZERO_GENERAL). Отдельная полезная конструкция — «one of the + существительное во множественном числе» («one of the reports» — «один из отчётов»): the здесь относится не к самому множественному числу напрямую, а к уточнённой группе, из которой выбирается один. Правило — просто прямое соответствие числа: a/an только с единственным числом. Важно: не каждое слово, оканчивающееся на -s, стоит во множественном числе — news, mathematics/maths, physics, economics, gymnastics, aerobics, measles, mumps грамматически единственные, несмотря на окончание -s; species и series имеют одну и ту же форму для единственного и множественного числа. Поэтому определять число «по -s на конце» ненадёжно — надо смотреть на реальное значение и согласование с глаголом (news is, не news are).',
    formula:
      'a/an + singular noun (никогда + plural) · one of the + plural noun',
    cefrLevel: 'A1_PLUS',
    exerciseTemplates: {
      exerciseSchemaVersion: GRAMMAR_EXERCISE_SCHEMA_VERSION,
      // The decision-pack's fill_blank exercise here has an empty-string
      // ("no article") answer, not representable as a valid fill_blank
      // exercise for the current runtime (see ARTICLE_ZERO_GENERAL above
      // for the confirmed reason) — replaced with an equivalent `choice`
      // exercise below (singular-plural-article-agreement-choice-1) that
      // tests the same already-reviewed fact via the same
      // "(no article)"-option pattern already used by
      // ARTICLE_ZERO_GENERAL's choice exercise.
      exercises: [
        {
          id: 'singular-plural-article-agreement-choice-1',
          type: 'choice',
          prompt: 'We received ___ documents from the regulator.',
          options: ['a', 'the', '(no article)'],
          answer: '(no article)',
        },
        {
          id: 'singular-plural-article-agreement-choice-2',
          type: 'choice',
          prompt: 'Choose the correct sentence.',
          options: [
            'She is a one of the best auditors.',
            'She is one of the best auditors.',
            'She is an one of the best auditors.',
          ],
          answer: 'She is one of the best auditors.',
        },
        {
          id: 'singular-plural-article-agreement-correct-1',
          type: 'correct_sentence',
          prompt: 'An employees must comply with this policy.',
          answer: 'Employees must comply with this policy.',
        },
      ],
    },
    examples: [
      {
        exampleType: 'INCORRECT',
        sentence: 'We received a documents from the regulator.',
        correction: 'We received documents from the regulator.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'She is a one of the best auditors.',
        correction: 'She is one of the best auditors.',
      },
      {
        exampleType: 'INCORRECT',
        sentence: 'An employees must comply with this policy.',
        correction: 'Employees must comply with this policy.',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'One of the books on the shelf is mine.',
        context: 'everyday',
      },
      {
        exampleType: 'CORRECT',
        sentence: 'One of the reports contained an error.',
        context: 'professional',
      },
      {
        exampleType: 'EXCEPTION',
        sentence: 'The news is good.',
        explanation:
          'news оканчивается на -s, но грамматически единственное число (news is, не news are) — суффикс -s сам по себе не доказывает множественное число.',
      },
    ],
  },
];
