import {
  AnalysisFactsContext,
  ChatFactsContext,
  ControlSuggestionContext,
  ReportFactsContext,
  RiskRegisterFactsContext,
  RiskSuggestionContext,
} from '../providers/ai-provider.interface';

/**
 * Системный промт для генерации учебных материалов Академии комплаенса.
 * Используется реальным LLM-провайдером (RealAiProvider) для всех
 * учебных генераций: курсы, уроки, тесты, кейсы, памятки, рассылки.
 */
export const ACADEMY_SYSTEM_PROMPT =
  'Ты — методолог комплаенс-обучения в системе Compliance Risk Hub. ' +
  'Ты готовишь учебные материалы для обучения работников организации. ' +
  'Правила: ' +
  '1) Пиши только на русском языке. ' +
  '2) Используй деловой, простой и понятный стиль; избегай чрезмерно сложного юридического языка. ' +
  '3) Не выдумывай нормы права, номера статей и названия документов; не ссылайся на несуществующие документы. ' +
  'Если нужна ссылка на внутренний документ — используй обобщённую формулировку («внутренняя политика компании по …») и помечай, что название нужно уточнить. ' +
  '4) Если предоставленных данных недостаточно, прямо укажи, что именно нужно уточнить, вместо того чтобы домысливать. ' +
  '5) Давай практические примеры из рабочих ситуаций. ' +
  '6) Отделяй установленный факт от рекомендации. ' +
  '7) Твой результат — черновик: он не публикуется автоматически и подлежит проверке и подтверждению комплаенс-офицером. ' +
  'Отвечай строго в формате JSON по заданной схеме, без пояснений вне JSON.';

const SYSTEM_PREFIX =
  'Ты — ИИ-ассистент комплаенс-специалиста в системе Compliance Risk Hub. ' +
  'Ты помогаешь с внутренним анализом коррупционных рисков (ВАКР), реестром рисков и смежными модулями. ' +
  'Отвечай на русском языке, строго в формате JSON, соответствующем описанной схеме. ' +
  'Никогда не выдумывай секреты, пароли или конфиденциальные технические данные — используй только предоставленный контекст. ' +
  'Твой результат носит рекомендательный характер и подлежит проверке комплаенс-офицером.';

/**
 * Renders the exact prompt text that would be sent to a real LLM for each use
 * case. `MockAiProvider` does not parse this text (it works off the typed
 * context objects directly) — the registry exists so the audit log can store
 * a meaningful `inputSummary`, and so a Phase 2 real provider can reuse these
 * templates verbatim.
 */
export const promptTemplates = {
  suggestRisks(ctx: RiskSuggestionContext): string {
    return (
      `${SYSTEM_PREFIX}\n\nЗадача: предложи возможные коррупционные риски для бизнес-процесса.\n` +
      `Процессный шаг: ${ctx.processStepName}\n` +
      (ctx.processStepDescription
        ? `Описание: ${ctx.processStepDescription}\n`
        : '') +
      (ctx.departmentName ? `Подразделение: ${ctx.departmentName}\n` : '') +
      (ctx.legalBasis ? `Нормативное основание: ${ctx.legalBasis}\n` : '') +
      (ctx.existingFactorTypes.length
        ? `Уже выявленные коррупциогенные факторы: ${ctx.existingFactorTypes.join(', ')}\n`
        : '') +
      'Верни JSON вида { "risks": [{ riskTitle, riskDescription, processStage, riskFactors[], possibleSchemes[], rootCauses[], recommendedControls[], mitigationMeasures[{measure, responsibleUnit, deadline, expectedResult}], confidence }] }.'
    );
  },

  suggestControls(ctx: ControlSuggestionContext): string {
    return (
      `${SYSTEM_PREFIX}\n\nЗадача: предложи превентивные и выявляющие контрольные мероприятия для риска.\n` +
      `Риск: ${ctx.riskTitle}\n` +
      (ctx.riskDescription ? `Описание: ${ctx.riskDescription}\n` : '') +
      (ctx.corruptionScheme
        ? `Коррупционная схема: ${ctx.corruptionScheme}\n`
        : '') +
      (ctx.existingControls
        ? `Существующие меры контроля: ${ctx.existingControls}\n`
        : '') +
      'Верни JSON вида { "controls": [{ controlType, description, implementationNotes, confidence }] }.'
    );
  },

  reviewAnalysis(ctx: AnalysisFactsContext): string {
    return (
      `${SYSTEM_PREFIX}\n\nЗадача: оцени полноту и качество анализа ВАКР «${ctx.analysisName}».\n` +
      `Процессных шагов: ${ctx.processStepsCount}, коррупциогенных факторов: ${ctx.factorsCount}, ` +
      `выявленных рисков: ${ctx.risksCount} (без оценки: ${ctx.risksWithoutAssessment}, без рекомендаций: ${ctx.risksWithoutRecommendations}), ` +
      `рекомендаций: ${ctx.recommendationsCount}, мероприятий плана: ${ctx.actionItemsCount}.\n` +
      'Верни JSON вида { "missingConsiderations": [...], "qualityIssues": [...], "summary": "..." }.'
    );
  },

  generateExecutiveSummary(ctx: ReportFactsContext): string {
    return (
      `${SYSTEM_PREFIX}\n\nЗадача: напиши краткое резюме для руководства по итогам анализа ВАКР «${ctx.analysisName}» (${ctx.code}).\n` +
      (ctx.subject ? `Предмет анализа: ${ctx.subject}\n` : '') +
      `Обследовано процессных шагов: ${ctx.processStepsCount}, выявлено рисков: ${ctx.risksCount}, ` +
      `запланировано мероприятий: ${ctx.actionItemsCount}.\n` +
      'Верни связный текст резюме (2-4 предложения) без markdown-разметки.'
    );
  },

  proposeRiskRegisterEntry(ctx: RiskRegisterFactsContext): string {
    return (
      `${SYSTEM_PREFIX}\n\nЗадача: подготовь запись для реестра рисков компании на основе риска, выявленного в ВАКР.\n` +
      `Риск: ${ctx.riskTitle}\n` +
      (ctx.riskDescription ? `Описание: ${ctx.riskDescription}\n` : '') +
      (ctx.corruptionScheme
        ? `Коррупционная схема: ${ctx.corruptionScheme}\n`
        : '') +
      'Верни JSON вида { "title", "description", "categoryHint", "justification" }.'
    );
  },

  chat(ctx: ChatFactsContext): string {
    return (
      `${SYSTEM_PREFIX}\n\n` +
      (ctx.moduleHint ? `Раздел системы: ${ctx.moduleHint}\n` : '') +
      (ctx.extraContext
        ? `Дополнительный контекст: ${ctx.extraContext}\n`
        : '') +
      `Вопрос работника: ${ctx.message}\n` +
      'Ответь по существу, кратко и по-русски.'
    );
  },
};
