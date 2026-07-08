import { Injectable } from '@nestjs/common';
import { ActionStatus, RiskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AcademyService } from '../academy/academy.service';
import { AnalysesService } from '../analyses/analyses.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuditService } from '../audit/audit.service';

const ACTIVE_STATUSES: RiskStatus[] = [
  RiskStatus.NEW,
  RiskStatus.ASSESSMENT,
  RiskStatus.APPROVED,
  RiskStatus.MONITORING,
  RiskStatus.MITIGATION,
  RiskStatus.RESIDUAL_ASSESSMENT,
];

const RECENT_EVENTS_LIMIT = 10;

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
    private analyses: AnalysesService,
    private academy: AcademyService,
    private audit: AuditService,
  ) {}

  async summary() {
    const [
      activeRisks,
      criticalRisks,
      highRisks,
      totalRisks,
      risksWithoutActions,
      residualRiskSummary,
      overdueActions,
      totalActions,
      inProgressActions,
      topCompanies,
      topDepartments,
      topCategories,
      heatMap,
      trends,
      analysesSummary,
      academySummary,
      riskLevelDistribution,
      actionTrends,
      recentEvents,
    ] = await Promise.all([
      this.prisma.risk.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      this.prisma.risk.count({
        where: { status: { in: ACTIVE_STATUSES }, inherentScore: { gte: 15 } },
      }),
      this.prisma.risk.count({
        where: {
          status: { in: ACTIVE_STATUSES },
          inherentScore: { gte: 9, lt: 15 },
        },
      }),
      this.prisma.risk.count(),
      this.prisma.risk.count({
        where: { status: { in: ACTIVE_STATUSES }, actions: { none: {} } },
      }),
      this.analytics.residualRiskSummary(),
      this.prisma.action.count({
        where: {
          deadline: { lt: new Date() },
          status: { notIn: [ActionStatus.COMPLETED, ActionStatus.CANCELLED] },
        },
      }),
      this.prisma.action.count(),
      this.prisma.action.count({ where: { status: ActionStatus.IN_PROGRESS } }),
      this.analytics.topCompanies(5),
      this.analytics.topDepartments(5),
      this.analytics.topCategories(5),
      this.analytics.heatmap('inherent'),
      this.analytics.trends(6),
      this.analyses.summary(),
      this.academy.summary(),
      this.analytics.riskLevelDistribution(),
      this.analytics.actionTrends(6),
      this.recentEvents(RECENT_EVENTS_LIMIT),
    ]);

    return {
      // Existing fields — kept as-is for backward compatibility (no longer
      // rendered on the redesigned home dashboard, but still a valid API
      // shape and reused by AnalyticsPage/ReportsAnalyticsPage where relevant).
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

      // New fields for the redesigned "рабочий кабинет" home dashboard.
      attention: {
        criticalRisks,
        highRisks,
        overdueActions,
        analysesInProgress: analysesSummary.inProgress,
        overdueTraining: academySummary.overdue,
        risksWithoutActions,
      },
      processes: {
        risks: {
          total: totalRisks,
          criticalHigh: criticalRisks + highRisks,
          withoutActions: risksWithoutActions,
        },
        analyses: {
          total: analysesSummary.total,
          inProgress: analysesSummary.inProgress,
          completed: analysesSummary.completed,
        },
        actions: {
          total: totalActions,
          inProgress: inProgressActions,
          overdue: overdueActions,
        },
        academy: {
          assigned: academySummary.totalAssigned,
          completed: academySummary.completed,
          overdue: academySummary.overdue,
        },
      },
      recentEvents,
      analyticsCompact: {
        riskLevelDistribution,
        actionTrends,
        academyProgress: {
          completionPercent: academySummary.completionPercent,
          averageProgress: academySummary.averageProgress,
        },
      },
    };
  }

  /**
   * Recent audit-log activity across the app, with human-readable titles
   * resolved for the entity types most useful on the home dashboard.
   * Deliberately reuses the existing generic AuditLog table rather than
   * introducing a dedicated "activity feed" model.
   */
  private async recentEvents(limit: number) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        // Internal/granular log entries that aren't meaningful standalone
        // "events" for a compliance officer's homepage feed.
        entityType: {
          notIn: [
            'AI_ASSISTANT',
            'ANALYSIS_RISK',
            'RISK_TEMPLATE',
            'COURSE_LESSON',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (logs.length === 0) return [];

    const idsByType = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!idsByType.has(log.entityType)) {
        idsByType.set(log.entityType, new Set());
      }
      idsByType.get(log.entityType)!.add(log.entityId);
    }

    const [risks, analysesList, actions, courses, campaigns, surveys] =
      await Promise.all([
        idsByType.has('RISK')
          ? this.prisma.risk.findMany({
              where: { id: { in: [...idsByType.get('RISK')!] } },
              select: { id: true, code: true, title: true },
            })
          : [],
        idsByType.has('ANALYSIS')
          ? this.prisma.corruptionAnalysis.findMany({
              where: { id: { in: [...idsByType.get('ANALYSIS')!] } },
              select: { id: true, code: true, name: true },
            })
          : [],
        idsByType.has('ACTION')
          ? this.prisma.action.findMany({
              where: { id: { in: [...idsByType.get('ACTION')!] } },
              select: { id: true, title: true },
            })
          : [],
        idsByType.has('COURSE')
          ? this.prisma.course.findMany({
              where: { id: { in: [...idsByType.get('COURSE')!] } },
              select: { id: true, title: true },
            })
          : [],
        idsByType.has('CAMPAIGN')
          ? this.prisma.campaign.findMany({
              where: { id: { in: [...idsByType.get('CAMPAIGN')!] } },
              select: { id: true, title: true },
            })
          : [],
        idsByType.has('SURVEY')
          ? this.prisma.survey.findMany({
              where: { id: { in: [...idsByType.get('SURVEY')!] } },
              select: { id: true, title: true },
            })
          : [],
      ]);

    const labelById = new Map<string, string>();
    for (const r of risks)
      labelById.set(`RISK:${r.id}`, `${r.code} — ${r.title}`);
    for (const a of analysesList) {
      labelById.set(`ANALYSIS:${a.id}`, `${a.code} — ${a.name}`);
    }
    for (const a of actions) labelById.set(`ACTION:${a.id}`, a.title);
    for (const c of courses) labelById.set(`COURSE:${c.id}`, c.title);
    for (const c of campaigns) labelById.set(`CAMPAIGN:${c.id}`, c.title);
    for (const s of surveys) labelById.set(`SURVEY:${s.id}`, s.title);

    return logs.map((log) => ({
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      createdAt: log.createdAt,
      userName: log.user?.fullName ?? null,
      title: labelById.get(`${log.entityType}:${log.entityId}`) ?? null,
    }));
  }
}
