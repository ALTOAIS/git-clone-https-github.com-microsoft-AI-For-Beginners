import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseAssignmentStatus, CourseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

const DETAIL_INCLUDE = {
  createdBy: { select: { id: true, fullName: true, email: true } },
  modules: {
    include: { lessons: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
  assignments: {
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      assignedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.CourseInclude;

const LIST_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  _count: { select: { modules: true, assignments: true } },
} satisfies Prisma.CourseInclude;

@Injectable()
export class AcademyService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: {
    page: number;
    pageSize: number;
    status?: CourseStatus;
    search?: string;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CourseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.course.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!course) throw new NotFoundException('Курс не найден');
    return course;
  }

  async create(dto: CreateCourseDto, userId?: string) {
    const course = await this.prisma.course.create({
      data: { ...dto, createdById: userId },
      include: DETAIL_INCLUDE,
    });
    await this.audit.record({
      entityType: 'COURSE',
      entityId: course.id,
      action: 'CREATE',
      userId,
    });
    return course;
  }

  async update(id: string, dto: UpdateCourseDto, userId?: string) {
    await this.findOne(id);
    const course = await this.prisma.course.update({
      where: { id },
      data: dto,
      include: DETAIL_INCLUDE,
    });
    await this.audit.record({
      entityType: 'COURSE',
      entityId: id,
      action: 'UPDATE',
      userId,
    });
    return course;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.course.delete({ where: { id } });
  }

  // ------------------------------------------------------------------
  // Модули и уроки (Конструктор курсов)
  // ------------------------------------------------------------------

  async addModule(courseId: string, dto: CreateModuleDto) {
    await this.findOne(courseId);
    return this.prisma.courseModule.create({
      data: { courseId, ...dto },
      include: { lessons: true },
    });
  }

  async updateModule(courseId: string, moduleId: string, dto: UpdateModuleDto) {
    await this.findOne(courseId);
    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data: dto,
      include: { lessons: true },
    });
  }

  async removeModule(courseId: string, moduleId: string) {
    await this.findOne(courseId);
    return this.prisma.courseModule.delete({ where: { id: moduleId } });
  }

  async addLesson(courseId: string, moduleId: string, dto: CreateLessonDto) {
    await this.findOne(courseId);
    return this.prisma.courseLesson.create({
      data: {
        moduleId,
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async updateLesson(courseId: string, lessonId: string, dto: UpdateLessonDto) {
    await this.findOne(courseId);
    return this.prisma.courseLesson.update({
      where: { id: lessonId },
      data: {
        ...dto,
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: new Date(dto.scheduledAt) }
          : {}),
      },
    });
  }

  async removeLesson(courseId: string, lessonId: string) {
    await this.findOne(courseId);
    return this.prisma.courseLesson.delete({ where: { id: lessonId } });
  }

  // ------------------------------------------------------------------
  // Назначение курса и прогресс
  // ------------------------------------------------------------------

  async assign(courseId: string, dto: CreateAssignmentDto, userId?: string) {
    await this.findOne(courseId);
    const existing = await this.prisma.courseAssignment.findMany({
      where: { courseId, userId: { in: dto.userIds } },
      select: { userId: true },
    });
    const alreadyAssigned = new Set(existing.map((a) => a.userId));
    const newUserIds = dto.userIds.filter((id) => !alreadyAssigned.has(id));

    if (newUserIds.length > 0) {
      await this.prisma.courseAssignment.createMany({
        data: newUserIds.map((assigneeId) => ({
          courseId,
          userId: assigneeId,
          assignedById: userId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        })),
      });
      await this.audit.record({
        entityType: 'COURSE',
        entityId: courseId,
        action: 'ASSIGN',
        userId,
        changes: { userIds: newUserIds },
      });
    }
    return this.findOne(courseId);
  }

  async findAssignment(assignmentId: string) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Назначение не найдено');
    return assignment;
  }

  async updateAssignment(
    courseId: string,
    assignmentId: string,
    dto: UpdateAssignmentDto,
  ) {
    await this.findOne(courseId);
    const completedAt =
      dto.status === CourseAssignmentStatus.COMPLETED ? new Date() : undefined;
    return this.prisma.courseAssignment.update({
      where: { id: assignmentId },
      data: {
        ...dto,
        ...(completedAt ? { completedAt, progressPercent: 100 } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        assignedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async removeAssignment(courseId: string, assignmentId: string) {
    await this.findOne(courseId);
    return this.prisma.courseAssignment.delete({ where: { id: assignmentId } });
  }

  async myAssignments(userId: string) {
    return this.prisma.courseAssignment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            isMandatory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ------------------------------------------------------------------
  // Dashboard Академии
  // ------------------------------------------------------------------

  async summary() {
    const now = new Date();
    const [totalCourses, totalAssigned, completed, overdue, avgProgress] =
      await Promise.all([
        this.prisma.course.count(),
        this.prisma.courseAssignment.count(),
        this.prisma.courseAssignment.count({
          where: { status: CourseAssignmentStatus.COMPLETED },
        }),
        this.prisma.courseAssignment.count({
          where: {
            status: { not: CourseAssignmentStatus.COMPLETED },
            dueDate: { lt: now },
          },
        }),
        this.prisma.courseAssignment.aggregate({
          _avg: { progressPercent: true },
        }),
      ]);
    return {
      totalCourses,
      totalAssigned,
      completed,
      overdue,
      completionPercent:
        totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
      averageProgress: Math.round(avgProgress._avg.progressPercent ?? 0),
    };
  }

  // ------------------------------------------------------------------
  // Календарь обучения
  // ------------------------------------------------------------------

  async calendar() {
    const [deadlines, events] = await Promise.all([
      this.prisma.courseAssignment.findMany({
        where: { dueDate: { not: null } },
        include: {
          course: { select: { id: true, title: true } },
          user: { select: { id: true, fullName: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.courseLesson.findMany({
        where: { scheduledAt: { not: null } },
        include: {
          module: {
            include: { course: { select: { id: true, title: true } } },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);
    return { deadlines, events };
  }

  // ------------------------------------------------------------------
  // Матрица обучения
  // ------------------------------------------------------------------

  async matrix() {
    const courses = await this.prisma.course.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        isMandatory: true,
        applicableRoles: true,
      },
      orderBy: { title: 'asc' },
    });
    const assignments = await this.prisma.courseAssignment.findMany({
      select: {
        courseId: true,
        status: true,
        user: { select: { role: true } },
      },
    });

    const stats: Record<
      string,
      Record<string, { assigned: number; completed: number }>
    > = {};
    for (const a of assignments) {
      const courseStats = (stats[a.courseId] ??= {});
      const roleStats = (courseStats[a.user.role] ??= {
        assigned: 0,
        completed: 0,
      });
      roleStats.assigned += 1;
      if (a.status === CourseAssignmentStatus.COMPLETED)
        roleStats.completed += 1;
    }

    return { courses, stats };
  }
}
