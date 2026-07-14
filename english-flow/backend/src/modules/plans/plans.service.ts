import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LessonContent } from '../content/lesson-content';
import { LessonsService } from '../lessons/lessons.service';
import { UsersService } from '../users/users.service';

export interface PlanTask {
  id: string;
  type: 'review' | 'lesson' | 'speaking' | 'errors' | 'voice';
  title: string;
  minutes: number;
  done: boolean;
  lessonId?: string;
  count?: number;
}

export interface PlanTasksJson {
  busy: boolean;
  tasks: PlanTask[];
}

@Injectable()
export class PlansService {
  constructor(
    private prisma: PrismaService,
    private lessonsService: LessonsService,
    private usersService: UsersService,
  ) {}

  async getToday(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, dailyGoalMinutes: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    const date = this.usersService.localDate(new Date(), user.timezone);

    const existing = await this.prisma.dailyPlan.findUnique({
      where: { userId_date: { userId, date } },
    });
    if (existing) return this.serialize(existing);

    const created = await this.prisma.dailyPlan.create({
      data: {
        userId,
        date,
        plannedMinutes: user.dailyGoalMinutes,
        tasksJson: (await this.buildTasks(
          userId,
          user.dailyGoalMinutes,
          false,
        )) as any,
      },
    });
    return this.serialize(created);
  }

  /** Режим занятого дня: «У меня только 3 минуты». */
  async switchToBusy(userId: string) {
    const plan = await this.getToday(userId);
    const updated = await this.prisma.dailyPlan.update({
      where: { id: plan.id },
      data: {
        plannedMinutes: 3,
        completionPercent: 0,
        completedAt: null,
        tasksJson: (await this.buildTasks(userId, 3, true)) as any,
      },
    });
    return this.serialize(updated);
  }

  async completeTask(userId: string, taskId: string) {
    const plan = await this.getToday(userId);
    const tasksJson = plan.tasksJson as PlanTasksJson;
    const task = tasksJson.tasks.find((t) => t.id === taskId);
    if (!task) throw new NotFoundException('Задача плана не найдена');
    if (!task.done) {
      task.done = true;
      const doneCount = tasksJson.tasks.filter((t) => t.done).length;
      const percent = Math.round((doneCount / tasksJson.tasks.length) * 100);
      await this.prisma.dailyPlan.update({
        where: { id: plan.id },
        data: {
          tasksJson: tasksJson as any,
          completionPercent: percent,
          completedAt: percent === 100 ? new Date() : null,
        },
      });
      await this.usersService.registerStudyActivity(userId);
    }
    return this.getToday(userId);
  }

  private async buildTasks(
    userId: string,
    minutes: number,
    busy: boolean,
  ): Promise<PlanTasksJson> {
    const dueCount = await this.prisma.userPhrase.count({
      where: {
        userId,
        status: { not: 'MASTERED' },
        OR: [{ nextReviewAt: { lte: new Date() } }, { nextReviewAt: null }],
      },
    });
    const errorsCount = await this.prisma.errorRecord.count({
      where: {
        userId,
        status: { in: ['NEW', 'PRACTICING', 'REPEATED', 'IMPROVING'] },
      },
    });

    if (busy) {
      // 3 минуты: 5 повторений, 1 голосовой ответ, 1 ошибка.
      const tasks: PlanTask[] = [
        {
          id: 'review',
          type: 'review',
          title: `Повторить ${Math.min(dueCount, 5)} фраз`,
          minutes: 1,
          done: false,
          count: Math.min(dueCount, 5) || 5,
        },
        {
          id: 'voice',
          type: 'voice',
          title: 'Ответить голосом на вопрос дня',
          minutes: 1,
          done: false,
        },
      ];
      if (errorsCount > 0) {
        tasks.push({
          id: 'errors',
          type: 'errors',
          title: 'Исправить 1 ошибку',
          minutes: 1,
          done: false,
          count: 1,
        });
      }
      return { busy: true, tasks };
    }

    const lesson = await this.lessonsService.getTodayLesson(userId);
    const lessonContent = lesson?.contentJson as unknown as LessonContent;
    const newPhraseCount = lessonContent?.newPhrases?.length ?? 5;
    const reviewCount = Math.min(dueCount, 10) || 5;

    const tasks: PlanTask[] = [
      {
        id: 'review',
        type: 'review',
        title: `Повторить ${reviewCount} фраз`,
        minutes: Math.max(2, Math.round(minutes * 0.25)),
        done: false,
        count: reviewCount,
      },
    ];
    if (lesson) {
      tasks.push({
        id: 'lesson',
        type: 'lesson',
        title: `Выучить ${newPhraseCount} новых выражений`,
        minutes: Math.max(3, Math.round(minutes * 0.3)),
        done: false,
        lessonId: lesson.id,
      });
    }
    tasks.push({
      id: 'speaking',
      type: 'speaking',
      title: 'Пройти диалог с ИИ',
      minutes: Math.max(3, Math.round(minutes * 0.3)),
      done: false,
    });
    if (errorsCount > 0) {
      tasks.push({
        id: 'errors',
        type: 'errors',
        title: `Исправить ${Math.min(errorsCount, 3)} ошибки`,
        minutes: Math.max(1, Math.round(minutes * 0.15)),
        done: false,
        count: Math.min(errorsCount, 3),
      });
    }
    return { busy: false, tasks };
  }

  private serialize(plan: {
    id: string;
    date: string;
    plannedMinutes: number;
    tasksJson: unknown;
    completionPercent: number;
    completedAt: Date | null;
  }) {
    return plan as typeof plan & { tasksJson: PlanTasksJson };
  }
}
