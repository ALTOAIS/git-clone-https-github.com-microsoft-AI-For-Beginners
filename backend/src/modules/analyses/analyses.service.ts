import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalysisStage, AnalysisStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isForwardStageTransition } from './analyses.constants';
import { ChangeStageDto } from './dto/change-stage.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { CreateWorkingGroupMemberDto } from './dto/create-working-group-member.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { UpdateWorkingGroupMemberDto } from './dto/update-working-group-member.dto';

const DETAIL_INCLUDE = {
  company: true,
  lead: { select: { id: true, fullName: true, email: true, role: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
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
