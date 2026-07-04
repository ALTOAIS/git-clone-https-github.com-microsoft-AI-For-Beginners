import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { risks: true, children: true } } },
    });
    return categories;
  }

  /** Returns categories nested as a tree, used by the Risk Library screen. */
  async findTree() {
    const all = await this.findAll();
    const byId = new Map(all.map((c) => [c.id, { ...c, children: [] as any[] }]));
    const roots: any[] = [];
    for (const cat of byId.values()) {
      if (cat.parentId && byId.has(cat.parentId)) {
        byId.get(cat.parentId)!.children.push(cat);
      } else {
        roots.push(cat);
      }
    }
    return roots;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  create(data: { name: string; description?: string; parentId?: string }) {
    return this.prisma.category.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string; parentId?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }
}
