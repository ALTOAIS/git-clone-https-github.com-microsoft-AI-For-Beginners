import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { buildPdfReport } from '../reports/pdf.util';
import { AnalyzeRiskDto } from './dto/analyze-risk.dto';
import { ChatDto } from './dto/chat.dto';
import { GenerateRiskRegisterEntryDto } from './dto/generate-risk-register-entry.dto';
import { GenerateVakrReportDto } from './dto/generate-vakr-report.dto';
import { ReviewVakrAnalysisDto } from './dto/review-vakr-analysis.dto';
import { SuggestControlsDto } from './dto/suggest-controls.dto';
import { AI_PROVIDER, AiProvider } from './providers/ai-provider.interface';
import {
  AI_ADVISORY_DISCLAIMER,
  AiChatResult,
  AiReportResult,
  AiReviewResult,
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
    await this.prisma.aiInteractionLog.create({
      data: {
        userId: params.user.id,
        role: params.user.role,
        module: params.module,
        useCase: params.useCase,
        provider: this.provider.name,
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
    const [processSteps, factors, risks, recommendations, actionItems] =
      await Promise.all([
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
      ]);

    const summary = await this.provider.generateExecutiveSummary({
      analysisName: analysis.name,
      code: analysis.code,
      subject: analysis.subject ?? undefined,
      processStepsCount: processSteps.length,
      risksCount: risks.length,
      actionItemsCount: actionItems.length,
    });

    const sections = [
      {
        heading: 'Общие сведения',
        content:
          `Анализ: ${analysis.name} (${analysis.code}).` +
          (analysis.subject ? ` Предмет: ${analysis.subject}.` : '') +
          (analysis.legalBasis
            ? ` Нормативное основание: ${analysis.legalBasis}.`
            : ''),
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
        heading: 'Коррупциогенные факторы',
        content: factors.length
          ? factors
              .map(
                (f) =>
                  `${f.factorType}${f.description ? `: ${f.description}` : ''}`,
              )
              .join('\n')
          : 'Коррупциогенные факторы не выявлены.',
      },
      {
        heading: 'Выявленные риски',
        content: risks.length
          ? risks
              .map(
                (r) =>
                  `${r.title}${r.score != null ? ` — балл риска: ${r.score}` : ''}`,
              )
              .join('\n')
          : 'Риски не выявлены.',
      },
      {
        heading: 'Рекомендации',
        content: recommendations.length
          ? recommendations
              .map((r) => `[${r.type}] ${r.description}`)
              .join('\n')
          : 'Рекомендации не сформированы.',
      },
      {
        heading: 'План мероприятий',
        content: actionItems.length
          ? actionItems
              .map(
                (a) =>
                  `${a.task}${a.responsible ? ` — ответственный: ${a.responsible.fullName}` : ''}${a.deadline ? `, срок: ${a.deadline.toISOString().slice(0, 10)}` : ''}`,
              )
              .join('\n')
          : 'Мероприятия плана действий не сформированы.',
      },
      { heading: 'Заключение', content: summary },
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
}
