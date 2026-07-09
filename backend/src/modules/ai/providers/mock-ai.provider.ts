import { Injectable } from '@nestjs/common';
import { LessonContentType } from '@prisma/client';
import { AiControlSuggestion, AiRiskSuggestion } from '../types/ai-results';
import {
  AiProvider,
  AnalysisFactsContext,
  CampaignMessageContext,
  CampaignMessageDraft,
  CaseStudyContext,
  CaseStudyDraft,
  ChatFactsContext,
  ControlSuggestionContext,
  CourseOutlineContext,
  CourseOutlineDraft,
  CourseOutlineModuleDraft,
  CrossModuleFactsContext,
  GenerateRiskForProcessContext,
  ImproveDescriptionContext,
  LessonContentContext,
  LessonContentDraft,
  MemoContext,
  MemoDraft,
  QuizDraft,
  QuizQuestionDraft,
  QuizQuestionsContext,
  ReportFactsContext,
  RiskRegisterFactsContext,
  RiskSuggestionContext,
  RiskTemplateDraft,
  SuggestRiskActionsContext,
} from './ai-provider.interface';

const MODULE_TITLE_TEMPLATES = [
  'Введение и цели обучения',
  'Основные понятия и нормативные требования',
  'Практические ситуации и разбор кейсов',
  'Типичные нарушения и ответственность',
  'Итоговое закрепление материала',
  'Дополнительные материалы и ресурсы',
];

const QUIZ_QUESTION_TEMPLATES: {
  text: (topic: string) => string;
  options: string[];
  correctIndex: number;
}[] = [
  {
    text: (topic) =>
      `Что из перечисленного наиболее точно относится к теме «${topic}»?`,
    options: [
      'Формальное соблюдение процедуры без анализа существа вопроса',
      'Своевременное выявление и информирование комплаенс-офицера о признаках нарушения',
      'Игнорирование признаков нарушения при отсутствии прямого указания руководства',
      'Принятие решения исключительно на основании личного опыта сотрудника',
    ],
    correctIndex: 1,
  },
  {
    text: (topic) =>
      `Какое действие сотрудника является правильным при возникновении конфликта интересов в рамках темы «${topic}»?`,
    options: [
      'Самостоятельно устранить конфликт, не уведомляя руководство',
      'Продолжить участие в принятии решения, если конфликт незначителен',
      'Раскрыть конфликт интересов и устраниться от принятия решения в соответствии с политикой компании',
      'Передать решение вопроса коллеге без документального оформления',
    ],
    correctIndex: 2,
  },
  {
    text: (topic) =>
      `Кому следует сообщить о выявленных признаках нарушения по теме «${topic}»?`,
    options: [
      'Комплаенс-офицеру или по каналу для сообщений о нарушениях',
      'Только непосредственному руководителю в устной форме',
      'Внешним контрагентам для получения независимой оценки',
      'Никому, если нарушение не привело к материальному ущербу',
    ],
    correctIndex: 0,
  },
  {
    text: (topic) =>
      `Верно ли утверждение: соблюдение требований по теме «${topic}» распространяется на всех сотрудников независимо от должности?`,
    options: [
      'Верно',
      'Неверно — только на руководителей',
      'Неверно — только на новых сотрудников',
      'Неверно — только на определённые подразделения',
    ],
    correctIndex: 0,
  },
  {
    text: (topic) =>
      `Какая мера контроля наиболее эффективна для снижения рисков, связанных с темой «${topic}»?`,
    options: [
      'Отсутствие контроля при высоком уровне доверия к сотруднику',
      'Разделение полномочий и обязательное согласование ключевых решений',
      'Устная договорённость между коллегами без фиксации',
      'Проверка только по итогам жалоб клиентов',
    ],
    correctIndex: 1,
  },
];

const FACTOR_TYPE_RISK_HINTS: Record<
  string,
  { scheme: string; factorLabel: string }
> = {
  DISCRETION: {
    scheme:
      'принятие решения по личному усмотрению без формализованных критериев',
    factorLabel: 'широкие дискреционные полномочия',
  },
  CONFLICT_OF_INTEREST: {
    scheme:
      'принятие решения в пользу аффилированного лица без раскрытия конфликта интересов',
    factorLabel: 'наличие конфликта интересов',
  },
  LACK_OF_CONTROL: {
    scheme:
      'совершение операции без последующей проверки со стороны контролирующего лица',
    factorLabel: 'отсутствие контроля за исполнением',
  },
  OPACITY: {
    scheme:
      'сокрытие оснований и хода принятия решения от заинтересованных сторон',
    factorLabel: 'непрозрачность процедуры',
  },
  EXCEPTIONS: {
    scheme: 'необоснованное применение исключения из установленного порядка',
    factorLabel: 'наличие исключений из общего порядка',
  },
  MANUAL_OPERATIONS: {
    scheme: 'ручная корректировка данных без автоматического контроля',
    factorLabel: 'ручной характер операций',
  },
  INFORMATION_ACCESS: {
    scheme:
      'использование служебной информации в личных целях до её официального раскрытия',
    factorLabel: 'доступ к непубличной информации',
  },
  SUPPLIER_CONTACTS: {
    scheme: 'получение выгоды от поставщика в обмен на преференции при выборе',
    factorLabel: 'прямые контакты с поставщиками',
  },
  HR_DECISIONS: {
    scheme: 'кадровое решение в обход установленных критериев отбора',
    factorLabel: 'дискреционность кадровых решений',
  },
  FINANCIAL_OPERATIONS: {
    scheme:
      'проведение финансовой операции без должного обоснования и согласования',
    factorLabel: 'непосредственное распоряжение финансовыми средствами',
  },
  PROCUREMENT: {
    scheme: 'манипулирование условиями закупки в пользу конкретного поставщика',
    factorLabel: 'участие в закупочных процедурах',
  },
  PERMITS: {
    scheme:
      'выдача разрешения/согласования за вознаграждение или без должных оснований',
    factorLabel: 'выдача разрешительных документов',
  },
  PROPERTY_USE: {
    scheme: 'использование имущества компании в личных целях',
    factorLabel: 'распоряжение имуществом компании',
  },
};

const DEFAULT_FACTOR_TYPES = ['DISCRETION', 'LACK_OF_CONTROL'];

@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  async suggestRisks(ctx: RiskSuggestionContext): Promise<AiRiskSuggestion[]> {
    const factorTypes = ctx.existingFactorTypes.length
      ? ctx.existingFactorTypes
      : DEFAULT_FACTOR_TYPES;
    return factorTypes.slice(0, 2).map((factorType, index) => {
      const hint =
        FACTOR_TYPE_RISK_HINTS[factorType] ?? FACTOR_TYPE_RISK_HINTS.DISCRETION;
      return {
        riskTitle: `Риск злоупотребления на этапе «${ctx.processStepName}» (${hint.factorLabel})`,
        riskDescription:
          `На процессном шаге «${ctx.processStepName}»` +
          (ctx.departmentName ? ` (${ctx.departmentName})` : '') +
          ` выявлен фактор «${hint.factorLabel}», создающий условия для злоупотребления служебным положением.`,
        processStage: ctx.processStepName,
        riskFactors: [hint.factorLabel],
        possibleSchemes: [
          hint.scheme.charAt(0).toUpperCase() + hint.scheme.slice(1),
        ],
        rootCauses: [
          'Отсутствие формализованного регламента для данного этапа процесса',
          'Недостаточное разделение полномочий между исполнителем и контролирующим лицом',
        ],
        recommendedControls: [
          'Внедрение обязательного второго подтверждения (принцип "четырёх глаз")',
          'Регулярный выборочный аудит операций на данном этапе',
        ],
        mitigationMeasures: [
          {
            measure: `Разработать и утвердить регламент для этапа «${ctx.processStepName}» с чёткими критериями принятия решений`,
            responsibleUnit:
              ctx.departmentName ?? 'Ответственное подразделение',
            deadline: '90 дней с даты утверждения плана мероприятий',
            expectedResult:
              'Снижение дискреционности решения и создание проверяемого следа операций',
          },
        ],
        confidence: index === 0 ? 'medium' : 'low',
      };
    });
  }

  async suggestControls(
    ctx: ControlSuggestionContext,
  ): Promise<AiControlSuggestion[]> {
    const base = ctx.riskTitle.trim();
    return [
      {
        controlType: 'PREVENTIVE',
        description: `Предварительное согласование решений по риску «${base}» независимым должностным лицом`,
        implementationNotes:
          'Закрепить в регламенте обязательность согласования до совершения операции; определить перечень согласующих лиц.',
        confidence: 'medium',
      },
      {
        controlType: 'DETECTIVE',
        description: `Периодическая выборочная проверка операций, связанных с риском «${base}»`,
        implementationNotes:
          'Проводить проверку не реже одного раза в квартал силами внутреннего аудита или комплаенс-службы.',
        confidence: 'medium',
      },
      {
        controlType: 'CORRECTIVE',
        description:
          'Порядок реагирования и эскалации при выявлении отклонения от установленной процедуры',
        implementationNotes:
          'Определить ответственного за расследование и сроки принятия корректирующих мер.',
        confidence: 'low',
      },
    ];
  }

  async reviewAnalysis(ctx: AnalysisFactsContext) {
    const missingConsiderations: string[] = [];
    const qualityIssues: string[] = [];

    if (ctx.processStepsCount === 0) {
      missingConsiderations.push(
        'Не заполнена карта бизнес-процессов (этап 5) — невозможно оценить полноту охвата.',
      );
    }
    if (ctx.factorsCount === 0 && ctx.processStepsCount > 0) {
      missingConsiderations.push(
        'Для процессных шагов не выявлено ни одного коррупциогенного фактора.',
      );
    }
    if (ctx.risksWithoutAssessment > 0) {
      qualityIssues.push(
        `${ctx.risksWithoutAssessment} риск(ов) не имеют оценки вероятности/последствий.`,
      );
    }
    if (ctx.risksWithoutRecommendations > 0) {
      qualityIssues.push(
        `${ctx.risksWithoutRecommendations} риск(ов) не имеют ни одной рекомендации.`,
      );
    }
    if (ctx.risksCount > 0 && ctx.actionItemsCount === 0) {
      qualityIssues.push(
        'По выявленным рискам отсутствуют мероприятия плана действий.',
      );
    }

    const summary =
      ctx.risksCount === 0
        ? `Анализ «${ctx.analysisName}» находится на ранней стадии — риски ещё не выявлены.`
        : `Анализ «${ctx.analysisName}» охватывает ${ctx.processStepsCount} процессных шагов и ${ctx.risksCount} выявленных рисков. ` +
          (qualityIssues.length
            ? 'Обнаружены пробелы, требующие внимания перед согласованием анализа.'
            : 'Существенных пробелов не выявлено, анализ выглядит методологически последовательным.');

    return { missingConsiderations, qualityIssues, summary };
  }

  async generateExecutiveSummary(ctx: ReportFactsContext): Promise<string> {
    return (
      `По итогам внутреннего анализа коррупционных рисков «${ctx.analysisName}» (${ctx.code}) ` +
      (ctx.subject ? `по предмету «${ctx.subject}» ` : '') +
      `было обследовано ${ctx.processStepsCount} этапов бизнес-процесса и выявлено ${ctx.risksCount} коррупционных рисков. ` +
      `Для устранения выявленных рисков сформировано ${ctx.actionItemsCount} мероприятий плана действий. ` +
      'Рекомендуется утвердить план действий и обеспечить контроль исполнения ответственными подразделениями.'
    );
  }

  async proposeRiskRegisterEntry(ctx: RiskRegisterFactsContext) {
    return {
      title: ctx.riskTitle,
      description:
        (ctx.riskDescription ? `${ctx.riskDescription} ` : '') +
        (ctx.corruptionScheme
          ? `Возможная схема реализации: ${ctx.corruptionScheme}.`
          : ''),
      categoryHint:
        'Коррупционный риск (уточните категорию из справочника Библиотеки рисков)',
      justification: `Риск выявлен в ходе внутреннего анализа коррупционных рисков и подлежит включению в реестр рисков компании для дальнейшего мониторинга и контроля.`,
    };
  }

  async chat(ctx: ChatFactsContext): Promise<string> {
    const prefix = ctx.moduleHint ? `[${ctx.moduleHint}] ` : '';
    return (
      `${prefix}Спасибо за вопрос. Как ИИ-ассистент по комплаенсу я рекомендую обратиться к разделу системы, ` +
      `соответствующему вашему вопросу («${ctx.message.slice(0, 120)}»), и свериться с внутренними политиками компании. ` +
      'Для окончательного решения по коррупционным рискам и юридически значимым вопросам обратитесь к комплаенс-офицеру.'
    );
  }

  async generateCrossModuleInsights(
    ctx: CrossModuleFactsContext,
  ): Promise<string[]> {
    const insights: string[] = [];

    if (ctx.vakrOverdue > 0) {
      insights.push(
        `${ctx.vakrOverdue} из ${ctx.vakrTotal} анализов ВАКР имеют просроченный срок исполнения — рекомендуется актуализировать сроки или ускорить завершение анализа.`,
      );
    }
    if (ctx.criticalRisks > 0) {
      insights.push(
        `В реестре зафиксировано ${ctx.criticalRisks} критических рисков (из ${ctx.activeRisks} активных) — рекомендуется приоритизировать их рассмотрение на комитете по рискам.`,
      );
    }
    if (ctx.ineffectiveControls > 0) {
      insights.push(
        `${ctx.ineffectiveControls} контрольных мероприятий признаны неэффективными — риски, которые они должны снижать, могут быть занижены в оценке остаточного риска.`,
      );
    }
    if (ctx.incidentsOpen + ctx.incidentsUnderReview > 0) {
      insights.push(
        `${ctx.incidentsOpen + ctx.incidentsUnderReview} служебных проверок находятся в работе (на рассмотрении или открыты) — обратите внимание на сроки их завершения.`,
      );
    }
    if (ctx.academyOverdueAssignments > 0) {
      insights.push(
        `${ctx.academyOverdueAssignments} назначенных обучений просрочены — недостаточная осведомлённость работников может повышать коррупционные риски в соответствующих подразделениях.`,
      );
    }
    if (insights.length === 0) {
      insights.push(
        `Существенных кросс-модульных отклонений не выявлено: критических рисков нет, просроченных анализов ВАКР и обучений нет, завершённость Академии комплаенса — ${ctx.academyCompletionPercent}%.`,
      );
    }

    return insights;
  }

  private buildLessonContent(ctx: LessonContentContext): string {
    const { lessonTitle, courseTopic, contentType } = ctx;
    if (contentType === 'CASE_STUDY' || contentType === 'PRACTICAL_TASK') {
      return (
        `## ${lessonTitle}\n\n` +
        `**Ситуация.** В рамках темы «${courseTopic}» сотрудник подразделения сталкивается со следующей ситуацией: ` +
        'контрагент предлагает подарок сверх установленного компанией лимита в обмен на ускоренное согласование документов, при этом формальные основания для отказа от рассмотрения запроса контрагента отсутствуют.\n\n' +
        '**Вопросы для обсуждения:**\n' +
        '- Какие коррупциогенные факторы присутствуют в этой ситуации?\n' +
        '- Какие внутренние политики компании применимы к данному случаю?\n' +
        '- Каким должен быть правильный порядок действий сотрудника?\n\n' +
        '**Разбор.** Правильные действия — зафиксировать факт предложения, отказаться от подарка сверх лимита и уведомить комплаенс-офицера в соответствии с политикой компании по подаркам и представительским расходам.'
      );
    }
    return (
      `## ${lessonTitle}\n\n` +
      '### Что нужно знать\n' +
      `Данный урок раскрывает тему «${lessonTitle}» в рамках курса «${courseTopic}» и знакомит с базовыми требованиями, которые должен соблюдать каждый сотрудник.\n\n` +
      '### Ключевые требования\n' +
      '- Соблюдать применимые внутренние политики и нормативные требования\n' +
      '- Своевременно выявлять и документировать признаки нарушений\n' +
      '- Обращаться к комплаенс-офицеру при возникновении сомнений\n\n' +
      '### Типичные ошибки\n' +
      '- Формальное прохождение процедуры без анализа существа вопроса\n' +
      '- Несвоевременное информирование ответственных подразделений о выявленных рисках'
    );
  }

  async generateCourseOutline(
    ctx: CourseOutlineContext,
  ): Promise<CourseOutlineDraft> {
    const modules: CourseOutlineModuleDraft[] = [];
    for (let i = 0; i < ctx.moduleCount; i++) {
      const moduleTitle =
        MODULE_TITLE_TEMPLATES[i % MODULE_TITLE_TEMPLATES.length];
      const contentType: LessonContentType = moduleTitle.includes(
        'Практические ситуации',
      )
        ? 'CASE_STUDY'
        : 'ARTICLE';
      const lessonTitle = `${moduleTitle}: ${ctx.topic}`;
      modules.push({
        order: i + 1,
        title: moduleTitle,
        lessons: [
          {
            order: 1,
            title: lessonTitle,
            contentType,
            content: this.buildLessonContent({
              courseTopic: ctx.topic,
              lessonTitle,
              contentType,
            }),
          },
        ],
      });
    }

    return {
      title: `Курс: ${ctx.topic}`,
      description:
        `Курс охватывает тему «${ctx.topic}»` +
        (ctx.audienceHint
          ? ` для целевой аудитории: ${ctx.audienceHint}.`
          : '.') +
        (ctx.level ? ` Уровень: ${ctx.level}.` : '') +
        (ctx.sourceText
          ? ' Структура составлена с учётом загруженного материала-источника.'
          : '') +
        ' Черновик сформирован ИИ-ассистентом и требует проверки комплаенс-офицером перед публикацией.',
      goals: ctx.goals?.length
        ? ctx.goals
        : [
            `Сформировать у работников понимание требований по теме «${ctx.topic}»`,
            'Научить распознавать типичные нарушения и правильно на них реагировать',
            'Закрепить порядок действий при возникновении сомнительной ситуации',
          ],
      modules,
      recommendedTest: {
        title: `Итоговый тест по курсу «${ctx.topic}»`,
        questionCount: 5,
      },
      recommendedCases: [
        `Кейс: предложение подарка сверх лимита в контексте темы «${ctx.topic}»`,
        `Кейс: конфликт интересов при принятии решения по теме «${ctx.topic}»`,
      ],
    };
  }

  async generateLessonContent(
    ctx: LessonContentContext,
  ): Promise<LessonContentDraft> {
    return {
      content: this.buildLessonContent(ctx),
      goal: `Сформировать у работников практическое понимание темы «${ctx.lessonTitle}» и порядка действий в типичных ситуациях.`,
      keyPoints: [
        'Соблюдать применимые внутренние политики и нормативные требования',
        'Своевременно выявлять и документировать признаки нарушений',
        'Обращаться к комплаенс-офицеру при возникновении сомнений',
      ],
      practicalExample:
        'Контрагент предлагает ускорить согласование документов в обмен на подарок сверх установленного лимита — правильные действия: отказаться, зафиксировать факт и уведомить комплаенс-офицера.',
      selfCheckQuestions: [
        `Какие внутренние документы регулируют тему «${ctx.lessonTitle}»?`,
        'Каков порядок действий при выявлении признаков нарушения?',
        'К кому необходимо обратиться при возникновении сомнений?',
      ],
    };
  }

  async generateQuizQuestions(
    ctx: QuizQuestionsContext,
  ): Promise<QuizQuestionDraft[]> {
    const count = Math.min(
      ctx.questionCount,
      QUIZ_QUESTION_TEMPLATES.length * 2,
    );
    const types =
      ctx.questionTypes && ctx.questionTypes.length > 0
        ? ctx.questionTypes
        : ['SINGLE_CHOICE' as const];
    return Array.from({ length: count }, (_, index) => {
      const type = types[index % types.length];
      const template =
        QUIZ_QUESTION_TEMPLATES[index % QUIZ_QUESTION_TEMPLATES.length];
      if (type === 'TRUE_FALSE') {
        return {
          order: index + 1,
          type: 'TRUE_FALSE' as const,
          text: `Верно ли утверждение: при выявлении признаков нарушения по теме «${ctx.topic}» работник обязан уведомить комплаенс-офицера?`,
          points: 10,
          options: [
            { order: 1, text: 'Верно', isCorrect: true },
            { order: 2, text: 'Неверно', isCorrect: false },
          ],
          explanation:
            'Информирование комплаенс-офицера — обязательное требование внутренних антикоррупционных политик.',
        };
      }
      if (type === 'MULTIPLE_CHOICE') {
        return {
          order: index + 1,
          type: 'MULTIPLE_CHOICE' as const,
          text: `Какие действия являются правильными в рамках темы «${ctx.topic}»? (выберите все подходящие варианты)`,
          points: 10,
          options: [
            {
              order: 1,
              text: 'Зафиксировать выявленные признаки нарушения документально',
              isCorrect: true,
            },
            {
              order: 2,
              text: 'Уведомить комплаенс-офицера',
              isCorrect: true,
            },
            {
              order: 3,
              text: 'Игнорировать ситуацию при отсутствии прямого указания руководителя',
              isCorrect: false,
            },
            {
              order: 4,
              text: 'Самостоятельно провести расследование без уведомления ответственных лиц',
              isCorrect: false,
            },
          ],
          explanation:
            'Правильные действия — фиксация и информирование; самостоятельные расследования и бездействие нарушают установленный порядок.',
        };
      }
      return {
        order: index + 1,
        type: 'SINGLE_CHOICE' as const,
        text: template.text(ctx.topic),
        points: 10,
        options: template.options.map((text, optionIndex) => ({
          order: optionIndex + 1,
          text,
          isCorrect: optionIndex === template.correctIndex,
        })),
        explanation:
          'Правильный вариант соответствует требованиям внутренних политик о своевременном информировании и прозрачности действий.',
      };
    });
  }

  async generateQuiz(ctx: QuizQuestionsContext): Promise<QuizDraft> {
    return {
      questions: await this.generateQuizQuestions(ctx),
      suggestedPassingScore: 70,
    };
  }

  async generateCaseStudy(ctx: CaseStudyContext): Promise<CaseStudyDraft> {
    return {
      title: `Кейс: ${ctx.topic}`,
      situation:
        `Сотрудник${ctx.audienceHint ? ` (${ctx.audienceHint})` : ''} в рамках темы «${ctx.topic}» сталкивается со следующей ситуацией: ` +
        'контрагент предлагает неформально «ускорить» решение вопроса и намекает на вознаграждение, при этом формальных оснований для отказа в рассмотрении обращения нет.',
      question: 'Как должен поступить работник в этой ситуации?',
      options: [
        {
          text: 'Принять предложение, если сумма незначительна и никто не узнает',
          isCorrect: false,
        },
        {
          text: 'Отказаться, зафиксировать факт предложения и уведомить комплаенс-офицера',
          isCorrect: true,
        },
        {
          text: 'Передать вопрос коллеге, не сообщая о предложении',
          isCorrect: false,
        },
        {
          text: 'Продолжить работу, проигнорировав намёк, без уведомления кого-либо',
          isCorrect: false,
        },
      ],
      correctApproach:
        'Отказаться от предложения, документально зафиксировать факт и незамедлительно уведомить комплаенс-офицера в установленном порядке.',
      analysis:
        'Ситуация содержит признаки склонения к коррупционному правонарушению. Молчание или передача вопроса коллеге не устраняют риск и могут повлечь ответственность за несообщение. Правильные действия защищают и работника, и организацию.',
      complianceRiskLink: `Коррупционный риск: получение незаконного вознаграждения при выполнении функций по теме «${ctx.topic}» (факторы: внешнее взаимодействие, дискреционные полномочия).`,
    };
  }

  async generateMemo(ctx: MemoContext): Promise<MemoDraft> {
    return {
      title: `Памятка: ${ctx.topic}`,
      summary: `Краткая памятка для работников по теме «${ctx.topic}»: основные требования, порядок действий и контакты для обращения. Черновик сформирован ИИ-ассистентом — проверьте актуальность ссылок на внутренние документы перед публикацией.`,
      checklist: [
        'Ознакомиться с применимой внутренней политикой по данной теме',
        'При взаимодействии с внешними лицами фиксировать существенные договорённости письменно',
        'При возникновении сомнительной ситуации — приостановить действие и получить консультацию',
        'Сообщать о признаках нарушений в установленном порядке',
      ],
      prohibited: [
        'Принимать подарки и вознаграждения сверх установленного лимита',
        'Принимать решения в условиях нераскрытого конфликта интересов',
        'Игнорировать выявленные признаки нарушений',
      ],
      required: [
        'Раскрывать конфликт интересов до принятия решения',
        'Уведомлять комплаенс-офицера о попытках склонения к нарушению',
        'Соблюдать порядок согласования, установленный внутренними документами',
      ],
      contacts:
        'Комплаенс-офицер организации; горячая линия комплаенс (при наличии); непосредственный руководитель.',
    };
  }

  async generateCampaignMessage(
    ctx: CampaignMessageContext,
  ): Promise<CampaignMessageDraft> {
    return {
      subject: `Обучение: ${ctx.topic}`,
      body:
        `Коллеги, приглашаем пройти обучение по теме «${ctx.topic}».` +
        (ctx.courseTitle
          ? ` Курс «${ctx.courseTitle}» уже доступен в Академии комплаенса.`
          : '') +
        ' Обучение поможет уверенно действовать в типичных ситуациях и снизить риски для вас и компании. Прохождение займёт немного времени, а знания пригодятся в ежедневной работе.',
      keyPoints: [
        'Какие требования обязательны для каждого работника',
        'Как распознать сомнительную ситуацию',
        'Куда обращаться при возникновении вопросов',
      ],
      linkText: ctx.linkHint ?? 'Перейти к курсу в Академии комплаенса',
      surveyQuestions: [
        `Насколько понятны вам требования по теме «${ctx.topic}»? (1–5)`,
        'Сталкивались ли вы с ситуациями, требующими консультации комплаенс-офицера?',
        'Какие темы обучения были бы полезны вам в дальнейшем?',
      ],
    };
  }

  async improveRiskDescription(
    ctx: ImproveDescriptionContext,
  ): Promise<{ improvedDescription: string }> {
    const base = ctx.description.trim().replace(/\s+/g, ' ');
    const improvedDescription = `${base}${base.endsWith('.') ? '' : '.'} Риск реализуется в условиях недостаточного разделения полномочий и ограниченного независимого контроля, что повышает вероятность его наступления при отсутствии дополнительных мер реагирования.`;
    return { improvedDescription };
  }

  async suggestRiskActions(ctx: SuggestRiskActionsContext): Promise<string[]> {
    const base = ctx.riskTitle.trim();
    return [
      `Провести целевое обучение работников, участвующих в процессах, связанных с риском «${base}»`,
      'Актуализировать внутренний регламент с учётом выявленного риска и закрепить зоны ответственности',
      'Внедрить периодический контроль (не реже одного раза в квартал) за операциями повышенного риска',
    ];
  }

  async generateRiskForProcess(
    ctx: GenerateRiskForProcessContext,
  ): Promise<RiskTemplateDraft> {
    const process = ctx.processDescription.trim().replace(/\s+/g, ' ');
    const shortProcess =
      process.length > 80 ? `${process.slice(0, 80)}…` : process;
    return {
      title: `Риск злоупотребления в процессе «${shortProcess}»`,
      description: `В рамках процесса «${process}» существует риск использования служебных полномочий вопреки законным интересам организации при отсутствии надлежащего контроля.`,
      causes:
        'Широкие дискреционные полномочия ответственного лица; отсутствие независимой проверки решений на данном этапе процесса.',
      corruptionScheme:
        'Ответственное лицо принимает решение в личных интересах или интересах связанной стороны, используя отсутствие контроля на данном этапе процесса.',
      corruptionFactors:
        'Дискреционные полномочия; отсутствие разделения обязанностей; недостаточная прозрачность процедуры.',
      consequences:
        'Финансовые потери организации, репутационные и регуляторные риски, необъективность принятых решений.',
      redFlags:
        'Систематическое отклонение от типового порядка выполнения процесса; концентрация решений на одном лице без независимой проверки.',
      typicalControls: [
        'Независимая проверка/согласование ключевых решений в рамках процесса',
        'Журналирование и периодический анализ решений, принятых в рамках процесса',
      ],
      recommendedActions: [
        'Формализовать процедуру и закрепить контрольные точки в регламенте',
        'Обучить участников процесса требованиям антикоррупционного законодательства',
      ],
      tags: ctx.directionHint ? [ctx.directionHint.toLowerCase()] : [],
      baseProbability: 3,
      baseImpact: 3,
    };
  }
}
