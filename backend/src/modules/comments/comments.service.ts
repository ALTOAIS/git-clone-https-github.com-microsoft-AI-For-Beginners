import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findForRisk(riskId: string) {
    return this.prisma.comment.findMany({
      where: { riskId },
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(riskId: string, text: string, authorId?: string) {
    const comment = await this.prisma.comment.create({
      data: { riskId, text, authorId },
      include: { author: { select: { id: true, fullName: true } } },
    });
    await this.audit.record({ entityType: 'RISK', entityId: riskId, action: 'COMMENT', userId: authorId });
    return comment;
  }

  async update(id: string, text: string, userId?: string) {
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Comment not found');
    return this.prisma.comment.update({
      where: { id },
      data: { text },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Comment not found');
    await this.prisma.comment.delete({ where: { id } });
    return { success: true };
  }
}
