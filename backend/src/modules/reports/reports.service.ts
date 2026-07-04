import { Injectable } from '@nestjs/common';
import { ActionStatus, RiskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { toCsv, toXlsx } from './export.util';
import { buildPdfReport } from './pdf.util';

const ACTIVE_STATUSES: RiskStatus[] = [
  RiskStatus.NEW,
  RiskStatus.ASSESSMENT,
  RiskStatus.APPROVED,
  RiskStatus.MONITORING,
  RiskStatus.MITIGATION,
  RiskStatus.RESIDUAL_ASSESSMENT,
];

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
  ) {}

  async riskRegisterRows() {
    const risks = await this.prisma.risk.findMany({
      include: {
        category: { select: { name: true } },
        company: { select: { name: true } },
        department: { select: { name: true } },
        owner: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return risks.map((r) => ({
      code: r.code,
      title: r.title,
      status: r.status,
      category: r.category?.name ?? '',
      company: r.company?.name ?? '',
      department: r.department?.name ?? '',
      owner: r.owner?.fullName ?? '',
      likelihood: r.likelihood ?? '',
      impact: r.impact ?? '',
      inherentScore: r.inherentScore ?? '',
      residualScore: r.residualScore ?? '',
      controlEffectivenessAvg: r.controlEffectivenessAvg ?? '',
      createdAt: r.createdAt.toISOString().slice(0, 10),
    }));
  }

  async actionPlanRows() {
    const actions = await this.prisma.action.findMany({
      include: {
        risk: { select: { code: true, title: true } },
        owner: { select: { fullName: true } },
      },
      orderBy: { deadline: 'asc' },
    });
    return actions.map((a) => ({
      riskCode: a.risk?.code ?? '',
      riskTitle: a.risk?.title ?? '',
      title: a.title,
      owner: a.owner?.fullName ?? '',
      deadline: a.deadline ? a.deadline.toISOString().slice(0, 10) : '',
      status: a.status,
      result: a.result ?? '',
    }));
  }

  async criticalRiskRows() {
    const risks = await this.prisma.risk.findMany({
      where: { status: { in: ACTIVE_STATUSES }, inherentScore: { gte: 15 } },
      include: {
        company: { select: { name: true } },
        department: { select: { name: true } },
        owner: { select: { fullName: true } },
      },
      orderBy: { inherentScore: 'desc' },
    });
    return risks.map((r) => ({
      code: r.code,
      title: r.title,
      company: r.company?.name ?? '',
      department: r.department?.name ?? '',
      owner: r.owner?.fullName ?? '',
      inherentScore: r.inherentScore ?? '',
      status: r.status,
    }));
  }

  async overdueActionRows() {
    const actions = await this.prisma.action.findMany({
      where: {
        deadline: { lt: new Date() },
        status: { notIn: [ActionStatus.COMPLETED, ActionStatus.CANCELLED] },
      },
      include: {
        risk: { select: { code: true, title: true } },
        owner: { select: { fullName: true } },
      },
      orderBy: { deadline: 'asc' },
    });
    return actions.map((a) => ({
      riskCode: a.risk?.code ?? '',
      title: a.title,
      owner: a.owner?.fullName ?? '',
      deadline: a.deadline ? a.deadline.toISOString().slice(0, 10) : '',
      status: a.status,
    }));
  }

  async exportCsv(
    kind:
      'risk-register' | 'action-plan' | 'critical-risks' | 'overdue-actions',
  ) {
    const { columns, rows } = await this.resolveTable(kind);
    return toCsv(columns, rows);
  }

  async exportXlsx(
    kind:
      'risk-register' | 'action-plan' | 'critical-risks' | 'overdue-actions',
  ) {
    const { columns, rows } = await this.resolveTable(kind);
    return toXlsx(kind, columns, rows);
  }

  private async resolveTable(
    kind:
      'risk-register' | 'action-plan' | 'critical-risks' | 'overdue-actions',
  ) {
    switch (kind) {
      case 'risk-register':
        return {
          columns: [
            { id: 'code', title: 'Code' },
            { id: 'title', title: 'Title' },
            { id: 'status', title: 'Status' },
            { id: 'category', title: 'Category' },
            { id: 'company', title: 'Company' },
            { id: 'department', title: 'Department' },
            { id: 'owner', title: 'Owner' },
            { id: 'likelihood', title: 'Likelihood' },
            { id: 'impact', title: 'Impact' },
            { id: 'inherentScore', title: 'Inherent Score' },
            { id: 'residualScore', title: 'Residual Score' },
            { id: 'controlEffectivenessAvg', title: 'Control Effectiveness %' },
            { id: 'createdAt', title: 'Created' },
          ],
          rows: await this.riskRegisterRows(),
        };
      case 'action-plan':
        return {
          columns: [
            { id: 'riskCode', title: 'Risk Code' },
            { id: 'riskTitle', title: 'Risk Title' },
            { id: 'title', title: 'Action' },
            { id: 'owner', title: 'Owner' },
            { id: 'deadline', title: 'Deadline' },
            { id: 'status', title: 'Status' },
            { id: 'result', title: 'Result' },
          ],
          rows: await this.actionPlanRows(),
        };
      case 'critical-risks':
        return {
          columns: [
            { id: 'code', title: 'Code' },
            { id: 'title', title: 'Title' },
            { id: 'company', title: 'Company' },
            { id: 'department', title: 'Department' },
            { id: 'owner', title: 'Owner' },
            { id: 'inherentScore', title: 'Inherent Score' },
            { id: 'status', title: 'Status' },
          ],
          rows: await this.criticalRiskRows(),
        };
      case 'overdue-actions':
        return {
          columns: [
            { id: 'riskCode', title: 'Risk Code' },
            { id: 'title', title: 'Action' },
            { id: 'owner', title: 'Owner' },
            { id: 'deadline', title: 'Deadline' },
            { id: 'status', title: 'Status' },
          ],
          rows: await this.overdueActionRows(),
        };
    }
  }

  async boardReportPdf() {
    const [criticalRows, residual, topCompanies, topDepartments] =
      await Promise.all([
        this.criticalRiskRows(),
        this.analytics.residualRiskSummary(),
        this.analytics.topCompanies(5),
        this.analytics.topDepartments(5),
      ]);

    return buildPdfReport(
      'Board Report — Compliance Risk Hub',
      new Date().toDateString(),
      [
        {
          heading: 'Executive Summary',
          lines: [
            `Active risks under residual assessment: ${residual.count}`,
            `Average inherent score: ${residual.averageInherent}`,
            `Average residual score: ${residual.averageResidual}`,
            `Residual risk reduction: ${residual.reductionPercent}%`,
          ],
        },
        {
          heading: 'Top Companies by Active Risk Count',
          table: {
            headers: ['Company', 'Risks'],
            rows: topCompanies.map((c) => [c.name ?? 'Unknown', c.count]),
          },
        },
        {
          heading: 'Top Departments by Active Risk Count',
          table: {
            headers: ['Department', 'Risks'],
            rows: topDepartments.map((d) => [d.name ?? 'Unknown', d.count]),
          },
        },
        {
          heading: 'Critical Risks',
          table: {
            headers: ['Code', 'Title', 'Score', 'Status'],
            rows: criticalRows.map((r) => [
              r.code,
              r.title,
              r.inherentScore,
              r.status,
            ]),
          },
        },
      ],
    );
  }

  async auditCommitteeReportPdf() {
    const [criticalRows, controlEff, overdue] = await Promise.all([
      this.criticalRiskRows(),
      this.analytics.controlEffectiveness(),
      this.overdueActionRows(),
    ]);

    return buildPdfReport(
      'Audit Committee Report — Compliance Risk Hub',
      new Date().toDateString(),
      [
        {
          heading: 'Control Effectiveness Overview',
          lines: [
            `Effective: ${controlEff.EFFECTIVE}`,
            `Partially effective: ${controlEff.PARTIALLY_EFFECTIVE}`,
            `Ineffective: ${controlEff.INEFFECTIVE}`,
            `Not tested: ${controlEff.NOT_TESTED}`,
          ],
        },
        {
          heading: 'Critical Risks Requiring Attention',
          table: {
            headers: ['Code', 'Title', 'Company', 'Department', 'Score'],
            rows: criticalRows.map((r) => [
              r.code,
              r.title,
              r.company,
              r.department,
              r.inherentScore,
            ]),
          },
        },
        {
          heading: 'Overdue Action Plans',
          table: {
            headers: ['Risk', 'Action', 'Owner', 'Deadline'],
            rows: overdue.map((a) => [
              a.riskCode,
              a.title,
              a.owner,
              a.deadline,
            ]),
          },
        },
      ],
    );
  }

  async complianceReportPdf() {
    const [trends, topSources, topCategories] = await Promise.all([
      this.analytics.trends(6),
      this.analytics.topSources(5),
      this.analytics.topCategories(5),
    ]);

    return buildPdfReport(
      'Compliance Report — Compliance Risk Hub',
      new Date().toDateString(),
      [
        {
          heading: 'Risk Trend (last 6 months)',
          table: {
            headers: ['Month', 'Created', 'Closed'],
            rows: trends.map((t) => [t.month, t.created, t.closed]),
          },
        },
        {
          heading: 'Top Risk Sources',
          table: {
            headers: ['Source', 'Type', 'Linked Risks'],
            rows: topSources.map((s) => [s.title ?? '', s.type ?? '', s.count]),
          },
        },
        {
          heading: 'Top Risk Categories',
          table: {
            headers: ['Category', 'Active Risks'],
            rows: topCategories.map((c) => [c.name ?? 'Unknown', c.count]),
          },
        },
      ],
    );
  }
}
