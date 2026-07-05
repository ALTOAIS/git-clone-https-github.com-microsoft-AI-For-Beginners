import { Injectable } from '@nestjs/common';
import { ActionStatus, RiskStatus } from '@prisma/client';
import {
  ACTION_STATUS_LABELS_RU,
  SOURCE_TYPE_LABELS_RU,
} from '../../common/ru-labels';
import { PrismaService } from '../../prisma/prisma.service';
import { RISK_STATUS_LABELS_RU } from '../risks/risks.constants';
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
      status: RISK_STATUS_LABELS_RU[r.status],
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
      status: ACTION_STATUS_LABELS_RU[a.status],
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
      status: RISK_STATUS_LABELS_RU[r.status],
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
      status: ACTION_STATUS_LABELS_RU[a.status],
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
            { id: 'code', title: 'Код' },
            { id: 'title', title: 'Наименование' },
            { id: 'status', title: 'Статус' },
            { id: 'category', title: 'Категория' },
            { id: 'company', title: 'Компания' },
            { id: 'department', title: 'Департамент' },
            { id: 'owner', title: 'Владелец риска' },
            { id: 'likelihood', title: 'Вероятность' },
            { id: 'impact', title: 'Воздействие' },
            { id: 'inherentScore', title: 'Присущий риск (балл)' },
            { id: 'residualScore', title: 'Остаточный риск (балл)' },
            {
              id: 'controlEffectivenessAvg',
              title: 'Эффективность контролей, %',
            },
            { id: 'createdAt', title: 'Дата создания' },
          ],
          rows: await this.riskRegisterRows(),
        };
      case 'action-plan':
        return {
          columns: [
            { id: 'riskCode', title: 'Код риска' },
            { id: 'riskTitle', title: 'Наименование риска' },
            { id: 'title', title: 'Мероприятие' },
            { id: 'owner', title: 'Ответственный' },
            { id: 'deadline', title: 'Срок исполнения' },
            { id: 'status', title: 'Статус' },
            { id: 'result', title: 'Результат' },
          ],
          rows: await this.actionPlanRows(),
        };
      case 'critical-risks':
        return {
          columns: [
            { id: 'code', title: 'Код' },
            { id: 'title', title: 'Наименование' },
            { id: 'company', title: 'Компания' },
            { id: 'department', title: 'Департамент' },
            { id: 'owner', title: 'Владелец риска' },
            { id: 'inherentScore', title: 'Присущий риск (балл)' },
            { id: 'status', title: 'Статус' },
          ],
          rows: await this.criticalRiskRows(),
        };
      case 'overdue-actions':
        return {
          columns: [
            { id: 'riskCode', title: 'Код риска' },
            { id: 'title', title: 'Мероприятие' },
            { id: 'owner', title: 'Ответственный' },
            { id: 'deadline', title: 'Срок исполнения' },
            { id: 'status', title: 'Статус' },
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
      'Отчёт для Совета директоров — CRH',
      new Date().toLocaleDateString('ru-RU'),
      [
        {
          heading: 'Краткое резюме',
          lines: [
            `Активные риски на этапе оценки остаточного риска: ${residual.count}`,
            `Средний балл присущего риска: ${residual.averageInherent}`,
            `Средний балл остаточного риска: ${residual.averageResidual}`,
            `Снижение остаточного риска: ${residual.reductionPercent}%`,
          ],
        },
        {
          heading: 'Компании с наибольшим числом активных рисков',
          table: {
            headers: ['Компания', 'Риски'],
            rows: topCompanies.map((c) => [c.name ?? 'Не указано', c.count]),
          },
        },
        {
          heading: 'Департаменты с наибольшим числом активных рисков',
          table: {
            headers: ['Департамент', 'Риски'],
            rows: topDepartments.map((d) => [d.name ?? 'Не указано', d.count]),
          },
        },
        {
          heading: 'Критические риски',
          table: {
            headers: ['Код', 'Наименование', 'Балл', 'Статус'],
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
      'Отчёт для Комитета по аудиту — CRH',
      new Date().toLocaleDateString('ru-RU'),
      [
        {
          heading: 'Обзор эффективности контролей',
          lines: [
            `Эффективны: ${controlEff.EFFECTIVE}`,
            `Частично эффективны: ${controlEff.PARTIALLY_EFFECTIVE}`,
            `Неэффективны: ${controlEff.INEFFECTIVE}`,
            `Не проверялись: ${controlEff.NOT_TESTED}`,
          ],
        },
        {
          heading: 'Критические риски, требующие внимания',
          table: {
            headers: ['Код', 'Наименование', 'Компания', 'Департамент', 'Балл'],
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
          heading: 'Просроченные мероприятия плана действий',
          table: {
            headers: [
              'Риск',
              'Мероприятие',
              'Ответственный',
              'Срок исполнения',
            ],
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
      'Комплаенс-отчёт — CRH',
      new Date().toLocaleDateString('ru-RU'),
      [
        {
          heading: 'Динамика рисков (последние 6 месяцев)',
          table: {
            headers: ['Месяц', 'Создано', 'Закрыто'],
            rows: trends.map((t) => [t.month, t.created, t.closed]),
          },
        },
        {
          heading: 'Основные источники рисков',
          table: {
            headers: ['Источник', 'Тип', 'Связанные риски'],
            rows: topSources.map((s) => [
              s.title ?? '',
              s.type ? SOURCE_TYPE_LABELS_RU[s.type] : '',
              s.count,
            ]),
          },
        },
        {
          heading: 'Основные категории рисков',
          table: {
            headers: ['Категория', 'Активные риски'],
            rows: topCategories.map((c) => [c.name ?? 'Не указано', c.count]),
          },
        },
      ],
    );
  }
}
