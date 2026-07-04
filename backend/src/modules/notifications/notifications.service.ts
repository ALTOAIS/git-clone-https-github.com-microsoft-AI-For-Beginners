import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActionStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionsService } from '../actions/actions.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private actionsService: ActionsService,
  ) {}

  findForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.prisma.notification.create({ data: params });
  }

  /** Daily sweep: flips overdue actions and notifies their owners; also warns owners of actions due within 3 days. */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailySweep() {
    await this.actionsService.markOverdue();

    const overdue = await this.prisma.action.findMany({
      where: { status: ActionStatus.OVERDUE, ownerId: { not: null } },
      include: { risk: { select: { code: true, title: true } } },
    });
    for (const action of overdue) {
      await this.createIfNotDuplicate(
        action.ownerId!,
        NotificationType.ACTION_OVERDUE,
        {
          title: 'Action plan overdue',
          message: `"${action.title}" for risk ${action.risk?.code ?? ''} is overdue.`,
          link: `/risks/${action.riskId}`,
        },
      );
    }

    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const dueSoon = await this.prisma.action.findMany({
      where: {
        status: { in: [ActionStatus.PLANNED, ActionStatus.IN_PROGRESS] },
        deadline: { gte: new Date(), lte: soon },
        ownerId: { not: null },
      },
      include: { risk: { select: { code: true, title: true } } },
    });
    for (const action of dueSoon) {
      await this.createIfNotDuplicate(
        action.ownerId!,
        NotificationType.ACTION_DUE_SOON,
        {
          title: 'Action plan due soon',
          message: `"${action.title}" for risk ${action.risk?.code ?? ''} is due within 3 days.`,
          link: `/risks/${action.riskId}`,
        },
      );
    }

    this.logger.log(
      `Notification sweep: ${overdue.length} overdue, ${dueSoon.length} due soon`,
    );
  }

  private async createIfNotDuplicate(
    userId: string,
    type: NotificationType,
    payload: { title: string; message: string; link?: string },
  ) {
    const existing = await this.prisma.notification.findFirst({
      where: { userId, type, message: payload.message, isRead: false },
    });
    if (existing) return existing;
    return this.create({ userId, type, ...payload });
  }
}
