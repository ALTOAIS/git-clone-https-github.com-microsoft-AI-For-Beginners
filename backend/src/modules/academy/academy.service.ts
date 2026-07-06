import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseAssignmentStatus,
  CourseStatus,
  Prisma,
  TestQuestionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateTestDto } from './dto/create-test.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
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
    await this.findOne(id);
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

    return this.prisma.testAttempt.create({
      data: {
        testId: test.id,
        userId,
        stage: dto.stage,
        scorePercent,
        passed,
        answers: dto.answers as Prisma.InputJsonValue,
      },
    });
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
}
