import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseAssignmentStatus,
  CourseStatus,
  EntityType,
  Prisma,
  TestQuestionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { AuditService } from '../audit/audit.service';
import { CertificatesService } from '../certificates/certificates.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateTestDto } from './dto/create-test.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateTestDto } from './dto/update-test.dto';

const TEST_DETAIL_INCLUDE = {
  questions: {
    include: { options: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.TestInclude;

const DETAIL_INCLUDE = {
  createdBy: { select: { id: true, fullName: true, email: true } },
  applicableDepartments: { select: { id: true, name: true } },
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
  applicableDepartments: { select: { id: true, name: true } },
  _count: { select: { modules: true, assignments: true } },
} satisfies Prisma.CourseInclude;

@Injectable()
export class AcademyService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private certificates: CertificatesService,
    private attachments: AttachmentsService,
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
    const { applicableDepartmentIds, ...rest } = dto;
    const course = await this.prisma.course.create({
      data: {
        ...rest,
        createdById: userId,
        applicableDepartments: applicableDepartmentIds
          ? { connect: applicableDepartmentIds.map((id) => ({ id })) }
          : undefined,
      },
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
    const before = await this.findOne(id);
    if (
      dto.status === CourseStatus.PUBLISHED &&
      before.status !== CourseStatus.PUBLISHED &&
      before.modules.every((m) => m.lessons.length === 0)
    ) {
      throw new BadRequestException(
        'Нельзя опубликовать курс без уроков — добавьте содержание перед публикацией',
      );
    }
    const { applicableDepartmentIds, ...rest } = dto;
    const course = await this.prisma.course.update({
      where: { id },
      data: {
        ...rest,
        applicableDepartments: applicableDepartmentIds
          ? { set: applicableDepartmentIds.map((deptId) => ({ id: deptId })) }
          : undefined,
      },
      include: DETAIL_INCLUDE,
    });
    let action = 'UPDATE';
    if (dto.status && dto.status !== before.status) {
      if (dto.status === CourseStatus.PUBLISHED) action = 'PUBLISH';
      else if (before.status === CourseStatus.PUBLISHED) action = 'UNPUBLISH';
    }
    await this.audit.record({
      entityType: 'COURSE',
      entityId: id,
      action,
      userId,
    });
    return course;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.course.delete({ where: { id } });
  }

  async getPreview(id: string) {
    const course = await this.findOne(id);
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const attachments = await this.attachments.findForEntities(
      EntityType.COURSE_LESSON,
      lessonIds,
    );
    const byLesson = new Map<string, typeof attachments>();
    for (const attachment of attachments) {
      const list = byLesson.get(attachment.entityId) ?? [];
      list.push(attachment);
      byLesson.set(attachment.entityId, list);
    }
    return {
      ...course,
      modules: course.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          ...l,
          attachments: byLesson.get(l.id) ?? [],
        })),
      })),
    };
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

  private async resolveTargetUserIds(
    dto: CreateAssignmentDto,
  ): Promise<string[]> {
    const ids = new Set(dto.userIds ?? []);
    if (dto.departmentIds?.length) {
      const rows = await this.prisma.user.findMany({
        where: { isActive: true, departmentId: { in: dto.departmentIds } },
        select: { id: true },
      });
      rows.forEach((r) => ids.add(r.id));
    }
    if (dto.roles?.length) {
      const rows = await this.prisma.user.findMany({
        where: { isActive: true, role: { in: dto.roles } },
        select: { id: true },
      });
      rows.forEach((r) => ids.add(r.id));
    }
    if (dto.companyIds?.length) {
      const rows = await this.prisma.user.findMany({
        where: { isActive: true, companyId: { in: dto.companyIds } },
        select: { id: true },
      });
      rows.forEach((r) => ids.add(r.id));
    }
    if (ids.size === 0) {
      throw new BadRequestException('Не указаны получатели назначения');
    }
    return [...ids];
  }

  async assign(courseId: string, dto: CreateAssignmentDto, userId?: string) {
    await this.findOne(courseId);
    const targetUserIds = await this.resolveTargetUserIds(dto);
    const existing = await this.prisma.courseAssignment.findMany({
      where: { courseId, userId: { in: targetUserIds } },
      select: { userId: true },
    });
    const alreadyAssigned = new Set(existing.map((a) => a.userId));
    const newUserIds = targetUserIds.filter((id) => !alreadyAssigned.has(id));

    if (newUserIds.length > 0) {
      await this.prisma.courseAssignment.createMany({
        data: newUserIds.map((assigneeId) => ({
          courseId,
          userId: assigneeId,
          assignedById: userId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        })),
      });
      await this.audit.record({
        entityType: 'COURSE',
        entityId: courseId,
        action: 'ASSIGN',
        userId,
        changes: {
          userIds: newUserIds,
          criteria: {
            departmentIds: dto.departmentIds,
            roles: dto.roles,
            companyIds: dto.companyIds,
          },
        },
      });
    }
    return this.findOne(courseId);
  }

  async updateAssignment(
    courseId: string,
    assignmentId: string,
    dto: UpdateAssignmentDto,
  ) {
    await this.findOne(courseId);
    const completedAt =
      dto.status === CourseAssignmentStatus.COMPLETED ? new Date() : undefined;
    const updated = await this.prisma.courseAssignment.update({
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
    if (dto.status === CourseAssignmentStatus.COMPLETED) {
      await this.certificates.issueIfEligible(courseId, updated.userId);
    }
    return updated;
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
  // Курс-плеер и прогресс прохождения
  // ------------------------------------------------------------------

  private async recalculateAssignmentProgress(
    courseId: string,
    userId: string,
  ) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });
    if (!assignment) return undefined;

    const modules = await this.prisma.courseModule.findMany({
      where: { courseId },
      include: { lessons: { select: { id: true } } },
    });
    const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    const test = await this.prisma.test.findUnique({ where: { courseId } });

    const completedLessons = lessonIds.length
      ? await this.prisma.lessonProgress.count({
          where: { userId, lessonId: { in: lessonIds } },
        })
      : 0;

    let testPassed = false;
    if (test) {
      const passingAttempt = await this.prisma.testAttempt.findFirst({
        where: { testId: test.id, userId, passed: true },
      });
      testPassed = !!passingAttempt;
    }

    const totalItems = lessonIds.length + (test ? 1 : 0);
    const completedItems = completedLessons + (testPassed ? 1 : 0);
    const progressPercent =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    let status: CourseAssignmentStatus = CourseAssignmentStatus.NOT_STARTED;
    if (totalItems > 0 && completedItems >= totalItems) {
      status = CourseAssignmentStatus.COMPLETED;
    } else if (completedItems > 0) {
      status = CourseAssignmentStatus.IN_PROGRESS;
    }

    const justCompleted =
      status === CourseAssignmentStatus.COMPLETED &&
      assignment.status !== CourseAssignmentStatus.COMPLETED;

    const updated = await this.prisma.courseAssignment.update({
      where: { id: assignment.id },
      data: {
        progressPercent,
        status,
        completedAt: justCompleted ? new Date() : assignment.completedAt,
      },
    });

    if (justCompleted) {
      await this.audit.record({
        entityType: 'COURSE',
        entityId: courseId,
        action: 'COMPLETE',
        userId,
      });
      await this.certificates.issueIfEligible(courseId, userId);
    }

    return updated;
  }

  async markLessonComplete(courseId: string, lessonId: string, userId: string) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });
    if (!assignment) throw new NotFoundException('Курс вам не назначен');

    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson || lesson.module.courseId !== courseId) {
      throw new NotFoundException('Урок не найден в этом курсе');
    }

    await this.prisma.lessonProgress.upsert({
      where: { lessonId_userId: { lessonId, userId } },
      create: { lessonId, userId },
      update: {},
    });

    return this.recalculateAssignmentProgress(courseId, userId);
  }

  async getPlayerData(courseId: string, userId: string) {
    const assignment = await this.prisma.courseAssignment.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });
    if (!assignment) throw new NotFoundException('Курс вам не назначен');

    const course = await this.findOne(courseId);
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));

    const [attachments, progressRows, test] = await Promise.all([
      this.attachments.findForEntities(EntityType.COURSE_LESSON, lessonIds),
      lessonIds.length
        ? this.prisma.lessonProgress.findMany({
            where: { userId, lessonId: { in: lessonIds } },
            select: { lessonId: true },
          })
        : Promise.resolve([]),
      this.prisma.test.findUnique({ where: { courseId } }),
    ]);

    const byLesson = new Map<string, typeof attachments>();
    for (const attachment of attachments) {
      const list = byLesson.get(attachment.entityId) ?? [];
      list.push(attachment);
      byLesson.set(attachment.entityId, list);
    }
    const completedLessonIds = new Set(progressRows.map((p) => p.lessonId));

    let testSummary: {
      id: string;
      title: string;
      passed: boolean;
      attempted: boolean;
    } | null = null;
    if (test) {
      const attempts = await this.prisma.testAttempt.findMany({
        where: { testId: test.id, userId },
      });
      testSummary = {
        id: test.id,
        title: test.title,
        passed: attempts.some((a) => a.passed),
        attempted: attempts.length > 0,
      };
    }

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
      },
      modules: course.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          ...l,
          completed: completedLessonIds.has(l.id),
          attachments: byLesson.get(l.id) ?? [],
        })),
      })),
      assignment: {
        id: assignment.id,
        status: assignment.status,
        progressPercent: assignment.progressPercent,
        startDate: assignment.startDate,
        dueDate: assignment.dueDate,
        completedAt: assignment.completedAt,
      },
      test: testSummary,
    };
  }

  // ------------------------------------------------------------------
  // Dashboard Академии
  // ------------------------------------------------------------------

  async summary() {
    const now = new Date();
    const [
      totalCourses,
      totalAssigned,
      completed,
      overdue,
      avgProgress,
      certificatesIssued,
      activeCampaignsCount,
      assignmentsByCourse,
      attemptsByTest,
    ] = await Promise.all([
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
      this.prisma.certificate.count(),
      this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      this.prisma.courseAssignment.groupBy({
        by: ['courseId', 'status'],
        _count: { _all: true },
      }),
      this.prisma.testAttempt.groupBy({
        by: ['testId'],
        _avg: { scorePercent: true },
        _count: { _all: true },
      }),
    ]);

    const courseTotals = new Map<
      string,
      { assigned: number; completed: number }
    >();
    for (const row of assignmentsByCourse) {
      const entry = courseTotals.get(row.courseId) ?? {
        assigned: 0,
        completed: 0,
      };
      entry.assigned += row._count._all;
      if (row.status === CourseAssignmentStatus.COMPLETED)
        entry.completed += row._count._all;
      courseTotals.set(row.courseId, entry);
    }
    const lowCompletionCourseIds = [...courseTotals.entries()]
      .filter(([, v]) => v.assigned >= 3 && v.completed / v.assigned < 0.5)
      .map(([courseId]) => courseId);
    const lowCompletionCoursesData = lowCompletionCourseIds.length
      ? await this.prisma.course.findMany({
          where: { id: { in: lowCompletionCourseIds } },
          select: { id: true, title: true },
        })
      : [];
    const lowCompletionCourses = lowCompletionCoursesData
      .map((c) => {
        const t = courseTotals.get(c.id)!;
        return {
          id: c.id,
          title: c.title,
          completionPercent: Math.round((t.completed / t.assigned) * 100),
        };
      })
      .sort((a, b) => a.completionPercent - b.completionPercent)
      .slice(0, 5);

    const lowScoreTestIds = attemptsByTest
      .filter(
        (row) => row._count._all >= 1 && (row._avg.scorePercent ?? 0) < 60,
      )
      .map((row) => row.testId);
    const lowScoreTestsData = lowScoreTestIds.length
      ? await this.prisma.test.findMany({
          where: { id: { in: lowScoreTestIds } },
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
            lesson: {
              select: {
                title: true,
                module: { select: { course: { select: { id: true } } } },
              },
            },
          },
        })
      : [];
    const attemptStatsByTestId = new Map(
      attemptsByTest.map((row) => [row.testId, row]),
    );
    const lowScoreTests = lowScoreTestsData
      .map((test) => {
        const stats = attemptStatsByTestId.get(test.id)!;
        return {
          id: test.id,
          title: test.title,
          courseId: test.course?.id ?? test.lesson?.module.course.id ?? null,
          courseTitle: test.course?.title ?? test.lesson?.title ?? null,
          averageScore: Math.round(stats._avg.scorePercent ?? 0),
          attemptsCount: stats._count._all,
        };
      })
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 5);

    return {
      totalCourses,
      totalAssigned,
      completed,
      overdue,
      completionPercent:
        totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
      averageProgress: Math.round(avgProgress._avg.progressPercent ?? 0),
      certificatesIssued,
      activeCampaignsCount,
      lowCompletionCourses,
      lowScoreTests,
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
    const [courses, departments, assignments] = await Promise.all([
      this.prisma.course.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          isMandatory: true,
          applicableRoles: true,
          applicableDepartments: { select: { id: true, name: true } },
        },
        orderBy: { title: 'asc' },
      }),
      this.prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.courseAssignment.findMany({
        select: {
          courseId: true,
          status: true,
          user: { select: { role: true, departmentId: true } },
        },
      }),
    ]);

    const stats: Record<
      string,
      Record<string, { assigned: number; completed: number }>
    > = {};
    const departmentStats: Record<
      string,
      Record<string, { assigned: number; completed: number }>
    > = {};
    for (const a of assignments) {
      const completed = a.status === CourseAssignmentStatus.COMPLETED;

      const courseStats = (stats[a.courseId] ??= {});
      const roleStats = (courseStats[a.user.role] ??= {
        assigned: 0,
        completed: 0,
      });
      roleStats.assigned += 1;
      if (completed) roleStats.completed += 1;

      if (a.user.departmentId) {
        const courseDeptStats = (departmentStats[a.courseId] ??= {});
        const deptStats = (courseDeptStats[a.user.departmentId] ??= {
          assigned: 0,
          completed: 0,
        });
        deptStats.assigned += 1;
        if (completed) deptStats.completed += 1;
      }
    }

    return { courses, departments, stats, departmentStats };
  }

  // ------------------------------------------------------------------
  // Тестирование и Проверка знаний
  // ------------------------------------------------------------------

  async getTest(courseId: string) {
    await this.findOne(courseId);
    const test = await this.prisma.test.findUnique({
      where: { courseId },
      include: TEST_DETAIL_INCLUDE,
    });
    if (!test)
      throw new NotFoundException('Тест для этого курса ещё не создан');
    return test;
  }

  async getTestForAttempt(courseId: string) {
    const test = await this.getTest(courseId);
    return {
      id: test.id,
      courseId: test.courseId,
      title: test.title,
      passScorePercent: test.passScorePercent,
      questions: test.questions.map((q) => ({
        id: q.id,
        order: q.order,
        type: q.type,
        text: q.text,
        points: q.points,
        options: q.options.map((o) => ({
          id: o.id,
          order: o.order,
          text: o.text,
        })),
      })),
    };
  }

  async createTest(courseId: string, dto: CreateTestDto) {
    await this.findOne(courseId);
    const existing = await this.prisma.test.findUnique({ where: { courseId } });
    if (existing)
      throw new BadRequestException('Тест для этого курса уже создан');
    return this.prisma.test.create({
      data: { courseId, ...dto },
      include: TEST_DETAIL_INCLUDE,
    });
  }

  async updateTest(courseId: string, dto: UpdateTestDto) {
    const test = await this.getTest(courseId);
    return this.prisma.test.update({
      where: { id: test.id },
      data: dto,
      include: TEST_DETAIL_INCLUDE,
    });
  }

  async removeTest(courseId: string) {
    const test = await this.getTest(courseId);
    return this.prisma.test.delete({ where: { id: test.id } });
  }

  async addQuestion(courseId: string, dto: CreateQuestionDto) {
    const test = await this.getTest(courseId);
    return this.prisma.testQuestion.create({
      data: {
        testId: test.id,
        order: dto.order,
        type: dto.type,
        text: dto.text,
        points: dto.points,
        correctAnswerText: dto.correctAnswerText,
        options: dto.options ? { create: dto.options } : undefined,
      },
      include: { options: true },
    });
  }

  async updateQuestion(
    courseId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ) {
    await this.getTest(courseId);
    return this.prisma.testQuestion.update({
      where: { id: questionId },
      data: {
        order: dto.order,
        type: dto.type,
        text: dto.text,
        points: dto.points,
        correctAnswerText: dto.correctAnswerText,
        ...(dto.options
          ? { options: { deleteMany: {}, create: dto.options } }
          : {}),
      },
      include: { options: true },
    });
  }

  async removeQuestion(courseId: string, questionId: string) {
    await this.getTest(courseId);
    return this.prisma.testQuestion.delete({ where: { id: questionId } });
  }

  private gradeQuestion(
    question: Prisma.TestQuestionGetPayload<{ include: { options: true } }>,
    submitted: unknown,
  ): number {
    const normalize = (s: string) => s.trim().toLowerCase();
    switch (question.type) {
      case TestQuestionType.SINGLE_CHOICE:
      case TestQuestionType.TRUE_FALSE: {
        const correctOption = question.options.find((o) => o.isCorrect);
        return typeof submitted === 'string' && submitted === correctOption?.id
          ? question.points
          : 0;
      }
      case TestQuestionType.MULTIPLE_CHOICE: {
        const correctIds = new Set(
          question.options.filter((o) => o.isCorrect).map((o) => o.id),
        );
        const submittedIds = new Set(Array.isArray(submitted) ? submitted : []);
        const correct =
          correctIds.size === submittedIds.size &&
          [...correctIds].every((id) => submittedIds.has(id));
        return correct ? question.points : 0;
      }
      case TestQuestionType.SHORT_ANSWER: {
        const correct =
          typeof submitted === 'string' &&
          !!question.correctAnswerText &&
          normalize(submitted) === normalize(question.correctAnswerText);
        return correct ? question.points : 0;
      }
      default:
        return 0;
    }
  }

  async submitAttempt(courseId: string, userId: string, dto: SubmitAttemptDto) {
    const test = await this.prisma.test.findUnique({
      where: { courseId },
      include: { questions: { include: { options: true } } },
    });
    if (!test)
      throw new NotFoundException('Тест для этого курса ещё не создан');

    const existing = await this.prisma.testAttempt.findUnique({
      where: {
        testId_userId_stage: { testId: test.id, userId, stage: dto.stage },
      },
    });
    if (existing)
      throw new BadRequestException(
        'Попытка для этой стадии уже отправлена ранее',
      );

    let earned = 0;
    let total = 0;
    for (const q of test.questions) {
      total += q.points;
      earned += this.gradeQuestion(q, dto.answers[q.id]);
    }
    const scorePercent = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passed = scorePercent >= test.passScorePercent;

    const attempt = await this.prisma.testAttempt.create({
      data: {
        testId: test.id,
        userId,
        stage: dto.stage,
        scorePercent,
        passed,
        answers: dto.answers as Prisma.InputJsonValue,
      },
    });

    if (passed) {
      await this.recalculateAssignmentProgress(courseId, userId);
    }

    return attempt;
  }

  async myAttempts(courseId: string, userId: string) {
    const test = await this.prisma.test.findUnique({ where: { courseId } });
    if (!test) return [];
    return this.prisma.testAttempt.findMany({
      where: { testId: test.id, userId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async allAttempts(courseId: string) {
    const test = await this.getTest(courseId);
    return this.prisma.testAttempt.findMany({
      where: { testId: test.id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // ------------------------------------------------------------------
  // Тест-уроки (quiz) — тест, привязанный к конкретному уроку, а не к курсу
  // ------------------------------------------------------------------

  private async findQuizLesson(courseId: string, lessonId: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson || lesson.module.courseId !== courseId) {
      throw new NotFoundException('Урок не найден в этом курсе');
    }
    return lesson;
  }

  async getLessonQuiz(courseId: string, lessonId: string) {
    await this.findQuizLesson(courseId, lessonId);
    const quiz = await this.prisma.test.findUnique({
      where: { lessonId },
      include: TEST_DETAIL_INCLUDE,
    });
    if (!quiz)
      throw new NotFoundException('Тест для этого урока ещё не создан');
    return quiz;
  }

  async getLessonQuizForAttempt(courseId: string, lessonId: string) {
    const quiz = await this.getLessonQuiz(courseId, lessonId);
    return {
      id: quiz.id,
      lessonId: quiz.lessonId,
      title: quiz.title,
      passScorePercent: quiz.passScorePercent,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        order: q.order,
        type: q.type,
        text: q.text,
        points: q.points,
        options: q.options.map((o) => ({
          id: o.id,
          order: o.order,
          text: o.text,
        })),
      })),
    };
  }

  async createLessonQuiz(
    courseId: string,
    lessonId: string,
    dto: CreateTestDto,
  ) {
    const lesson = await this.findQuizLesson(courseId, lessonId);
    if (lesson.contentType !== 'QUIZ') {
      throw new BadRequestException(
        'Тест можно добавить только к уроку типа «Тест»',
      );
    }
    const existing = await this.prisma.test.findUnique({ where: { lessonId } });
    if (existing)
      throw new BadRequestException('Тест для этого урока уже создан');
    return this.prisma.test.create({
      data: { lessonId, ...dto },
      include: TEST_DETAIL_INCLUDE,
    });
  }

  async updateLessonQuiz(
    courseId: string,
    lessonId: string,
    dto: UpdateTestDto,
  ) {
    const quiz = await this.getLessonQuiz(courseId, lessonId);
    return this.prisma.test.update({
      where: { id: quiz.id },
      data: dto,
      include: TEST_DETAIL_INCLUDE,
    });
  }

  async removeLessonQuiz(courseId: string, lessonId: string) {
    const quiz = await this.getLessonQuiz(courseId, lessonId);
    return this.prisma.test.delete({ where: { id: quiz.id } });
  }

  async addQuizQuestion(
    courseId: string,
    lessonId: string,
    dto: CreateQuestionDto,
  ) {
    const quiz = await this.getLessonQuiz(courseId, lessonId);
    return this.prisma.testQuestion.create({
      data: {
        testId: quiz.id,
        order: dto.order,
        type: dto.type,
        text: dto.text,
        points: dto.points,
        correctAnswerText: dto.correctAnswerText,
        options: dto.options ? { create: dto.options } : undefined,
      },
      include: { options: true },
    });
  }

  async updateQuizQuestion(
    courseId: string,
    lessonId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ) {
    await this.getLessonQuiz(courseId, lessonId);
    return this.prisma.testQuestion.update({
      where: { id: questionId },
      data: {
        order: dto.order,
        type: dto.type,
        text: dto.text,
        points: dto.points,
        correctAnswerText: dto.correctAnswerText,
        ...(dto.options
          ? { options: { deleteMany: {}, create: dto.options } }
          : {}),
      },
      include: { options: true },
    });
  }

  async removeQuizQuestion(
    courseId: string,
    lessonId: string,
    questionId: string,
  ) {
    await this.getLessonQuiz(courseId, lessonId);
    return this.prisma.testQuestion.delete({ where: { id: questionId } });
  }

  async submitQuizAttempt(
    courseId: string,
    lessonId: string,
    userId: string,
    dto: SubmitQuizAttemptDto,
  ) {
    await this.findQuizLesson(courseId, lessonId);
    const quiz = await this.prisma.test.findUnique({
      where: { lessonId },
      include: { questions: { include: { options: true } } },
    });
    if (!quiz)
      throw new NotFoundException('Тест для этого урока ещё не создан');

    let earned = 0;
    let total = 0;
    for (const q of quiz.questions) {
      total += q.points;
      earned += this.gradeQuestion(q, dto.answers[q.id]);
    }
    const scorePercent = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passed = scorePercent >= quiz.passScorePercent;

    const attempt = await this.prisma.testAttempt.create({
      data: {
        testId: quiz.id,
        userId,
        stage: null,
        scorePercent,
        passed,
        answers: dto.answers as Prisma.InputJsonValue,
      },
    });

    if (passed) {
      await this.prisma.lessonProgress.upsert({
        where: { lessonId_userId: { lessonId, userId } },
        create: { lessonId, userId },
        update: {},
      });
      await this.recalculateAssignmentProgress(courseId, userId);
    }

    return attempt;
  }

  async myQuizAttempts(courseId: string, lessonId: string, userId: string) {
    await this.findQuizLesson(courseId, lessonId);
    const quiz = await this.prisma.test.findUnique({ where: { lessonId } });
    if (!quiz) return [];
    return this.prisma.testAttempt.findMany({
      where: { testId: quiz.id, userId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async allQuizAttempts(courseId: string, lessonId: string) {
    const quiz = await this.getLessonQuiz(courseId, lessonId);
    return this.prisma.testAttempt.findMany({
      where: { testId: quiz.id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
