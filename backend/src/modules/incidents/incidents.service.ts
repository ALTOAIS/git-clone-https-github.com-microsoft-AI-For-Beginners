import { Injectable, NotFoundException } from '@nestjs/common';
import { IncidentAction, Prisma, RiskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RisksService } from '../risks/risks.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

const INCLUDE = {
  source: true,
  risk: { select: { id: true, code: true, title: true, status: true } },
  reportedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.IncidentInclude;

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private risksService: RisksService,
    private audit: AuditService,
  ) {}

  async findAll(params: { page: number; pageSize: number; status?: string; riskId?: string }) {
    const { page, pageSize, status, riskId } = params;
    const where: Prisma.IncidentWhereInput = {
      ...(status ? { status: status as any } : {}),
      ...(riskId ? { riskId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.incident.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id }, include: INCLUDE });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async create(dto: CreateIncidentDto, userId?: string) {
    let riskId = dto.riskId;

    if (dto.action === IncidentAction.CREATE_RISK && !riskId) {
      const risk = await this.risksService.create(
        {
          title: `[Incident] ${dto.title}`,
          description: dto.description,
          sourceIds: dto.sourceId ? [dto.sourceId] : undefined,
        },
        userId,
      );
      riskId = risk.id;
    }

    const incident = await this.prisma.incident.create({
      data: {
        title: dto.title,
        description: dto.description,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        status: dto.status,
        action: dto.action,
        sourceId: dto.sourceId,
        riskId,
        reportedById: userId,
      },
      include: INCLUDE,
    });

    await this.applyRiskAction(incident.id, dto.action, riskId, userId);
    await this.audit.record({ entityType: 'INCIDENT', entityId: incident.id, action: 'CREATE', userId });
    return incident;
  }

  async update(id: string, dto: UpdateIncidentDto, userId?: string) {
    const existing = await this.findOne(id);
    const incident = await this.prisma.incident.update({
      where: { id },
      data: {
        ...dto,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
      include: INCLUDE,
    });

    if (dto.action && dto.action !== existing.action) {
      await this.applyRiskAction(id, dto.action, dto.riskId ?? existing.riskId ?? undefined, userId);
    }

    await this.audit.record({ entityType: 'INCIDENT', entityId: id, action: 'UPDATE', userId, changes: dto as any });
    return incident;
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma.incident.delete({ where: { id } });
    await this.audit.record({ entityType: 'INCIDENT', entityId: id, action: 'DELETE', userId });
    return { success: true };
  }

  private async applyRiskAction(
    incidentId: string,
    action: IncidentAction | undefined,
    riskId: string | undefined,
    userId?: string,
  ) {
    if (!action || !riskId || action === IncidentAction.NONE || action === IncidentAction.CREATE_RISK) {
      return;
    }

    if (action === IncidentAction.UPDATE_RISK) {
      await this.risksService.update(riskId, {}, userId);
    } else if (action === IncidentAction.CLOSE_RISK) {
      await this.tryTransition(riskId, RiskStatus.CLOSED, userId, `Closed via incident ${incidentId}`);
    } else if (action === IncidentAction.ESCALATE_RISK) {
      await this.tryTransition(riskId, RiskStatus.ASSESSMENT, userId, `Escalated via incident ${incidentId}`);
    }
  }

  private async tryTransition(riskId: string, status: RiskStatus, userId?: string, note?: string) {
    try {
      await this.risksService.changeStatus(riskId, { status, note }, userId);
    } catch {
      // Lifecycle does not allow a direct jump from the current state; leave the risk status
      // untouched and rely on the audit trail / comments for follow-up by a compliance officer.
    }
  }
}
