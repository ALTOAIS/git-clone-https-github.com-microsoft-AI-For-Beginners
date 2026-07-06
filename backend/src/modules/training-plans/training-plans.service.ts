import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { CreateTrainingPlanDto } from './dto/create-training-plan.dto';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto';
import { UpdateTrainingPlanDto } from './dto/update-training-plan.dto';

const DETAIL_INCLUDE = {
  createdBy: { select: { id: true, fullName: true, email: true } },
  items: {
    include: {
      course: { select: { id: true, title: true, status: true } },
      responsible: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ quarter: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.TrainingPlanInclude;

const LIST_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  _count: { select: { items: true } },
} satisfies Prisma.TrainingPlanInclude;

@Injectable()
export class TrainingPlansService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: { page: number; pageSize: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.trainingPlan.findMany({
        include: LIST_INCLUDE,
        orderBy: { year: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.trainingPlan.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!plan) throw new NotFoundException('План обучения не найден');
    return plan;
  }

  async create(dto: CreateTrainingPlanDto, userId?: string) {
    const existing = await this.prisma.trainingPlan.findUnique({
      where: { year: dto.year },
    });
    if (existing)
      throw new BadRequestException(
        `План обучения на ${dto.year} год уже создан`,
      );
    const plan = await this.prisma.trainingPlan.create({
      data: { ...dto, createdById: userId },
      include: DETAIL_INCLUDE,
    });
    await this.audit.record({
      entityType: 'TRAINING_PLAN',
      entityId: plan.id,
      action: 'CREATE',
      userId,
    });
    return plan;
  }

  async update(id: string, dto: UpdateTrainingPlanDto, userId?: string) {
    await this.findOne(id);
    const plan = await this.prisma.trainingPlan.update({
      where: { id },
      data: dto,
      include: DETAIL_INCLUDE,
    });
    await this.audit.record({
      entityType: 'TRAINING_PLAN',
      entityId: id,
      action: 'UPDATE',
      userId,
    });
    return plan;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.trainingPlan.delete({ where: { id } });
  }

  async addItem(planId: string, dto: CreatePlanItemDto) {
    await this.findOne(planId);
    return this.prisma.trainingPlanItem.create({
      data: { planId, ...dto },
      include: {
        course: { select: { id: true, title: true, status: true } },
        responsible: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async updateItem(planId: string, itemId: string, dto: UpdatePlanItemDto) {
    await this.findOne(planId);
    return this.prisma.trainingPlanItem.update({
      where: { id: itemId },
      data: dto,
      include: {
        course: { select: { id: true, title: true, status: true } },
        responsible: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async removeItem(planId: string, itemId: string) {
    await this.findOne(planId);
    return this.prisma.trainingPlanItem.delete({ where: { id: itemId } });
  }
}
