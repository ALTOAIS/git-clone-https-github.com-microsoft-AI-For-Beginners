import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Injectable()
export class SourcesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    type?: string;
    search?: string;
  }) {
    const { page, pageSize, type, search } = params;
    const where: any = {
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { referenceNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.source.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { risks: true, incidents: true } } },
      }),
      this.prisma.source.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const source = await this.prisma.source.findUnique({
      where: { id },
      include: {
        risks: {
          include: {
            risk: {
              select: { id: true, code: true, title: true, status: true },
            },
          },
        },
        incidents: true,
      },
    });
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  create(dto: CreateSourceDto, createdById?: string) {
    return this.prisma.source.create({
      data: {
        ...dto,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        createdById,
      },
    });
  }

  async update(id: string, dto: UpdateSourceDto) {
    await this.findOne(id);
    return this.prisma.source.update({
      where: { id },
      data: {
        ...dto,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.source.delete({ where: { id } });
  }

  async linkToRisk(sourceId: string, riskId: string) {
    await this.findOne(sourceId);
    return this.prisma.riskSource.upsert({
      where: { riskId_sourceId: { riskId, sourceId } },
      create: { riskId, sourceId },
      update: {},
    });
  }

  async unlinkFromRisk(sourceId: string, riskId: string) {
    return this.prisma.riskSource.delete({
      where: { riskId_sourceId: { riskId, sourceId } },
    });
  }
}
