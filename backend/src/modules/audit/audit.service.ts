import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async record(params: {
    entityType: string;
    entityId: string;
    action: string;
    userId?: string | null;
    changes?: Record<string, unknown> | null;
    ipAddress?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        userId: params.userId ?? null,
        changes: params.changes ? (params.changes as any) : undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  }

  async findForEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async findAll(params: {
    page: number;
    pageSize: number;
    entityType?: string;
    userId?: string;
  }) {
    const { page, pageSize, entityType, userId } = params;
    const where = {
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
