import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RiskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AssessRiskDto } from './dto/assess-risk.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateRiskDto } from './dto/create-risk.dto';
import { QueryRisksDto } from './dto/query-risks.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RISK_LIFECYCLE, RISK_STATUS_LABELS_RU } from './risks.constants';

const DETAIL_INCLUDE = {
  category: true,
  company: true,
  department: true,
  businessProcess: true,
  owner: { select: { id: true, fullName: true, email: true, role: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  sources: { include: { source: true } },
  controls: { include: { owner: { select: { id: true, fullName: true } } } },
  actions: { include: { owner: { select: { id: true, fullName: true } } } },
  incidents: true,
  comments: {
    include: { author: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  attachments: {
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  },
  history: { orderBy: { version: 'desc' as const } },
} satisfies Prisma.RiskInclude;

const LIST_INCLUDE = {
  category: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  owner: { select: { id: true, fullName: true } },
  _count: { select: { actions: true, controls: true } },
} satisfies Prisma.RiskInclude;

@Injectable()
export class RisksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: QueryRisksDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.RiskWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'desc' }
      : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.risk.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.risk.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const risk = await this.prisma.risk.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!risk) throw new NotFoundException('Риск не найден');
    return risk;
  }

  async create(dto: CreateRiskDto, userId?: string) {
    const code = await this.generateCode();
    const inherentScore = this.computeScore(dto.likelihood, dto.impact);

    const risk = await this.prisma.risk.create({
      data: {
        code,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        companyId: dto.companyId,
        departmentId: dto.departmentId,
        businessProcessId: dto.businessProcessId,
        ownerId: dto.ownerId,
        createdById: userId,
        likelihood: dto.likelihood,
        impact: dto.impact,
        inherentScore,
        status: RiskStatus.DRAFT,
        sourceTemplateId: dto.sourceTemplateId,
        sources: dto.sourceIds
          ? { create: dto.sourceIds.map((sourceId) => ({ sourceId })) }
          : undefined,
      },
      include: DETAIL_INCLUDE,
    });

    await this.snapshotHistory(risk.id, 1, risk, userId, 'Риск создан');
    await this.audit.record({
      entityType: 'RISK',
      entityId: risk.id,
      action: 'CREATE',
      userId,
    });

    return risk;
  }

  async update(id: string, dto: UpdateRiskDto, userId?: string) {
    const existing = await this.findOne(id);

    const likelihood = dto.likelihood ?? existing.likelihood ?? undefined;
    const impact = dto.impact ?? existing.impact ?? undefined;
    const inherentScore = this.computeScore(likelihood, impact);

    const updated = await this.prisma.risk.update({
      where: { id },
      data: {
        ...dto,
        inherentScore,
        version: { increment: 1 },
      },
      include: DETAIL_INCLUDE,
    });

    await this.snapshotHistory(
      id,
      updated.version,
      updated,
      userId,
      'Риск обновлён',
    );
    await this.audit.record({
      entityType: 'RISK',
      entityId: id,
      action: 'UPDATE',
      userId,
      changes: dto as Record<string, unknown>,
    });

    return updated;
  }

  async assess(id: string, dto: AssessRiskDto, userId?: string) {
    const existing = await this.findOne(id);
    const likelihood = dto.likelihood ?? existing.likelihood ?? undefined;
    const impact = dto.impact ?? existing.impact ?? undefined;
    const residualLikelihood =
      dto.residualLikelihood ?? existing.residualLikelihood ?? undefined;
    const residualImpact =
      dto.residualImpact ?? existing.residualImpact ?? undefined;

    const inherentScore = this.computeScore(likelihood, impact);
    const residualScore = this.computeScore(residualLikelihood, residualImpact);

    const controlEffectivenessAvg = await this.computeControlEffectiveness(id);

    const updated = await this.prisma.risk.update({
      where: { id },
      data: {
        likelihood,
        impact,
        inherentScore,
        residualLikelihood,
        residualImpact,
        residualScore,
        controlEffectivenessAvg,
        version: { increment: 1 },
      },
      include: DETAIL_INCLUDE,
    });

    await this.snapshotHistory(
      id,
      updated.version,
      updated,
      userId,
      'Риск оценён',
    );
    await this.audit.record({
      entityType: 'RISK',
      entityId: id,
      action: 'ASSESS',
      userId,
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeStatusDto, userId?: string) {
    const existing = await this.findOne(id);
    const allowed = RISK_LIFECYCLE[existing.status];
    if (!allowed.includes(dto.status)) {
      const allowedLabels = allowed
        .map((status) => RISK_STATUS_LABELS_RU[status])
        .join(', ');
      throw new BadRequestException(
        `Невозможно перевести риск из статуса «${RISK_STATUS_LABELS_RU[existing.status]}» в статус «${RISK_STATUS_LABELS_RU[dto.status]}». Допустимые статусы: ${allowedLabels || 'нет'}`,
      );
    }

    const extra: Prisma.RiskUpdateInput = {};
    if (dto.status === RiskStatus.APPROVED) extra.approvedAt = new Date();
    if (dto.status === RiskStatus.CLOSED) extra.closedAt = new Date();
    if (dto.status === RiskStatus.ARCHIVED) extra.archivedAt = new Date();

    const updated = await this.prisma.risk.update({
      where: { id },
      data: { status: dto.status, ...extra, version: { increment: 1 } },
      include: DETAIL_INCLUDE,
    });

    await this.snapshotHistory(
      id,
      updated.version,
      updated,
      userId,
      dto.note ?? `Статус изменён на «${RISK_STATUS_LABELS_RU[dto.status]}»`,
    );
    await this.audit.record({
      entityType: 'RISK',
      entityId: id,
      action: 'STATUS_CHANGE',
      userId,
      changes: { from: existing.status, to: dto.status, note: dto.note },
    });

    return updated;
  }

  async archive(id: string, userId?: string) {
    return this.changeStatus(id, { status: RiskStatus.ARCHIVED }, userId);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.risk.delete({ where: { id } });
  }

  /** Recomputes the aggregated control-effectiveness score for a risk; called whenever a control changes. */
  async recomputeControlEffectiveness(riskId: string) {
    const controlEffectivenessAvg =
      await this.computeControlEffectiveness(riskId);
    return this.prisma.risk.update({
      where: { id: riskId },
      data: { controlEffectivenessAvg },
    });
  }

  private async computeControlEffectiveness(
    riskId: string,
  ): Promise<number | undefined> {
    const controls = await this.prisma.control.findMany({ where: { riskId } });
    if (controls.length === 0) return undefined;
    const weight: Record<string, number> = {
      EFFECTIVE: 100,
      PARTIALLY_EFFECTIVE: 60,
      INEFFECTIVE: 20,
      NOT_TESTED: 0,
    };
    const total = controls.reduce(
      (sum, c) => sum + (weight[c.effectiveness] ?? 0),
      0,
    );
    return Math.round((total / controls.length) * 100) / 100;
  }

  private computeScore(
    likelihood?: number,
    impact?: number,
  ): number | undefined {
    if (!likelihood || !impact) return undefined;
    return likelihood * impact;
  }

  private async snapshotHistory(
    riskId: string,
    version: number,
    snapshot: unknown,
    changedById?: string,
    changeNote?: string,
  ) {
    await this.prisma.riskHistory.create({
      data: {
        riskId,
        version,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        changedById,
        changeNote,
      },
    });
  }

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.risk.count({
      where: { code: { startsWith: `RISK-${year}-` } },
    });
    const sequence = String(count + 1).padStart(4, '0');
    const code = `RISK-${year}-${sequence}`;

    const clash = await this.prisma.risk.findUnique({ where: { code } });
    if (clash) {
      return `RISK-${year}-${String(count + 1 + Math.floor(Math.random() * 100)).padStart(4, '0')}`;
    }
    return code;
  }
}
