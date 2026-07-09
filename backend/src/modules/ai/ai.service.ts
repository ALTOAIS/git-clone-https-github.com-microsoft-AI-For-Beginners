import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AcademyService } from '../academy/academy.service';
import { AnalysesService } from '../analyses/analyses.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuditService } from '../audit/audit.service';
import { IncidentsService } from '../incidents/incidents.service';
import { buildDocxReport } from '../reports/docx.util';
import { MaterialTextService } from './material-text.service';
import { buildPdfReport } from '../reports/pdf.util';
import { ACTIVE_STATUSES } from '../risks/risks.constants';
import {
  ANALYSIS_SCOPE_LABELS,
  CORRUPTOGENIC_FACTOR_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  SOURCE_CHECKLIST_CATALOG,
} from '../analyses/analyses.constants';
import { RiskTemplatesService } from '../risk-templates/risk-templates.service';
import { AnalyzeRiskDto } from './dto/analyze-risk.dto';
import { ChatDto } from './dto/chat.dto';
import { GenerateCampaignMessageDto } from './dto/generate-campaign-message.dto';
import { GenerateCaseStudyDto } from './dto/generate-case-study.dto';
import { GenerateCourseOutlineDto } from './dto/generate-course-outline.dto';
import { GenerateMemoDto } from './dto/generate-memo.dto';
import { GenerateLessonContentDto } from './dto/generate-lesson-content.dto';
import { GenerateQuizQuestionsDto } from './dto/generate-quiz-questions.dto';
import { GenerateRiskRegisterEntryDto } from './dto/generate-risk-register-entry.dto';
import { GenerateRiskTemplateForProcessDto } from './dto/generate-risk-template-for-process.dto';
import { GenerateVakrReportDto } from './dto/generate-vakr-report.dto';
import { ImproveRiskTemplateDescriptionDto } from './dto/improve-risk-template-description.dto';
import { ReviewVakrAnalysisDto } from './dto/review-vakr-analysis.dto';
import { SuggestControlsDto } from './dto/suggest-controls.dto';
import { SuggestRiskTemplateActionsDto } from './dto/suggest-risk-template-actions.dto';
import { SuggestRiskTemplateControlsDto } from './dto/suggest-risk-template-controls.dto';
import { AI_PROVIDER, AiProvider } from './providers/ai-provider.interface';
import {
  AI_ADVISORY_DISCLAIMER,
  AiChatResult,
  AiReportResult,
  AiReviewResult,
  AiRiskIntelligenceDashboard,
  AiRiskRegisterEntryProposal,
} from './types/ai-results';

interface RequestUser {
  id: string;
  role: string;
}

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private analyses: AnalysesService,
    private academy: AcademyService,
    private analytics: AnalyticsService,
    private incidents: IncidentsService,
    private riskTemplates: RiskTemplatesService,
    private materialText: MaterialTextService,
    @Inject(AI_PROVIDER) private provider: AiProvider,
  ) {}

  private async findAnalysis(analysisId: string) {
    const analysis = await this.prisma.corruptionAnalysis.findUnique({
      where: { id: analysisId },
    });
    if (!analysis) throw new NotFoundException('Анализ ВАКР не найден');
    return analysis;
  }

  private async logInteraction(params: {
    user: RequestUser;
    module: string;
    useCase: string;
    entityType?: string;
    entityId?: string;
    inputSummary: string;
    outputSummary: string;
  }) {
    const callInfo = this.provider.describeLastCall?.();
    await this.prisma.aiInteractionLog.create({
      data: {
        userId: params.user.id,
        role: params.user.role,
        module: params.module,
        useCase: params.useCase,
        provider: callInfo?.provider ?? this.provider.name,
        model: callInfo?.model,
        status: callInfo?.status ?? 'SUCCESS',
        errorMessage: callInfo?.errorMessage,
        entityType: params.entityType,
        entityId: params.entityId,
        inputSummary: params.inputSummary,
        outputSummary: params.outputSummary,
      },
    });
    await this.audit.record({
      entityType: 'AI_ASSISTANT',
      entityId: params.entityId ?? params.module,
      action: params.useCase,
      userId: params.user.id,
      changes: { module: params.module, useCase: params.useCase },
    });
  }

  async analyzeRisk(dto: AnalyzeRiskDto, user: RequestUser) {
    await this.findAnalysis(dto.analysisId);
    const step = await this.prisma.analysisProcessStep.findFirst({
      where: { id: dto.processStepId, analysisId: dto.analysisId },
      include: { department: { select: { name: true } }, factors: true },
    });
    if (!step)
      throw new NotFoundException('Процессный шаг не найден в этом анализе');

    const risks = await this.provider.suggestRisks({
      processStepName: step.name,
      processStepDescription: step.description ?? undefined,
      departmentName: step.department?.name,
      legalBasis: step.legalBasis ?? undefined,
      existingFactorTypes: step.factors.map((f) => f.factorType),
    });

    await this.logInteraction({
      user,
      module: 'VAKR',
      useCase: 'ANALYZE_RISK',
      entityType: 'ANALYSIS',
      entityId: dto.analysisId,
      inputSummary: `Процессный шаг: ${step.name}`,
      outputSummary: `Предложено рисков: ${risks.length}`,
    });

    return { risks, disclaimer: AI_ADVISORY_DISCLAIMER };
  }

  async suggestControls(dto: SuggestControlsDto, user: RequestUser) {
    await this.findAnalysis(dto.analysisId);
    const risk = await this.prisma.analysisRisk.findFirst({
      where: { id: dto.riskId, analysisId: dto.analysisId },
    });
    if (!risk) throw new NotFoundException('Риск не найден в этом анализе');

    const controls = await this.provider.suggestControls({
      riskTitle: risk.title,
      riskDescription: risk.description ?? undefined,
      corruptionScheme: risk.corruptionScheme ?? undefined,
      existingControls: risk.existingControls ?? undefined,
    });

    await this.logInteraction({
      user,
      module: 'VAKR',
      useCase: 'SUGGEST_CONTROLS',
      entityType: 'ANALYSIS_RISK',
      entityId: risk.id,
      inputSummary: `Риск: ${risk.title}`,
      outputSummary: `Предложено контролей: ${controls.length}`,
    });

    return { controls, disclaimer: AI_ADVISORY_DISCLAIMER };
  }

  async improveRiskTemplateDescription(
    dto: ImproveRiskTemplateDescriptionDto,
    user: RequestUser,
  ) {
    const template = await this.riskTemplates.findOne(dto.templateId);
    const result = await this.provider.improveRiskDescription({
      title: template.title,
      description: template.description,
    });

    await this.logInteraction({
      user,
      module: 'RISK_TEMPLATE',
      useCase: 'IMPROVE_DESCRIPTION',
      entityType: 'RISK_TEMPLATE',
      entityId: template.id,
      inputSummary: `Шаблон: ${template.title}`,
      outputSummary: 'Сформирован улучшенный вариант описания',
    });

    return { ...result, disclaimer: AI_ADVISORY_DISCLAIMER };
  }

  async suggestRiskTemplateControls(
    dto: SuggestRiskTemplateControlsDto,
    user: RequestUser,
  ) {
    const template = await this.riskTemplates.findOne(dto.templateId);
    const controls = await this.provider.suggestControls({
      riskTitle: template.title,
      riskDescription: template.description,
      corruptionScheme: template.corruptionScheme ?? undefined,
      existingControls: template.typicalControls.join('; '),
    });

    await this.logInteraction({
      user,
      module: 'RISK_TEMPLATE',
      useCase: 'SUGGEST_CONTROLS',
      entityType: 'RISK_TEMPLATE',
      entityId: template.id,
      inputSummary: `Шаблон: ${template.title}`,
      outputSummary: `Предложено контролей: ${controls.length}`,
    });

    return { controls, disclaimer: AI_ADVISORY_DISCLAIMER };
  }

  async suggestRiskTemplateActions(
    dto: SuggestRiskTemplateActionsDto,
    user: RequestUser,
  ) {
    const template = await this.riskTemplates.findOne(dto.templateId);
    const actions = await this.provider.suggestRiskActions({
      riskTitle: template.title,
      riskDescription: template.description,
      corruptionScheme: template.corruptionScheme ?? undefined,
      existingActions: template.recommendedActions.join('; '),
    });

    await this.logInteraction({
      user,
      module: 'RISK_TEMPLATE',
      useCase: 'SUGGEST_ACTIONS',
      entityType: 'RISK_TEMPLATE',
      entityId: template.id,
      inputSummary: `Шаблон: ${template.title}`,
      outputSummary: `Предложено мероприятий: ${actions.length}`,
    });

    return { actions, disclaimer: AI_ADVISORY_DISCLAIMER };
  }

  async generateRiskTemplateForProcess(
    dto: GenerateRiskTemplateForProcessDto,
    user: RequestUser,
  ) {
    const draft = await this.provider.generateRiskForProcess({
      processDescription: dto.processDescription,
      directionHint: dto.direction,
    });

    await this.logInteraction({
      user,
      module: 'RISK_TEMPLATE',
      useCase: 'GENERATE_FOR_PROCESS',
      inputSummary: `Процесс: ${dto.processDescription.slice(0, 120)}`,
      outputSummary: `Сформирован черновик риска: ${draft.title}`,
    });

    return { ...draft, disclaimer: AI_ADVISORY_DISCLAIMER };
  }

  async reviewVakrAnalysis(
    dto: ReviewVakrAnalysisDto,
    user: RequestUser,
  ): Promise<AiReviewResult & { disclaimer: string }> {
    const analysis = await this.findAnalysis(dto.analysisId);
    const [
      processStepsCount,
      factorsCount,
      risks,
      recommendationsCount,
      actionItemsCount,
    ] = await Promise.all([
      this.prisma.analysisProcessStep.count({
        where: { analysisId: dto.analysisId },
      }),
      this.prisma.analysisFactor.count({
        where: { analysisId: dto.analysisId },
      }),
      this.prisma.analysisRisk.findMany({
        where: { analysisId: dto.analysisId },
        include: { _count: { select: { recommendations: true } } },
      }),
      this.prisma.analysisRecommendation.count({
        where: { analysisId: dto.analysisId },
      }),
      this.prisma.analysisActionItem.count({
        where: { analysisId: dto.analysisId },
      }),
    ]);

    const risksWithoutAssessment = risks.filter(
      (r) => r.likelihood == null || r.impact == null,
    ).length;
    const risksWithoutRecommendations = risks.filter(
      (r) => r._count.recommendations === 0,
    ).length;

    const facts = {
      analysisName: analysis.name,
      processStepsCount,
      factorsCount,
      risksCount: risks.length,
      risksWithoutAssessment,
      risksWithoutRecommendations,
      recommendationsCount,
      actionItemsCount,
    };

    const completenessScore =
      Number(processStepsCount > 0) * 20 +
      Number(factorsCount > 0) * 20 +
      Number(risks.length > 0) * 20 +
      Number(risksWithoutAssessment === 0 && risks.length > 0) * 20 +
      Number(actionItemsCount > 0) * 20;

    const { missingConsiderations, qualityIssues, summary } =
      await this.provider.reviewAnalysis(facts);

    await this.logInteraction({
      user,
      module: 'VAKR',
      useCase: 'REVIEW_VAKR_ANALYSIS',
      entityType: 'ANALYSIS',
      entityId: dto.analysisId,
      inputSummary: `Анализ: ${analysis.name} (шагов: ${processStepsCount}, рисков: ${risks.length})`,
      outputSummary: `Полнота: ${completenessScore}%, замечаний: ${qualityIssues.length}`,
    });

    return {
      completenessScore,
      coveredStages: [
        processStepsCount > 0 ? 'Карта бизнес-процессов' : null,
        factorsCount > 0 ? 'Коррупциогенные факторы' : null,
        risks.length > 0 ? 'Выявление рисков' : null,
        recommendationsCount > 0 ? 'Рекомендации' : null,
        actionItemsCount > 0 ? 'План мероприятий' : null,
      ].filter((v): v is string => !!v),
      missingConsiderations,
      qualityIssues,
      summary,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  async generateVakrReport(
    dto: GenerateVakrReportDto,
    user: RequestUser,
  ): Promise<AiReportResult & { disclaimer: string }> {
    const analysis = await this.findAnalysis(dto.analysisId);
    const [
      processSteps,
      factors,
      risks,
      recommendations,
      actionItems,
      workingGroup,
      exposedPositions,
      checklistAnswers,
      decisionMaker,
      coordinator,
    ] = await Promise.all([
      this.prisma.analysisProcessStep.findMany({
        where: { analysisId: dto.analysisId },
        include: { department: { select: { name: true } } },
        orderBy: { order: 'asc' },
      }),
      this.prisma.analysisFactor.findMany({
        where: { analysisId: dto.analysisId },
      }),
      this.prisma.analysisRisk.findMany({
        where: { analysisId: dto.analysisId },
      }),
      this.prisma.analysisRecommendation.findMany({
        where: { analysisId: dto.analysisId },
      }),
      this.prisma.analysisActionItem.findMany({
        where: { analysisId: dto.analysisId },
        include: { responsible: { select: { fullName: true } } },
      }),
      this.prisma.analysisWorkingGroupMember.findMany({
        where: { analysisId: dto.analysisId },
        include: { user: { select: { fullName: true } } },
      }),
      this.prisma.analysisExposedPosition.findMany({
        where: { analysisId: dto.analysisId },
        include: { department: { select: { name: true } } },
      }),
      this.prisma.analysisChecklistAnswer.findMany({
        where: {
          analysisId: dto.analysisId,
          questionKey: { in: SOURCE_CHECKLIST_CATALOG.map((s) => s.key) },
        },
      }),
      analysis.decisionMakerId
        ? this.prisma.user.findUnique({
            where: { id: analysis.decisionMakerId },
            select: { fullName: true },
          })
        : null,
      analysis.coordinatorId
        ? this.prisma.user.findUnique({
            where: { id: analysis.coordinatorId },
            select: { fullName: true },
          })
        : null,
    ]);

    const summary = await this.provider.generateExecutiveSummary({
      analysisName: analysis.name,
      code: analysis.code,
      subject: analysis.subject ?? undefined,
      processStepsCount: processSteps.length,
      risksCount: risks.length,
      actionItemsCount: actionItems.length,
    });

    const checklistByKey = new Map(
      checklistAnswers.map((a) => [a.questionKey, a]),
    );
    const sourceStatusLabels: Record<string, string> = {
      REQUESTED: 'запрошено',
      RECEIVED: 'получено',
      NOT_APPLICABLE: 'не применимо',
    };

    const sections = [
      {
        heading: '1. Основание проведения',
        content:
          (analysis.orderBasis
            ? `${analysis.orderBasis}.`
            : analysis.legalBasis
              ? `${analysis.legalBasis}.`
              : 'Основание не указано.') +
          (analysis.orderNumber || analysis.orderDate
            ? ` Решение/приказ №${analysis.orderNumber ?? '—'} от ${analysis.orderDate ? analysis.orderDate.toISOString().slice(0, 10) : '—'}.`
            : '') +
          (decisionMaker ? ` Принято: ${decisionMaker.fullName}.` : ''),
      },
      {
        heading: '2. Объект анализа',
        content: analysis.subject || 'Объект анализа не указан.',
      },
      {
        heading: '3. Период анализа',
        content:
          analysis.periodStart || analysis.periodEnd
            ? `${analysis.periodStart ? analysis.periodStart.toISOString().slice(0, 10) : '—'} — ${analysis.periodEnd ? analysis.periodEnd.toISOString().slice(0, 10) : '—'}`
            : 'Период анализа не указан.',
      },
      {
        heading: '4. Состав рабочей группы / уполномоченное лицо',
        content: workingGroup.length
          ? workingGroup
              .map((m) => `${m.user.fullName}${m.role ? ` — ${m.role}` : ''}`)
              .join('\n')
          : coordinator
            ? `Уполномоченное лицо (координатор): ${coordinator.fullName}.`
            : 'Состав рабочей группы не определён.',
      },
      {
        heading: '5. Источники информации',
        content: SOURCE_CHECKLIST_CATALOG.map((source) => {
          const answer = checklistByKey.get(source.key);
          const status = answer?.status
            ? (sourceStatusLabels[answer.status] ?? answer.status)
            : 'не отмечено';
          return `${source.label}: ${status}`;
        }).join('\n'),
      },
      {
        heading: '6. Направления анализа',
        content: analysis.analysisScope
          ? ANALYSIS_SCOPE_LABELS[analysis.analysisScope]
          : 'Направления анализа не выбраны.',
      },
      {
        heading: 'Карта бизнес-процессов',
        content: processSteps.length
          ? processSteps
              .map(
                (s) =>
                  `${s.order}. ${s.name}${s.department ? ` (${s.department.name})` : ''}`,
              )
              .join('\n')
          : 'Процессные шаги не заполнены.',
      },
      {
        heading: '7. Выявленные коррупциогенные факторы',
        content: factors.length
          ? factors
              .map(
                (f) =>
                  `${CORRUPTOGENIC_FACTOR_LABELS[f.factorType] ?? f.factorType}${f.description ? `: ${f.description}` : ''}`,
              )
              .join('\n')
          : 'Коррупциогенные факторы не выявлены.',
      },
      {
        heading: '8. Выявленные коррупционные риски',
        content: risks.length
          ? risks
              .map(
                (r) =>
                  `${r.title}${r.score != null ? ` — балл риска: ${r.score}` : ''}${r.cause ? `. Причина: ${r.cause}` : ''}${r.consequences ? `. Последствия: ${r.consequences}` : ''}`,
              )
              .join('\n')
          : 'Риски не выявлены.',
      },
      {
        heading: '9. Должности, подверженные коррупционным рискам',
        content: exposedPositions.length
          ? exposedPositions
              .map(
                (p) =>
                  `${p.positionTitle}${p.department ? ` (${p.department.name})` : ''}${p.riskLevel ? ` — уровень риска: ${p.riskLevel}` : ''}`,
              )
              .join('\n')
          : 'Должности, подверженные коррупционным рискам, не определены.',
      },
      {
        heading: '10. Рекомендации',
        content: recommendations.length
          ? recommendations
              .map(
                (r) =>
                  `[${RECOMMENDATION_TYPE_LABELS[r.type] ?? r.type}] ${r.description}`,
              )
              .join('\n')
          : 'Рекомендации не сформированы.',
      },
      {
        heading: '11. План мероприятий',
        content: actionItems.length
          ? actionItems
              .map(
                (a) =>
                  `${a.task}${a.responsible ? ` — ответственный: ${a.responsible.fullName}` : ''}${a.deadline ? `, срок: ${a.deadline.toISOString().slice(0, 10)}` : ''}`,
              )
              .join('\n')
          : 'Мероприятия плана действий не сформированы.',
      },
      { heading: '12. Вывод', content: summary },
    ];

    await this.logInteraction({
      user,
      module: 'VAKR',
      useCase: 'GENERATE_VAKR_REPORT',
      entityType: 'ANALYSIS',
      entityId: dto.analysisId,
      inputSummary: `Анализ: ${analysis.name}`,
      outputSummary: `Сформирован отчёт из ${sections.length} разделов`,
    });

    return {
      title: `Отчёт по анализу ВАКР «${analysis.name}»`,
      generatedAt: new Date().toISOString(),
      sections,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  async generateVakrReportPdf(
    dto: GenerateVakrReportDto,
    user: RequestUser,
  ): Promise<Buffer> {
    const report = await this.generateVakrReport(dto, user);
    const generatedAt = new Date(report.generatedAt).toLocaleDateString(
      'ru-RU',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
    const sections = [
      ...report.sections.map((section) => ({
        heading: section.heading,
        lines: section.content.split('\n'),
      })),
      { heading: 'Примечание', lines: [report.disclaimer] },
    ];
    return buildPdfReport(
      report.title,
      `Сформировано ИИ-ассистентом: ${generatedAt}`,
      sections,
    );
  }

  async generateVakrReportDocx(
    dto: GenerateVakrReportDto,
    user: RequestUser,
  ): Promise<Buffer> {
    const report = await this.generateVakrReport(dto, user);
    const generatedAt = new Date(report.generatedAt).toLocaleDateString(
      'ru-RU',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );
    const sections = [
      ...report.sections.map((section) => ({
        heading: section.heading,
        lines: section.content.split('\n'),
      })),
      { heading: 'Примечание', lines: [report.disclaimer] },
    ];
    return buildDocxReport(
      report.title,
      `Сформировано ИИ-ассистентом: ${generatedAt}`,
      sections,
    );
  }

  async generateRiskRegisterEntry(
    dto: GenerateRiskRegisterEntryDto,
    user: RequestUser,
  ): Promise<AiRiskRegisterEntryProposal & { disclaimer: string }> {
    await this.findAnalysis(dto.analysisId);
    const risk = await this.prisma.analysisRisk.findFirst({
      where: { id: dto.analysisRiskId, analysisId: dto.analysisId },
    });
    if (!risk) throw new NotFoundException('Риск не найден в этом анализе');

    const proposal = await this.provider.proposeRiskRegisterEntry({
      riskTitle: risk.title,
      riskDescription: risk.description ?? undefined,
      corruptionScheme: risk.corruptionScheme ?? undefined,
    });

    await this.logInteraction({
      user,
      module: 'RISK_REGISTER',
      useCase: 'GENERATE_RISK_REGISTER_ENTRY',
      entityType: 'ANALYSIS_RISK',
      entityId: risk.id,
      inputSummary: `Риск: ${risk.title}`,
      outputSummary: `Предложена запись реестра: ${proposal.title}`,
    });

    return {
      ...proposal,
      likelihood: risk.likelihood ?? undefined,
      impact: risk.impact ?? undefined,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  async chat(
    dto: ChatDto,
    user: RequestUser,
  ): Promise<AiChatResult & { disclaimer: string }> {
    let extraContext: string | undefined;
    if (dto.contextEntityType === 'ANALYSIS' && dto.contextEntityId) {
      const analysis = await this.prisma.corruptionAnalysis.findUnique({
        where: { id: dto.contextEntityId },
      });
      if (analysis)
        extraContext = `Анализ «${analysis.name}», стадия: ${analysis.stage}, статус: ${analysis.status}.`;
    }

    const reply = await this.provider.chat({
      message: dto.message,
      moduleHint: dto.module,
      extraContext,
    });

    await this.logInteraction({
      user,
      module: dto.module ?? 'GENERAL',
      useCase: 'CHAT',
      entityType: dto.contextEntityType,
      entityId: dto.contextEntityId,
      inputSummary: dto.message.slice(0, 200),
      outputSummary: reply.slice(0, 200),
    });

    return { reply, disclaimer: AI_ADVISORY_DISCLAIMER };
  }

  async getRiskIntelligenceDashboard(
    user: RequestUser,
  ): Promise<AiRiskIntelligenceDashboard & { disclaimer: string }> {
    const [
      vakrSummary,
      academySummary,
      controlEffectiveness,
      incidentsSummary,
      activeRisks,
      criticalRisks,
    ] = await Promise.all([
      this.analyses.summary(),
      this.academy.summary(),
      this.analytics.controlEffectiveness(),
      this.incidents.summary(),
      this.prisma.risk.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      this.prisma.risk.count({
        where: { status: { in: ACTIVE_STATUSES }, inherentScore: { gte: 15 } },
      }),
    ]);

    const insights = await this.provider.generateCrossModuleInsights({
      vakrOverdue: vakrSummary.overdue,
      vakrTotal: vakrSummary.total,
      criticalRisks,
      activeRisks,
      ineffectiveControls: controlEffectiveness.INEFFECTIVE ?? 0,
      incidentsOpen: incidentsSummary.open,
      incidentsUnderReview: incidentsSummary.underReview,
      academyCompletionPercent: academySummary.completionPercent,
      academyOverdueAssignments: academySummary.overdue,
    });

    await this.logInteraction({
      user,
      module: 'CROSS_MODULE',
      useCase: 'RISK_INTELLIGENCE_DASHBOARD',
      inputSummary: `Активных рисков: ${activeRisks}, критических: ${criticalRisks}, анализов ВАКР: ${vakrSummary.total}`,
      outputSummary: `Сформировано инсайтов: ${insights.length}`,
    });

    return {
      vakr: vakrSummary,
      riskRegister: { active: activeRisks, critical: criticalRisks },
      controlEffectiveness,
      incidents: incidentsSummary,
      academy: {
        completionPercent: academySummary.completionPercent,
        overdueAssignments: academySummary.overdue,
      },
      insights,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  /**
   * Общий помощник Академии: проверяет курс (если указан) и извлекает текст
   * материала-источника (если указан). Возвращает контекст для промпта и лога.
   */
  private async resolveAcademyContext(params: {
    courseId?: string;
    materialAttachmentId?: string;
  }): Promise<{
    courseId?: string;
    courseTitle?: string;
    sourceText?: string;
    sourceFileName?: string;
    sourceLimitation?: string;
  }> {
    let courseId: string | undefined;
    let courseTitle: string | undefined;
    if (params.courseId) {
      const course = await this.academy.findOne(params.courseId);
      courseId = course.id;
      courseTitle = course.title;
    }
    if (!params.materialAttachmentId) {
      return { courseId, courseTitle };
    }
    const material = await this.materialText.extractFromAttachment(
      params.materialAttachmentId,
    );
    return {
      courseId,
      courseTitle,
      sourceText: material.text,
      sourceFileName: material.fileName,
      sourceLimitation: material.limitation,
    };
  }

  async generateCourseOutline(
    dto: GenerateCourseOutlineDto,
    user: RequestUser,
  ) {
    const context = await this.resolveAcademyContext(dto);
    const moduleCount = dto.moduleCount ?? 3;

    const draft = await this.provider.generateCourseOutline({
      topic: dto.topic,
      audienceHint: dto.audienceHint,
      moduleCount,
      level: dto.level,
      durationHours: dto.durationHours,
      goals: dto.goals,
      sourceText: context.sourceText,
    });

    await this.logInteraction({
      user,
      module: 'ACADEMY',
      useCase: 'GENERATE_COURSE_OUTLINE',
      entityType: context.courseId ? 'COURSE' : 'ACADEMY',
      entityId: context.courseId,
      inputSummary:
        `Тема: ${dto.topic}` +
        (dto.level ? `, уровень: ${dto.level}` : '') +
        (context.sourceFileName ? `, материал: ${context.sourceFileName}` : ''),
      outputSummary: `Сгенерировано модулей: ${draft.modules.length}`,
    });

    return {
      ...draft,
      sourceLimitation: context.sourceLimitation,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  async generateLessonContent(
    dto: GenerateLessonContentDto,
    user: RequestUser,
  ) {
    const context = await this.resolveAcademyContext(dto);

    const result = await this.provider.generateLessonContent({
      courseTopic: dto.courseTopic,
      lessonTitle: dto.lessonTitle,
      contentType: dto.contentType,
      audienceHint: dto.audienceHint,
      durationMinutes: dto.durationMinutes,
      sourceText: context.sourceText,
    });

    await this.logInteraction({
      user,
      module: 'ACADEMY',
      useCase: 'GENERATE_LESSON_CONTENT',
      entityType: context.courseId ? 'COURSE' : 'ACADEMY',
      entityId: context.courseId,
      inputSummary:
        `Урок: ${dto.lessonTitle}` +
        (context.sourceFileName ? `, материал: ${context.sourceFileName}` : ''),
      outputSummary: `Сгенерирован текст (${result.content.length} симв.)`,
    });

    return {
      ...result,
      sourceLimitation: context.sourceLimitation,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  async generateQuizQuestions(
    dto: GenerateQuizQuestionsDto,
    user: RequestUser,
  ) {
    const context = await this.resolveAcademyContext(dto);
    const questionCount = dto.questionCount ?? 3;

    const quiz = await this.provider.generateQuiz({
      topic: dto.topic,
      questionCount,
      difficulty: dto.difficulty,
      questionTypes: dto.questionTypes,
      sourceText: context.sourceText,
    });

    await this.logInteraction({
      user,
      module: 'ACADEMY',
      useCase: 'GENERATE_QUIZ_QUESTIONS',
      entityType: context.courseId ? 'COURSE' : 'ACADEMY',
      entityId: context.courseId,
      inputSummary:
        `Тема: ${dto.topic}, вопросов: ${questionCount}` +
        (dto.difficulty ? `, сложность: ${dto.difficulty}` : '') +
        (context.sourceFileName ? `, материал: ${context.sourceFileName}` : ''),
      outputSummary: `Сгенерировано вопросов: ${quiz.questions.length}`,
    });

    return {
      questions: quiz.questions,
      suggestedPassingScore: quiz.suggestedPassingScore,
      sourceLimitation: context.sourceLimitation,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  async generateCaseStudy(dto: GenerateCaseStudyDto, user: RequestUser) {
    const context = await this.resolveAcademyContext(dto);

    const draft = await this.provider.generateCaseStudy({
      topic: dto.topic,
      audienceHint: dto.audienceHint,
      sourceText: context.sourceText,
    });

    await this.logInteraction({
      user,
      module: 'ACADEMY',
      useCase: 'GENERATE_CASE_STUDY',
      entityType: context.courseId ? 'COURSE' : 'ACADEMY',
      entityId: context.courseId,
      inputSummary:
        `Тема кейса: ${dto.topic}` +
        (context.sourceFileName ? `, материал: ${context.sourceFileName}` : ''),
      outputSummary: `Кейс «${draft.title}», вариантов действий: ${draft.options.length}`,
    });

    return {
      ...draft,
      sourceLimitation: context.sourceLimitation,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  async generateMemo(dto: GenerateMemoDto, user: RequestUser) {
    const context = await this.resolveAcademyContext(dto);

    const draft = await this.provider.generateMemo({
      topic: dto.topic,
      audienceHint: dto.audienceHint,
      sourceText: context.sourceText,
    });

    await this.logInteraction({
      user,
      module: 'ACADEMY',
      useCase: 'GENERATE_MEMO',
      entityType: context.courseId ? 'COURSE' : 'ACADEMY',
      entityId: context.courseId,
      inputSummary:
        `Тема памятки: ${dto.topic}` +
        (context.sourceFileName ? `, материал: ${context.sourceFileName}` : ''),
      outputSummary: `Памятка «${draft.title}», пунктов чек-листа: ${draft.checklist.length}`,
    });

    return {
      ...draft,
      sourceLimitation: context.sourceLimitation,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }

  async generateCampaignMessage(
    dto: GenerateCampaignMessageDto,
    user: RequestUser,
  ) {
    const context = await this.resolveAcademyContext({
      materialAttachmentId: dto.materialAttachmentId,
    });

    const draft = await this.provider.generateCampaignMessage({
      topic: dto.topic,
      courseTitle: dto.courseTitle,
      sourceText: context.sourceText,
    });

    await this.logInteraction({
      user,
      module: 'ACADEMY',
      useCase: 'GENERATE_CAMPAIGN_MESSAGE',
      entityType: dto.campaignId ? 'CAMPAIGN' : 'ACADEMY',
      entityId: dto.campaignId,
      inputSummary:
        `Тема рассылки: ${dto.topic}` +
        (dto.courseTitle ? `, курс: ${dto.courseTitle}` : ''),
      outputSummary: `Рассылка «${draft.subject}»`,
    });

    return {
      ...draft,
      sourceLimitation: context.sourceLimitation,
      disclaimer: AI_ADVISORY_DISCLAIMER,
    };
  }
}
