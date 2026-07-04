import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(companyId?: string) {
    return this.prisma.department.findMany({
      where: companyId ? { companyId } : undefined,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { processes: true, company: { select: { id: true, name: true } } },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  create(data: { name: string; companyId: string }) {
    return this.prisma.department.create({ data });
  }

  async update(id: string, data: { name?: string; companyId?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: { isActive: false } });
  }
}
