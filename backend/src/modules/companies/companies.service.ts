import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { departments: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  create(data: { name: string; description?: string }) {
    return this.prisma.company.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data: { isActive: false } });
  }
}
