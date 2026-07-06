import { Injectable } from '@nestjs/common';
import { AiControlSuggestion, AiRiskSuggestion } from '../types/ai-results';
import {
  AiProvider,
  AnalysisFactsContext,
  ChatFactsContext,
  ControlSuggestionContext,
  ReportFactsContext,
  RiskRegisterFactsContext,
  RiskSuggestionContext,
} from './ai-provider.interface';

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
}
