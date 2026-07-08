import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalysisStage, AnalysisStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionsService } from '../actions/actions.service';
import { AuditService } from '../audit/audit.service';
import { RisksService } from '../risks/risks.service';
import {
  ANALYSIS_STAGE_ORDER,
  CORRUPTOGENIC_FACTOR_LABELS,
  isForwardStageTransition,
  SOURCE_CHECKLIST_CATALOG,
} from './analyses.constants';
import { AssessAnalysisRiskDto } from './dto/assess-analysis-risk.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { CreateAnalysisRiskDto } from './dto/create-analysis-risk.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateExposedPositionDto } from './dto/create-exposed-position.dto';
import { CreateFactorDto } from './dto/create-factor.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { CreateProcessStepDto } from './dto/create-process-step.dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { CreateWorkingGroupMemberDto } from './dto/create-working-group-member.dto';
import { UpdateActionItemDto } from './dto/update-action-item.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { UpdateAnalysisRiskDto } from './dto/update-analysis-risk.dto';
import { UpdateExposedPositionDto } from './dto/update-exposed-position.dto';
import { UpdateFactorDto } from './dto/update-factor.dto';
import { UpdateProcessStepDto } from './dto/update-process-step.dto';
import { UpdateReassessmentDto } from './dto/update-reassessment.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import { UpdateWorkingGroupMemberDto } from './dto/update-working-group-member.dto';
import { UpsertChecklistAnswerDto } from './dto/upsert-checklist-answer.dto';

const DETAIL_INCLUDE = {
  company: true,
  lead: { select: { id: true, fullName: true, email: true, role: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  decisionMaker: { select: { id: true, fullName: true, email: true } },
  coordinator: { select: { id: true, fullName: true, email: true } },
  departments: { include: { department: true } },
  workingGroup: {
    include: {
      user: { select: { id: true, fullName: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  planItems: {
    include: {
      department: true,
      owner: { select: { id: true, fullName: true } },
    },
    orderBy: { deadline: 'asc' as const },
  },
  documents: {
    include: { uploadedBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  processSteps: {
    include: {
      department: { select: { id: true, name: true } },
      executor: { select: { id: true, fullName: true } },
    },
    orderBy: { order: 'asc' as const },
  },
  factors: {
    include: {
      processStep: { select: { id: true, name: true, departmentId: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  risks: {
    include: {
      factor: { select: { id: true, factorType: true } },
      category: { select: { id: true, name: true } },
      owner: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  recommendations: {
    include: {
      risk: { select: { id: true, title: true } },
      responsible: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  actionItems: {
    include: {
      recommendation: { select: { id: true, type: true } },
      responsible: { select: { id: true, fullName: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  comments: {
    include: { author: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CorruptionAnalysisInclude;

const LIST_INCLUDE = {
  company: { select: { id: true, name: true } },
  lead: { select: { id: true, fullName: true } },
  _count: { select: { workingGroup: true, documents: true, planItems: true } },
} satisfies Prisma.CorruptionAnalysisInclude;

@Injectable()
export class AnalysesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private risksService: RisksService,
    private actionsService: ActionsService,
  ) {}

  async findAll(query: {
    page: number;
    pageSize: number;
    status?: AnalysisStatus;
    companyId?: string;
    search?: string;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CorruptionAnalysisWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.corruptionAnalysis.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.corruptionAnalysis.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const analysis = await this.prisma.corruptionAnalysis.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!analysis) throw new NotFoundException('Анализ не найден');
    return analysis;
  }

  async create(dto: CreateAnalysisDto, userId?: string) {
    const code = await this.generateCode();
    const analysis = await this.prisma.corruptionAnalysis.create({
      data: {
        code,
        name: dto.name,
        companyId: dto.companyId,
        subject: dto.subject,
        legalBasis: dto.legalBasis,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        leadId: dto.leadId,
        createdById: userId,
        departments: dto.departmentIds
          ? {
              create: dto.departmentIds.map((departmentId) => ({
                departmentId,
              })),
            }
          : undefined,
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.record({
      entityType: 'ANALYSIS',
      entityId: analysis.id,
      action: 'CREATE',
      userId,
    });
    return analysis;
  }

  async update(id: string, dto: UpdateAnalysisDto, userId?: string) {
    await this.findOne(id);

    if (dto.departmentIds) {
      await this.prisma.analysisDepartment.deleteMany({
        where: { analysisId: id },
      });
    }

    const analysis = await this.prisma.corruptionAnalysis.update({
      where: { id },
      data: {
        name: dto.name,
        companyId: dto.companyId,
        subject: dto.subject,
        legalBasis: dto.legalBasis,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        leadId: dto.leadId,
        status: dto.status,
        orderBasis: dto.orderBasis,
        orderNumber: dto.orderNumber,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        decisionMakerId: dto.decisionMakerId,
        analysisScope: dto.analysisScope,
        coordinatorId: dto.coordinatorId,
        extensionRequested: dto.extensionRequested,
        departments: dto.departmentIds
          ? {
              create: dto.departmentIds.map((departmentId) => ({
                departmentId,
              })),
            }
          : undefined,
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.record({
      entityType: 'ANALYSIS',
      entityId: id,
      action: 'UPDATE',
      userId,
    });
    return analysis;
  }

  async changeStage(id: string, dto: ChangeStageDto, userId?: string) {
    const existing = await this.findOne(id);
    if (!isForwardStageTransition(existing.stage, dto.stage)) {
      throw new BadRequestException(
        'Нельзя пропускать этапы анализа — переход возможен только на следующий этап или назад к уже пройденному.',
      );
    }

    const isLeavingDraft =
      existing.status === AnalysisStatus.DRAFT &&
      dto.stage !== AnalysisStage.CREATION;
    const analysis = await this.prisma.corruptionAnalysis.update({
      where: { id },
      data: {
        stage: dto.stage,
        status: isLeavingDraft ? AnalysisStatus.IN_PROGRESS : undefined,
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.record({
      entityType: 'ANALYSIS',
      entityId: id,
      action: 'STAGE_CHANGE',
      userId,
      changes: { from: existing.stage, to: dto.stage },
    });
    return analysis;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.corruptionAnalysis.delete({ where: { id } });
  }

  // ------------------------------------------------------------------
  // Stage 2: Planning
  // ------------------------------------------------------------------

  async addPlanItem(analysisId: string, dto: CreatePlanItemDto) {
    await this.findOne(analysisId);
    return this.prisma.analysisPlanItem.create({
      data: {
        analysisId,
        process: dto.process,
        direction: dto.direction,
        departmentId: dto.departmentId,
        ownerId: dto.ownerId,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        checkpoint: dto.checkpoint,
      },
    });
  }

  async updatePlanItem(
    analysisId: string,
    itemId: string,
    dto: CreatePlanItemDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisPlanItem.update({
      where: { id: itemId },
      data: {
        process: dto.process,
        direction: dto.direction,
        departmentId: dto.departmentId,
        ownerId: dto.ownerId,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        checkpoint: dto.checkpoint,
      },
    });
  }

  async removePlanItem(analysisId: string, itemId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisPlanItem.delete({ where: { id: itemId } });
  }

  // ------------------------------------------------------------------
  // Stage 3: Working group
  // ------------------------------------------------------------------

  async addWorkingGroupMember(
    analysisId: string,
    dto: CreateWorkingGroupMemberDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisWorkingGroupMember.create({
      data: { analysisId, ...dto },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });
  }

  async updateWorkingGroupMember(
    analysisId: string,
    memberId: string,
    dto: UpdateWorkingGroupMemberDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisWorkingGroupMember.update({
      where: { id: memberId },
      data: dto,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });
  }

  async removeWorkingGroupMember(analysisId: string, memberId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisWorkingGroupMember.delete({
      where: { id: memberId },
    });
  }

  // ------------------------------------------------------------------
  // Stage 4: Documents
  // ------------------------------------------------------------------

  async addDocument(params: {
    analysisId: string;
    category: string;
    file: Express.Multer.File;
    uploadedById?: string;
  }) {
    await this.findOne(params.analysisId);
    return this.prisma.analysisDocument.create({
      data: {
        analysisId: params.analysisId,
        category: params.category as any,
        fileName: params.file.originalname,
        storedName: params.file.filename,
        mimeType: params.file.mimetype,
        size: params.file.size,
        uploadedById: params.uploadedById,
      },
    });
  }

  async findDocument(id: string) {
    const document = await this.prisma.analysisDocument.findUnique({
      where: { id },
    });
    if (!document) throw new NotFoundException('Документ не найден');
    return document;
  }

  async removeDocument(id: string) {
    const document = await this.findDocument(id);
    await this.prisma.analysisDocument.delete({ where: { id } });
    return document;
  }

  // ------------------------------------------------------------------
  // Stage 5: Process map
  // ------------------------------------------------------------------

  async addProcessStep(analysisId: string, dto: CreateProcessStepDto) {
    await this.findOne(analysisId);
    return this.prisma.analysisProcessStep.create({
      data: { analysisId, ...dto },
      include: {
        department: { select: { id: true, name: true } },
        executor: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateProcessStep(
    analysisId: string,
    stepId: string,
    dto: UpdateProcessStepDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisProcessStep.update({
      where: { id: stepId },
      data: dto,
      include: {
        department: { select: { id: true, name: true } },
        executor: { select: { id: true, fullName: true } },
      },
    });
  }

  async removeProcessStep(analysisId: string, stepId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisProcessStep.delete({ where: { id: stepId } });
  }

  // ------------------------------------------------------------------
  // Stage 6: Corruptogenic factors
  // ------------------------------------------------------------------

  async addFactor(analysisId: string, dto: CreateFactorDto) {
    await this.findOne(analysisId);
    return this.prisma.analysisFactor.create({
      data: { analysisId, ...dto },
      include: { processStep: { select: { id: true, name: true } } },
    });
  }

  async updateFactor(
    analysisId: string,
    factorId: string,
    dto: UpdateFactorDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisFactor.update({
      where: { id: factorId },
      data: dto,
      include: { processStep: { select: { id: true, name: true } } },
    });
  }

  async removeFactor(analysisId: string, factorId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisFactor.delete({ where: { id: factorId } });
  }

  // ------------------------------------------------------------------
  // Stage 7: Risk identification
  // ------------------------------------------------------------------

  private readonly riskInclude = {
    factor: { select: { id: true, factorType: true } },
    category: { select: { id: true, name: true } },
    owner: { select: { id: true, fullName: true } },
  } satisfies Prisma.AnalysisRiskInclude;

  async addRisk(analysisId: string, dto: CreateAnalysisRiskDto) {
    await this.findOne(analysisId);
    return this.prisma.analysisRisk.create({
      data: { analysisId, ...dto },
      include: this.riskInclude,
    });
  }

  async updateRisk(
    analysisId: string,
    riskId: string,
    dto: UpdateAnalysisRiskDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisRisk.update({
      where: { id: riskId },
      data: dto,
      include: this.riskInclude,
    });
  }

  async removeRisk(analysisId: string, riskId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisRisk.delete({ where: { id: riskId } });
  }

  // ------------------------------------------------------------------
  // Stage 8: Risk assessment
  // ------------------------------------------------------------------

  async assessRisk(
    analysisId: string,
    riskId: string,
    dto: AssessAnalysisRiskDto,
  ) {
    await this.findOne(analysisId);
    const existing = await this.prisma.analysisRisk.findUnique({
      where: { id: riskId },
    });
    if (!existing) throw new NotFoundException('Риск не найден');

    const likelihood = dto.likelihood ?? existing.likelihood ?? undefined;
    const impact = dto.impact ?? existing.impact ?? undefined;
    const residualLikelihood =
      dto.residualLikelihood ?? existing.residualLikelihood ?? undefined;
    const residualImpact =
      dto.residualImpact ?? existing.residualImpact ?? undefined;

    return this.prisma.analysisRisk.update({
      where: { id: riskId },
      data: {
        likelihood,
        impact,
        score: this.computeScore(likelihood, impact),
        controlEffectiveness: dto.controlEffectiveness,
        residualLikelihood,
        residualImpact,
        residualScore: this.computeScore(residualLikelihood, residualImpact),
      },
      include: this.riskInclude,
    });
  }

  private computeScore(
    likelihood?: number,
    impact?: number,
  ): number | undefined {
    if (!likelihood || !impact) return undefined;
    return likelihood * impact;
  }

  // ------------------------------------------------------------------
  // "ВАКР-навигатор" — универсальный чек-лист вопросов, переиспользуется на
  // всех шагах упрощённого ВАКР (карточка анализа, источники информации,
  // процессы/факторы, рекомендации). Каталог вопросов — на фронтенде,
  // здесь хранятся только ответы.
  // ------------------------------------------------------------------

  private readonly checklistAnswerInclude = {
    responsibleDepartment: { select: { id: true, name: true } },
    linkedDocument: { select: { id: true, fileName: true } },
    linkedFactor: { select: { id: true, factorType: true } },
    linkedRisk: { select: { id: true, title: true } },
    linkedRecommendation: { select: { id: true, description: true } },
    updatedBy: { select: { id: true, fullName: true } },
  } satisfies Prisma.AnalysisChecklistAnswerInclude;

  async getChecklist(analysisId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisChecklistAnswer.findMany({
      where: { analysisId },
      include: this.checklistAnswerInclude,
    });
  }

  async upsertChecklistAnswer(
    analysisId: string,
    questionKey: string,
    dto: UpsertChecklistAnswerDto,
    userId?: string,
  ) {
    await this.findOne(analysisId);
    const data = {
      status: dto.status,
      comment: dto.comment,
      responsibleDepartmentId: dto.responsibleDepartmentId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      isCurrent: dto.isCurrent,
      isReliable: dto.isReliable,
      linkedDocumentId: dto.linkedDocumentId,
      linkedFactorId: dto.linkedFactorId,
      linkedRiskId: dto.linkedRiskId,
      linkedRecommendationId: dto.linkedRecommendationId,
      updatedById: userId,
    };
    const answer = await this.prisma.analysisChecklistAnswer.upsert({
      where: { analysisId_questionKey: { analysisId, questionKey } },
      create: { analysisId, questionKey, ...data },
      update: data,
      include: this.checklistAnswerInclude,
    });
    await this.audit.record({
      entityType: 'ANALYSIS_CHECKLIST',
      entityId: answer.id,
      action: 'UPSERT',
      userId,
    });
    return answer;
  }

  // ------------------------------------------------------------------
  // "Должности, подверженные коррупционным рискам" — шаг "Процессы, факторы и риски"
  // ------------------------------------------------------------------

  private readonly exposedPositionInclude = {
    department: { select: { id: true, name: true } },
    linkedRisk: { select: { id: true, title: true } },
  } satisfies Prisma.AnalysisExposedPositionInclude;

  async listExposedPositions(analysisId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisExposedPosition.findMany({
      where: { analysisId },
      include: this.exposedPositionInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async addExposedPosition(analysisId: string, dto: CreateExposedPositionDto) {
    await this.findOne(analysisId);
    return this.prisma.analysisExposedPosition.create({
      data: { analysisId, ...dto },
      include: this.exposedPositionInclude,
    });
  }

  async updateExposedPosition(
    analysisId: string,
    positionId: string,
    dto: UpdateExposedPositionDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisExposedPosition.update({
      where: { id: positionId },
      data: dto,
      include: this.exposedPositionInclude,
    });
  }

  async removeExposedPosition(analysisId: string, positionId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisExposedPosition.delete({
      where: { id: positionId },
    });
  }

  // ------------------------------------------------------------------
  // Шаг "Отчёт и завершение" — проверка полноты перед формированием справки
  // ------------------------------------------------------------------

  async getCompletenessCheck(analysisId: string) {
    const analysis = await this.findOne(analysisId);
    const risksAssessed =
      analysis.risks.length > 0 &&
      analysis.risks.every((r) => r.likelihood != null && r.impact != null);
    const hasExposedPositions =
      (await this.prisma.analysisExposedPosition.count({
        where: { analysisId },
      })) > 0;

    const checks: { key: string; ok: boolean; label: string }[] = [
      {
        key: 'hasBasis',
        ok: !!(analysis.orderBasis || analysis.legalBasis),
        label: 'Не указано основание проведения анализа',
      },
      {
        key: 'hasSubject',
        ok: !!analysis.subject,
        label: 'Не указан объект анализа',
      },
      {
        key: 'hasScope',
        ok: !!analysis.analysisScope,
        label: 'Не выбраны направления анализа',
      },
      {
        key: 'hasSources',
        ok: analysis.documents.length > 0,
        label: 'Не загружены источники информации',
      },
      {
        key: 'hasProcesses',
        ok: analysis.processSteps.length > 0,
        label: 'Не описаны процессы',
      },
      {
        key: 'hasFactors',
        ok: analysis.factors.length > 0,
        label: 'Не выявлены коррупциогенные факторы',
      },
      {
        key: 'hasRisks',
        ok: analysis.risks.length > 0,
        label: 'Не созданы риски',
      },
      {
        key: 'risksAssessed',
        ok: risksAssessed,
        label: 'Не все риски оценены',
      },
      {
        key: 'hasRecommendations',
        ok: analysis.recommendations.length > 0,
        label: 'Не добавлены рекомендации',
      },
      {
        key: 'hasActionItems',
        ok: analysis.actionItems.length > 0,
        label: 'Не добавлены мероприятия',
      },
      {
        key: 'hasExposedPositions',
        ok: hasExposedPositions,
        label: 'Не определены должности, подверженные коррупционным рискам',
      },
    ];

    return {
      hasBasis: checks[0].ok,
      hasSubject: checks[1].ok,
      hasScope: checks[2].ok,
      hasSources: checks[3].ok,
      hasProcesses: checks[4].ok,
      hasFactors: checks[5].ok,
      hasRisks: checks[6].ok,
      risksAssessed,
      hasRecommendations: checks[8].ok,
      hasActionItems: checks[9].ok,
      hasExposedPositions,
      missingLabels: checks.filter((c) => !c.ok).map((c) => c.label),
      isComplete: checks.every((c) => c.ok),
    };
  }

  // ------------------------------------------------------------------
  // Stage 9: Recommendations
  // ------------------------------------------------------------------

  private readonly recommendationInclude = {
    risk: { select: { id: true, title: true } },
    responsible: { select: { id: true, fullName: true } },
  } satisfies Prisma.AnalysisRecommendationInclude;

  async addRecommendation(analysisId: string, dto: CreateRecommendationDto) {
    await this.findOne(analysisId);
    return this.prisma.analysisRecommendation.create({
      data: { analysisId, ...dto },
      include: this.recommendationInclude,
    });
  }

  async updateRecommendation(
    analysisId: string,
    recommendationId: string,
    dto: UpdateRecommendationDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisRecommendation.update({
      where: { id: recommendationId },
      data: dto,
      include: this.recommendationInclude,
    });
  }

  async removeRecommendation(analysisId: string, recommendationId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisRecommendation.delete({
      where: { id: recommendationId },
    });
  }

  // ------------------------------------------------------------------
  // Stage 10: Action plan
  // ------------------------------------------------------------------

  private readonly actionItemInclude = {
    recommendation: { select: { id: true, type: true } },
    responsible: { select: { id: true, fullName: true } },
    department: { select: { id: true, name: true } },
  } satisfies Prisma.AnalysisActionItemInclude;

  async addActionItem(analysisId: string, dto: CreateActionItemDto) {
    await this.findOne(analysisId);
    return this.prisma.analysisActionItem.create({
      data: {
        analysisId,
        recommendationId: dto.recommendationId,
        task: dto.task,
        expectedResult: dto.expectedResult,
        responsibleId: dto.responsibleId,
        departmentId: dto.departmentId,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        priority: dto.priority,
        status: dto.status,
        supportingDocs: dto.supportingDocs,
        comments: dto.comments,
      },
      include: this.actionItemInclude,
    });
  }

  async updateActionItem(
    analysisId: string,
    itemId: string,
    dto: UpdateActionItemDto,
  ) {
    await this.findOne(analysisId);
    return this.prisma.analysisActionItem.update({
      where: { id: itemId },
      data: {
        recommendationId: dto.recommendationId,
        task: dto.task,
        expectedResult: dto.expectedResult,
        responsibleId: dto.responsibleId,
        departmentId: dto.departmentId,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        priority: dto.priority,
        status: dto.status,
        supportingDocs: dto.supportingDocs,
        comments: dto.comments,
      },
      include: this.actionItemInclude,
    });
  }

  async removeActionItem(analysisId: string, itemId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisActionItem.delete({ where: { id: itemId } });
  }

  // ------------------------------------------------------------------
  // Stage 11: Coordination — comments and change history
  // ------------------------------------------------------------------

  async addComment(analysisId: string, dto: CreateCommentDto, userId?: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisComment.create({
      data: { analysisId, text: dto.text, authorId: userId },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async removeComment(analysisId: string, commentId: string) {
    await this.findOne(analysisId);
    return this.prisma.analysisComment.delete({ where: { id: commentId } });
  }

  async getHistory(analysisId: string) {
    await this.findOne(analysisId);
    return this.audit.findForEntity('ANALYSIS', analysisId);
  }

  // ------------------------------------------------------------------
  // Stage 12: Approval — migrates risks/action items into the Risk
  // Register and Action Plans modules, once per analysis (idempotent).
  // ------------------------------------------------------------------

  async approve(analysisId: string, userId?: string) {
    const analysis = await this.findOne(analysisId);
    const approvalIndex = ANALYSIS_STAGE_ORDER.indexOf(AnalysisStage.APPROVAL);
    if (ANALYSIS_STAGE_ORDER.indexOf(analysis.stage) < approvalIndex) {
      throw new BadRequestException(
        'Анализ можно утвердить только по достижении этапа «Утверждение».',
      );
    }

    // Answers linked to a risk (e.g. an information-source checklist row the
    // user tied to this risk) supply the "источник информации" for its origin.
    const linkedSourceAnswers =
      await this.prisma.analysisChecklistAnswer.findMany({
        where: { analysisId, linkedRiskId: { not: null } },
      });
    const sourceLabelByRiskId = new Map<string, string>();
    for (const answer of linkedSourceAnswers) {
      const catalogEntry = SOURCE_CHECKLIST_CATALOG.find(
        (c) => c.key === answer.questionKey,
      );
      if (catalogEntry && answer.linkedRiskId) {
        sourceLabelByRiskId.set(answer.linkedRiskId, catalogEntry.label);
      }
    }

    const linkedRiskIds = new Map<string, string>();
    for (const risk of analysis.risks) {
      if (risk.linkedRiskId) {
        linkedRiskIds.set(risk.id, risk.linkedRiskId);
        continue;
      }
      const factor = risk.factorId
        ? analysis.factors.find((f) => f.id === risk.factorId)
        : undefined;
      const recommendation = analysis.recommendations.find(
        (r) => r.riskId === risk.id,
      );
      const originContext = {
        analysisCode: analysis.code,
        analysisName: analysis.name,
        objectOfAnalysis: analysis.subject ?? undefined,
        scope: analysis.analysisScope ?? undefined,
        process: factor?.processStep?.name ?? undefined,
        corruptogenicFactor: factor
          ? (CORRUPTOGENIC_FACTOR_LABELS[factor.factorType] ??
            factor.factorType)
          : undefined,
        informationSource: sourceLabelByRiskId.get(risk.id) ?? undefined,
        cause: risk.cause ?? undefined,
        consequences: risk.consequences ?? undefined,
        recommendation: recommendation?.description ?? undefined,
      };

      const createdRisk = await this.risksService.create(
        {
          title: risk.title,
          description: risk.description ?? undefined,
          categoryId: risk.categoryId ?? undefined,
          companyId: analysis.companyId ?? undefined,
          departmentId: factor?.processStep?.departmentId ?? undefined,
          ownerId: risk.ownerId ?? undefined,
          likelihood: risk.likelihood ?? undefined,
          impact: risk.impact ?? undefined,
          sourceTemplateId: risk.sourceTemplateId ?? undefined,
          sourceAnalysisId: analysisId,
          originContext,
        },
        userId,
      );
      await this.prisma.analysisRisk.update({
        where: { id: risk.id },
        data: { linkedRiskId: createdRisk.id },
      });
      linkedRiskIds.set(risk.id, createdRisk.id);
    }

    for (const item of analysis.actionItems) {
      if (item.linkedActionId) continue;
      const recommendation = item.recommendationId
        ? analysis.recommendations.find((r) => r.id === item.recommendationId)
        : undefined;
      const linkedRiskId = recommendation?.risk
        ? linkedRiskIds.get(recommendation.risk.id)
        : undefined;
      if (!linkedRiskId) continue;

      const createdAction = await this.actionsService.create(
        {
          riskId: linkedRiskId,
          title: item.task,
          description: item.expectedResult ?? undefined,
          ownerId: item.responsibleId ?? undefined,
          deadline: item.deadline ? item.deadline.toISOString() : undefined,
          status: item.status,
          evidence: item.supportingDocs ?? undefined,
          result: item.comments ?? undefined,
        },
        userId,
      );
      await this.prisma.analysisActionItem.update({
        where: { id: item.id },
        data: { linkedActionId: createdAction.id },
      });
    }

    const updated = await this.prisma.corruptionAnalysis.update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.COMPLETED, completedAt: new Date() },
      include: DETAIL_INCLUDE,
    });

    await this.audit.record({
      entityType: 'ANALYSIS',
      entityId: analysisId,
      action: 'APPROVE',
      userId,
    });
    return updated;
  }

  // ------------------------------------------------------------------
  // Stage 14: Reassessment
  // ------------------------------------------------------------------

  async updateReassessment(analysisId: string, dto: UpdateReassessmentDto) {
    await this.findOne(analysisId);
    return this.prisma.corruptionAnalysis.update({
      where: { id: analysisId },
      data: {
        reassessmentNotes: dto.reassessmentNotes,
        reassessedAt: new Date(),
      },
      include: DETAIL_INCLUDE,
    });
  }

  // ------------------------------------------------------------------
  // Dashboard summary
  // ------------------------------------------------------------------

  async summary() {
    const now = new Date();
    const [total, completed, inProgress, overdue] = await Promise.all([
      this.prisma.corruptionAnalysis.count(),
      this.prisma.corruptionAnalysis.count({
        where: { status: AnalysisStatus.COMPLETED },
      }),
      this.prisma.corruptionAnalysis.count({
        where: { status: AnalysisStatus.IN_PROGRESS },
      }),
      this.prisma.corruptionAnalysis.count({
        where: {
          status: { in: [AnalysisStatus.DRAFT, AnalysisStatus.IN_PROGRESS] },
          deadline: { lt: now },
        },
      }),
    ]);
    return { total, completed, inProgress, overdue };
  }

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.corruptionAnalysis.count({
      where: { code: { startsWith: `ВАКР-${year}-` } },
    });
    const sequence = String(count + 1).padStart(4, '0');
    const code = `ВАКР-${year}-${sequence}`;

    const clash = await this.prisma.corruptionAnalysis.findUnique({
      where: { code },
    });
    if (clash) {
      return `ВАКР-${year}-${String(count + 1 + Math.floor(Math.random() * 100)).padStart(4, '0')}`;
    }
    return code;
  }
}
