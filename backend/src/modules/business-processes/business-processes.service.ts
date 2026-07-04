import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BusinessProcessesService {
  constructor(private prisma: PrismaService) {}

  findAll(departmentId?: string) {
    return this.prisma.businessProcess.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const process = await this.prisma.businessProcess.findUnique({ where: { id } });
    if (!process) throw new NotFoundException('Business process not found');
    return process;
  }

  create(data: { name: string; departmentId: string }) {
    return this.prisma.businessProcess.create({ data });
  }

  async update(id: string, data: { name?: string; departmentId?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.businessProcess.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.businessProcess.update({ where: { id }, data: { isActive: false } });
  }
}
