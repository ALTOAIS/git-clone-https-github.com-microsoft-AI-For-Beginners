import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findForRisk(riskId: string) {
    return this.prisma.attachment.findMany({
      where: { riskId },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(params: {
    file: Express.Multer.File;
    entityType: EntityType;
    entityId: string;
    riskId?: string;
    uploadedById?: string;
  }) {
    const attachment = await this.prisma.attachment.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        riskId: params.riskId,
        fileName: params.file.originalname,
        storedName: params.file.filename,
        mimeType: params.file.mimetype,
        size: params.file.size,
        uploadedById: params.uploadedById,
      },
    });
    await this.audit.record({
      entityType: params.entityType,
      entityId: params.entityId,
      action: 'ATTACH',
      userId: params.uploadedById,
    });
    return attachment;
  }

  async findOne(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async remove(id: string, uploadDir: string, userId?: string) {
    const attachment = await this.findOne(id);
    await this.prisma.attachment.delete({ where: { id } });
    await unlink(join(uploadDir, attachment.storedName)).catch(() => undefined);
    await this.audit.record({
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      action: 'DELETE_ATTACHMENT',
      userId,
    });
    return { success: true };
  }
}
