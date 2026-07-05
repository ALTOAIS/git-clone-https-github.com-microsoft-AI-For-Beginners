import { Injectable } from '@nestjs/common';
import { ActionStatus, RiskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalysesService } from '../analyses/analyses.service';
import { AnalyticsService } from '../analytics/analytics.service';

const ACTIVE_STATUSES: RiskStatus[] = [
  RiskStatus.NEW,
  RiskStatus.ASSESSMENT,
  RiskStatus.APPROVED,
  RiskStatus.MONITORING,
  RiskStatus.MITIGATION,
  RiskStatus.RESIDUAL_ASSESSMENT,
];

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
    private analyses: AnalysesService,
  ) {}

  async summary() {
    const [
      activeRisks,
      criticalRisks,
      residualRiskSummary,
      overdueActions,
      topCompanies,
      topDepartments,
      topCategories,
      heatMap,
      trends,
      analysesSummary,
    ] = await Promise.all([
      this.prisma.risk.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      this.prisma.risk.count({
        where: { status: { in: ACTIVE_STATUSES }, inherentScore: { gte: 15 } },
      }),
      this.analytics.residualRiskSummary(),
      this.prisma.action.count({
        where: {
          deadline: { lt: new Date() },
          status: { notIn: [ActionStatus.COMPLETED, ActionStatus.CANCELLED] },
        },
      }),
      this.analytics.topCompanies(5),
      this.analytics.topDepartments(5),
      this.analytics.topCategories(5),
      this.analytics.heatmap('inherent'),
      this.analytics.trends(6),
      this.analyses.summary(),
    ]);

    return {
      kpis: {
        activeRisks,
        criticalRisks,
        residualRisks: residualRiskSummary.count,
        overdueActions,
      },
      residualRiskSummary,
      topCompanies,
      topDepartments,
      topCategories,
      heatMap,
      trends,
      analyses: analysesSummary,
    };
  }
}
