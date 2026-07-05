import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RisksService } from '../risks/risks.service';
import { CreateControlDto } from './dto/create-control.dto';
import { UpdateControlDto } from './dto/update-control.dto';

@Injectable()
export class ControlsService {
  constructor(
    private prisma: PrismaService,
    private risksService: RisksService,
    private audit: AuditService,
  ) {}

  findAllForRisk(riskId?: string) {
    return this.prisma.control.findMany({
      where: riskId ? { riskId } : undefined,
      include: {
        owner: { select: { id: true, fullName: true } },
        risk: { select: { id: true, code: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const control = await this.prisma.control.findUnique({ where: { id } });
    if (!control)
      throw new NotFoundException('Контрольное мероприятие не найдено');
    return control;
  }

  async create(dto: CreateControlDto, userId?: string) {
    const control = await this.prisma.control.create({
      data: {
        ...dto,
        lastTestedAt: dto.lastTestedAt ? new Date(dto.lastTestedAt) : undefined,
      },
    });
    await this.risksService.recomputeControlEffectiveness(dto.riskId);
    await this.audit.record({
      entityType: 'CONTROL',
      entityId: control.id,
      action: 'CREATE',
      userId,
    });
    return control;
  }

  async update(id: string, dto: UpdateControlDto, userId?: string) {
    const existing = await this.findOne(id);
    const control = await this.prisma.control.update({
      where: { id },
      data: {
        ...dto,
        lastTestedAt: dto.lastTestedAt ? new Date(dto.lastTestedAt) : undefined,
      },
    });
    await this.risksService.recomputeControlEffectiveness(existing.riskId);
    await this.audit.record({
      entityType: 'CONTROL',
      entityId: id,
      action: 'UPDATE',
      userId,
      changes: dto as any,
    });
    return control;
  }

  async remove(id: string, userId?: string) {
    const existing = await this.findOne(id);
    await this.prisma.control.delete({ where: { id } });
    await this.risksService.recomputeControlEffectiveness(existing.riskId);
    await this.audit.record({
      entityType: 'CONTROL',
      entityId: id,
      action: 'DELETE',
      userId,
    });
    return { success: true };
  }
}
