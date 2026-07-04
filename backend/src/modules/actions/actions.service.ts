import { Injectable, NotFoundException } from '@nestjs/common';
import { ActionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

const INCLUDE = {
  owner: { select: { id: true, fullName: true, email: true } },
  risk: { select: { id: true, code: true, title: true, status: true } },
} satisfies Prisma.ActionInclude;

@Injectable()
export class ActionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    riskId?: string;
    ownerId?: string;
    status?: ActionStatus;
    overdueOnly?: boolean;
  }) {
    const { page, pageSize, riskId, ownerId, status, overdueOnly } = params;
    const where: Prisma.ActionWhereInput = {
      ...(riskId ? { riskId } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(status ? { status } : {}),
      ...(overdueOnly
        ? {
            deadline: { lt: new Date() },
            status: { notIn: [ActionStatus.COMPLETED, ActionStatus.CANCELLED] },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.action.findMany({
        where,
        include: INCLUDE,
        orderBy: { deadline: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.action.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOverdue() {
    return this.prisma.action.findMany({
      where: {
        deadline: { lt: new Date() },
        status: { notIn: [ActionStatus.COMPLETED, ActionStatus.CANCELLED] },
      },
      include: INCLUDE,
    });
  }

  async findOne(id: string) {
    const action = await this.prisma.action.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!action) throw new NotFoundException('Action not found');
    return action;
  }

  async create(dto: CreateActionDto, userId?: string) {
    const action = await this.prisma.action.create({
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
      include: INCLUDE,
    });
    await this.audit.record({
      entityType: 'ACTION',
      entityId: action.id,
      action: 'CREATE',
      userId,
    });
    return action;
  }

  async update(id: string, dto: UpdateActionDto, userId?: string) {
    await this.findOne(id);
    const completedAt =
      dto.status === ActionStatus.COMPLETED ? new Date() : undefined;
    const action = await this.prisma.action.update({
      where: { id },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        ...(completedAt ? { completedAt } : {}),
      },
      include: INCLUDE,
    });
    await this.audit.record({
      entityType: 'ACTION',
      entityId: id,
      action: 'UPDATE',
      userId,
      changes: dto as any,
    });
    return action;
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma.action.delete({ where: { id } });
    await this.audit.record({
      entityType: 'ACTION',
      entityId: id,
      action: 'DELETE',
      userId,
    });
    return { success: true };
  }

  /** Flips PLANNED/IN_PROGRESS actions whose deadline has passed to OVERDUE. Used by the notifications scheduler. */
  async markOverdue() {
    return this.prisma.action.updateMany({
      where: {
        deadline: { lt: new Date() },
        status: { in: [ActionStatus.PLANNED, ActionStatus.IN_PROGRESS] },
      },
      data: { status: ActionStatus.OVERDUE },
    });
  }
}
