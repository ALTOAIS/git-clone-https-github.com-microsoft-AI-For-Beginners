import { Injectable } from '@nestjs/common';
import { ControlEffectiveness, RiskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_STATUSES: RiskStatus[] = [
  RiskStatus.NEW,
  RiskStatus.ASSESSMENT,
  RiskStatus.APPROVED,
  RiskStatus.MONITORING,
  RiskStatus.MITIGATION,
  RiskStatus.RESIDUAL_ASSESSMENT,
];

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** 5x5 likelihood/impact matrix of active risks, for the inherent-risk heat map widget. */
  async heatmap(kind: 'inherent' | 'residual' = 'inherent') {
    const likelihoodField =
      kind === 'inherent' ? 'likelihood' : 'residualLikelihood';
    const impactField = kind === 'inherent' ? 'impact' : 'residualImpact';

    const where: any = {
      status: { in: ACTIVE_STATUSES },
      [likelihoodField]: { not: null },
      [impactField]: { not: null },
    };
    const risks = await this.prisma.risk.findMany({
      where,
      select: { [likelihoodField]: true, [impactField]: true } as any,
    });

    const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const risk of risks as any[]) {
      const l = risk[likelihoodField] as number;
      const i = risk[impactField] as number;
      if (l >= 1 && l <= 5 && i >= 1 && i <= 5) {
        grid[l - 1][i - 1] += 1;
      }
    }
    return { grid };
  }

  /** Monthly count of risks created vs. closed, for the trends line chart. */
  async trends(months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const [created, closed] = await Promise.all([
      this.prisma.risk.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.risk.findMany({
        where: { closedAt: { gte: since } },
        select: { closedAt: true },
      }),
    ]);

    const buckets = new Map<
      string,
      { month: string; created: number; closed: number }
    >();
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { month: key, created: 0, closed: 0 });
    }
    for (const r of created) {
      const d = r.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) buckets.get(key)!.created += 1;
    }
    for (const r of closed) {
      if (!r.closedAt) continue;
      const key = `${r.closedAt.getFullYear()}-${String(r.closedAt.getMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) buckets.get(key)!.closed += 1;
    }
    return Array.from(buckets.values());
  }

  async topRisks(limit = 10) {
    return this.prisma.risk.findMany({
      where: { status: { in: ACTIVE_STATUSES }, inherentScore: { not: null } },
      orderBy: { inherentScore: 'desc' },
      take: limit,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        inherentScore: true,
        residualScore: true,
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        owner: { select: { id: true, fullName: true } },
      },
    });
  }

  async topCompanies(limit = 5) {
    const groups = await this.prisma.risk.groupBy({
      by: ['companyId'],
      where: { status: { in: ACTIVE_STATUSES }, companyId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { companyId: 'desc' } },
      take: limit,
    });
    const companies = await this.prisma.company.findMany({
      where: { id: { in: groups.map((g) => g.companyId!) } },
    });
    const nameById = new Map(companies.map((c) => [c.id, c.name]));
    return groups.map((g) => ({
      id: g.companyId,
      name: nameById.get(g.companyId!),
      count: g._count._all,
    }));
  }

  async topDepartments(limit = 5) {
    const groups = await this.prisma.risk.groupBy({
      by: ['departmentId'],
      where: { status: { in: ACTIVE_STATUSES }, departmentId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { departmentId: 'desc' } },
      take: limit,
    });
    const departments = await this.prisma.department.findMany({
      where: { id: { in: groups.map((g) => g.departmentId!) } },
    });
    const nameById = new Map(departments.map((d) => [d.id, d.name]));
    return groups.map((g) => ({
      id: g.departmentId,
      name: nameById.get(g.departmentId!),
      count: g._count._all,
    }));
  }

  async topCategories(limit = 5) {
    const groups = await this.prisma.risk.groupBy({
      by: ['categoryId'],
      where: { status: { in: ACTIVE_STATUSES }, categoryId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: limit,
    });
    const categories = await this.prisma.category.findMany({
      where: { id: { in: groups.map((g) => g.categoryId!) } },
    });
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    return groups.map((g) => ({
      id: g.categoryId,
      name: nameById.get(g.categoryId!),
      count: g._count._all,
    }));
  }

  async topSources(limit = 5) {
    const groups = await this.prisma.riskSource.groupBy({
      by: ['sourceId'],
      _count: { _all: true },
      orderBy: { _count: { sourceId: 'desc' } },
      take: limit,
    });
    const sources = await this.prisma.source.findMany({
      where: { id: { in: groups.map((g) => g.sourceId) } },
    });
    const byId = new Map(sources.map((s) => [s.id, s]));
    return groups.map((g) => ({
      id: g.sourceId,
      title: byId.get(g.sourceId)?.title,
      type: byId.get(g.sourceId)?.type,
      count: g._count._all,
    }));
  }

  async controlEffectiveness() {
    const groups = await this.prisma.control.groupBy({
      by: ['effectiveness'],
      _count: { _all: true },
    });
    const result: Record<ControlEffectiveness, number> = {
      EFFECTIVE: 0,
      PARTIALLY_EFFECTIVE: 0,
      INEFFECTIVE: 0,
      NOT_TESTED: 0,
    };
    for (const g of groups) {
      result[g.effectiveness] = g._count._all;
    }
    return result;
  }

  async residualRiskSummary() {
    const risks = await this.prisma.risk.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
        inherentScore: { not: null },
      },
      select: { inherentScore: true, residualScore: true },
    });
    if (risks.length === 0) {
      return {
        averageInherent: 0,
        averageResidual: 0,
        reductionPercent: 0,
        count: 0,
      };
    }
    const withResidual = risks.filter((r) => r.residualScore !== null);
    const averageInherent =
      risks.reduce((sum, r) => sum + (r.inherentScore ?? 0), 0) / risks.length;
    const averageResidual =
      withResidual.length > 0
        ? withResidual.reduce((sum, r) => sum + (r.residualScore ?? 0), 0) /
          withResidual.length
        : 0;
    const reductionPercent =
      averageInherent > 0 && withResidual.length > 0
        ? Math.round(
            ((averageInherent - averageResidual) / averageInherent) * 10000,
          ) / 100
        : 0;
    return {
      averageInherent: Math.round(averageInherent * 100) / 100,
      averageResidual: Math.round(averageResidual * 100) / 100,
      reductionPercent,
      count: risks.length,
    };
  }
}
