import { Injectable, NotFoundException } from '@nestjs/common';
import { ControlType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRiskTemplateDto } from './dto/create-risk-template.dto';
import { QueryRiskTemplatesDto } from './dto/query-risk-templates.dto';
import { UpdateRiskTemplateDto } from './dto/update-risk-template.dto';

const LIST_INCLUDE = {
  category: { select: { id: true, name: true } },
  _count: { select: { risks: true, analysisRisks: true } },
} satisfies Prisma.RiskTemplateInclude;

/** Same low/medium/high/critical bucketing as the Risk Register's scoreLevel() util. */
function scoreLevelRange(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): { gte: number; lt?: number } {
  switch (level) {
    case 'CRITICAL':
      return { gte: 15 };
    case 'HIGH':
      return { gte: 9, lt: 15 };
    case 'MEDIUM':
      return { gte: 5, lt: 9 };
    default:
      return { gte: 0, lt: 5 };
  }
}

@Injectable()
export class RiskTemplatesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: QueryRiskTemplatesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const tags = query.tags ? query.tags.split(',').filter(Boolean) : [];

    const where: Prisma.RiskTemplateWhereInput = {
      isActive: query.includeInactive ? undefined : true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.direction ? { direction: query.direction } : {}),
      ...(query.riskLevel ? { baseScore: scoreLevelRange(query.riskLevel) } : {}),
      ...(tags.length ? { tags: { hasSome: tags } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { tags: { hasSome: [query.search] } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.riskTemplate.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { title: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.riskTemplate.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listTags(): Promise<string[]> {
    const rows = await this.prisma.riskTemplate.findMany({
      where: { isActive: true },
      select: { tags: true },
    });
    return [...new Set(rows.flatMap((r) => r.tags))].sort();
  }

  async findOne(id: string) {
    const template = await this.prisma.riskTemplate.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!template) throw new NotFoundException('Типовой риск не найден');
    return template;
  }

  /**
   * Не является ИИ-функцией — детерминированный подбор по совпадению
   * направления и пересечению тегов, отсортированный по релевантности.
   */
  async findSimilar(id: string) {
    const template = await this.findOne(id);
    const candidates = await this.prisma.riskTemplate.findMany({
      where: {
        id: { not: id },
        isActive: true,
        OR: [{ direction: template.direction }, { tags: { hasSome: template.tags } }],
      },
      include: { category: { select: { id: true, name: true } } },
      take: 30,
    });
    return candidates
      .map((c) => ({
        template: c,
        score:
          (c.direction === template.direction ? 2 : 0) +
          c.tags.filter((tag) => template.tags.includes(tag)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((r) => r.template);
  }

  async create(dto: CreateRiskTemplateDto, userId?: string) {
    const code = await this.generateCode();
    const template = await this.prisma.riskTemplate.create({
      data: {
        code,
        title: dto.title,
        categoryId: dto.categoryId,
        direction: dto.direction,
        description: dto.description,
        corruptionScheme: dto.corruptionScheme,
        causes: dto.causes,
        corruptionFactors: dto.corruptionFactors,
        consequences: dto.consequences,
        redFlags: dto.redFlags,
        typicalControls: dto.typicalControls ?? [],
        recommendedActions: dto.recommendedActions ?? [],
        baseProbability: dto.baseProbability,
        baseImpact: dto.baseImpact,
        baseScore: dto.baseProbability * dto.baseImpact,
        tags: dto.tags ?? [],
      },
      include: { category: { select: { id: true, name: true } } },
    });
    await this.audit.record({
      entityType: 'RISK_TEMPLATE',
      entityId: template.id,
      action: 'CREATE',
      userId,
    });
    return template;
  }

  async update(id: string, dto: UpdateRiskTemplateDto, userId?: string) {
    const existing = await this.findOne(id);
    const baseProbability = dto.baseProbability ?? existing.baseProbability;
    const baseImpact = dto.baseImpact ?? existing.baseImpact;
    const template = await this.prisma.riskTemplate.update({
      where: { id },
      data: {
        title: dto.title,
        categoryId: dto.categoryId,
        direction: dto.direction,
        description: dto.description,
        corruptionScheme: dto.corruptionScheme,
        causes: dto.causes,
        corruptionFactors: dto.corruptionFactors,
        consequences: dto.consequences,
        redFlags: dto.redFlags,
        typicalControls: dto.typicalControls,
        recommendedActions: dto.recommendedActions,
        baseProbability,
        baseImpact,
        baseScore: baseProbability * baseImpact,
        tags: dto.tags,
        isActive: dto.isActive,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    await this.audit.record({
      entityType: 'RISK_TEMPLATE',
      entityId: template.id,
      action: 'UPDATE',
      userId,
    });
    return template;
  }

  /** Soft "деактивировать/архивировать" — same convention as Category/Department.remove(). */
  async remove(id: string, userId?: string) {
    await this.findOne(id);
    const template = await this.prisma.riskTemplate.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.record({
      entityType: 'RISK_TEMPLATE',
      entityId: template.id,
      action: 'DEACTIVATE',
      userId,
    });
    return template;
  }

  async duplicate(id: string, userId?: string) {
    const source = await this.findOne(id);
    const code = await this.generateCode();
    const template = await this.prisma.riskTemplate.create({
      data: {
        code,
        title: `${source.title} (копия)`,
        categoryId: source.categoryId,
        direction: source.direction,
        description: source.description,
        corruptionScheme: source.corruptionScheme,
        causes: source.causes,
        corruptionFactors: source.corruptionFactors,
        consequences: source.consequences,
        redFlags: source.redFlags,
        typicalControls: source.typicalControls,
        recommendedActions: source.recommendedActions,
        baseProbability: source.baseProbability,
        baseImpact: source.baseImpact,
        baseScore: source.baseScore,
        tags: source.tags,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    await this.audit.record({
      entityType: 'RISK_TEMPLATE',
      entityId: template.id,
      action: 'DUPLICATE',
      userId,
      changes: { sourceTemplateId: id },
    });
    return template;
  }

  /**
   * Создаёт реальный риск в Реестре рисков на основе шаблона. Контроли и
   * мероприятия передаются пользователем уже отредактированными (после
   * предпросмотра на фронтенде) и создаются как обычные Control/Action,
   * привязанные к новому риску.
   */
  async createRisk(
    id: string,
    dto: {
      title?: string;
      description?: string;
      categoryId?: string;
      companyId?: string;
      departmentId?: string;
      businessProcessId?: string;
      ownerId?: string;
      likelihood?: number;
      impact?: number;
      controls?: string[];
      actions?: string[];
    },
    userId?: string,
  ) {
    const template = await this.findOne(id);
    const code = await this.generateRiskCode();
    const likelihood = dto.likelihood ?? template.baseProbability;
    const impact = dto.impact ?? template.baseImpact;

    const descriptionParts = [
      dto.description ?? template.description,
      template.causes ? `Причины возникновения: ${template.causes}` : null,
      template.corruptionScheme ? `Возможная коррупционная схема: ${template.corruptionScheme}` : null,
      template.consequences ? `Возможные последствия: ${template.consequences}` : null,
      template.redFlags ? `Red flags / индикаторы: ${template.redFlags}` : null,
    ].filter(Boolean);

    const risk = await this.prisma.risk.create({
      data: {
        code,
        title: dto.title ?? template.title,
        description: descriptionParts.join('\n\n'),
        categoryId: dto.categoryId ?? template.categoryId ?? undefined,
        companyId: dto.companyId,
        departmentId: dto.departmentId,
        businessProcessId: dto.businessProcessId,
        ownerId: dto.ownerId,
        createdById: userId,
        likelihood,
        impact,
        inherentScore: likelihood * impact,
        sourceTemplateId: template.id,
        controls: dto.controls?.length
          ? {
              create: dto.controls.map((title) => ({
                type: ControlType.PREVENTIVE,
                title,
              })),
            }
          : undefined,
        actions: dto.actions?.length
          ? {
              create: dto.actions.map((title) => ({ title })),
            }
          : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        controls: true,
        actions: true,
      },
    });

    await this.audit.record({
      entityType: 'RISK',
      entityId: risk.id,
      action: 'CREATE_FROM_TEMPLATE',
      userId,
      changes: { sourceTemplateId: template.id },
    });

    return risk;
  }

  private async generateCode(): Promise<string> {
    const count = await this.prisma.riskTemplate.count();
    return `RT-${String(count + 1).padStart(4, '0')}`;
  }

  private async generateRiskCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.risk.count({
      where: { code: { startsWith: `RISK-${year}-` } },
    });
    return `RISK-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
