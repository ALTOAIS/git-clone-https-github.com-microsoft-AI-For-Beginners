import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DetectedError } from '../ai/ai.types';
import { normalizeEn } from '../ai/fallbacks';
import { UsersService } from '../users/users.service';
import { classifyMicroCategory } from './micro-category.classifier';
import {
  CATEGORY_ADDITIONAL_EXAMPLE,
  CATEGORY_RULE_DETAILS,
  buildBlankExercise,
} from './context-examples';

/** Целевой размер ежедневной практики ошибок (раздел 4 ТЗ). */
export const DAILY_TARGET = 3;

/** Интервалы (в днях) после 1-го/2-го/3-го/4+-го успешного повтора. */
const REVIEW_SCHEDULE_DAYS = [3, 7, 14, 30];

/** После скольких успехов (при достаточном числе разных контекстов) — MASTERED. */
const MASTERED_SUCCESS_COUNT = 4;
const MASTERED_CONTEXTS_REQUIRED = 2;

export interface ErrorSourceContext {
  sourceModule?: string;
  sourceEntityId?: string;
  sourcePrompt?: string;
  sourceContext?: string;
  originalUserAnswer?: string;
}

@Injectable()
export class ErrorsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async list(userId: string, status?: string) {
    return this.prisma.errorRecord.findMany({
      where: { userId, ...(status ? { status: status as any } : {}) },
      orderBy: [{ occurrenceCount: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    });
  }

  async updateStatus(userId: string, id: string, status: string) {
    const record = await this.prisma.errorRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Ошибка не найдена');
    if (record.userId !== userId) throw new ForbiddenException();
    return this.prisma.errorRecord.update({
      where: { id },
      data: { status: status as any },
    });
  }

  /**
   * Записывает ошибки из ответов ИИ. Повторная ошибка (то же исправление)
   * увеличивает счётчик и получает статус REPEATED/RECURRING. Контекст
   * исходного задания (source*) обновляется на самый свежий — так карточка
   * всегда показывает актуальное задание, а не первое из истории.
   */
  async recordErrors(
    userId: string,
    errors: DetectedError[],
    source: string,
    personalExample?: string,
    context?: ErrorSourceContext,
  ) {
    const results = [];
    for (const error of errors.slice(0, 10)) {
      if (!error.original?.trim() || !error.corrected?.trim()) continue;
      const existing = await this.prisma.errorRecord.findFirst({
        where: {
          userId,
          correctedText: {
            equals: error.corrected.trim(),
            mode: 'insensitive',
          },
        },
      });
      const microCategory = classifyMicroCategory(
        error.original.trim(),
        error.corrected.trim(),
      );
      if (existing) {
        const wasResolvedOrScheduled =
          existing.status === 'RESOLVED' ||
          existing.practiceStatus === 'SCHEDULED_REVIEW' ||
          existing.practiceStatus === 'MASTERED';
        results.push(
          await this.prisma.errorRecord.update({
            where: { id: existing.id },
            data: {
              occurrenceCount: { increment: 1 },
              status:
                existing.status === 'RESOLVED' ? 'REPEATED' : existing.status,
              // Повторное появление ошибки "в дикой природе" (не во время
              // самой практики) — RECURRING, следующая проверка раньше.
              practiceStatus: wasResolvedOrScheduled
                ? 'RECURRING'
                : existing.practiceStatus,
              nextPracticeAt: new Date(),
              lastOccurrenceAt: new Date(),
              microCategory: microCategory ?? existing.microCategory,
              ...(context?.sourceModule
                ? { sourceModule: context.sourceModule }
                : {}),
              ...(context?.sourceEntityId
                ? { sourceEntityId: context.sourceEntityId }
                : {}),
              ...(context?.sourcePrompt
                ? { sourcePrompt: context.sourcePrompt }
                : {}),
              ...(context?.sourceContext
                ? { sourceContext: context.sourceContext }
                : {}),
              ...(context?.originalUserAnswer
                ? { originalUserAnswer: context.originalUserAnswer }
                : {}),
            },
          }),
        );
      } else {
        results.push(
          await this.prisma.errorRecord.create({
            data: {
              userId,
              originalText: error.original.trim(),
              correctedText: error.corrected.trim(),
              explanation: error.explanation || '',
              errorType: error.errorType ?? 'OTHER',
              microCategory: microCategory ?? undefined,
              source,
              personalExample,
              nextPracticeAt: new Date(),
              lastOccurrenceAt: new Date(),
              sourceModule: context?.sourceModule,
              sourceEntityId: context?.sourceEntityId,
              sourcePrompt: context?.sourcePrompt,
              sourceContext: context?.sourceContext,
              originalUserAnswer: context?.originalUserAnswer,
            },
          }),
        );
      }
    }
    return results;
  }

  /** Упражнения по ошибкам (legacy, используется TrainerService mode=errors). */
  async getPracticeTasks(userId: string, limit = 5) {
    const records = await this.prisma.errorRecord.findMany({
      where: {
        userId,
        status: { in: ['NEW', 'PRACTICING', 'REPEATED', 'IMPROVING'] },
      },
      orderBy: [{ nextPracticeAt: 'asc' }, { occurrenceCount: 'desc' }],
      take: limit,
    });
    return records.map((r) => ({
      id: r.id,
      instruction: 'Исправьте предложение',
      originalText: r.originalText,
      errorType: r.errorType,
      explanation: r.explanation,
      status: r.status,
    }));
  }

  /** legacy multi-step practice (используется TrainerService mode=errors). */
  async submitPractice(userId: string, id: string, answer: string) {
    const record = await this.prisma.errorRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Ошибка не найдена');
    if (record.userId !== userId) throw new ForbiddenException();

    const correct = normalizeEn(answer) === normalizeEn(record.correctedText);
    const nextStatus = correct
      ? record.status === 'NEW' || record.status === 'REPEATED'
        ? 'PRACTICING'
        : record.status === 'PRACTICING'
          ? 'IMPROVING'
          : 'RESOLVED'
      : record.status === 'RESOLVED'
        ? 'REPEATED'
        : record.status;

    const updated = await this.prisma.errorRecord.update({
      where: { id },
      data: {
        status: nextStatus as any,
        occurrenceCount: correct
          ? record.occurrenceCount
          : record.occurrenceCount + 1,
        nextPracticeAt: new Date(
          Date.now() + (correct ? 2 : 0.5) * 24 * 3600 * 1000,
        ),
      },
    });
    return {
      correct,
      correctedText: record.correctedText,
      explanation: record.explanation,
      record: updated,
    };
  }

  // ------------------------------------------------------------------
  // Ежедневная практика ошибок (редизайн раздела «Мои ошибки»)
  // ------------------------------------------------------------------

  private async today(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    return this.usersService.localDate(
      new Date(),
      user?.timezone ?? 'Asia/Qyzylorda',
    );
  }

  /**
   * Сегодняшняя практика: до DAILY_TARGET заданий. Если у пользователя
   * меньше активных ошибок, чем DAILY_TARGET, цель честно уменьшается —
   * никаких выдуманных заданий.
   */
  async getDailySession(userId: string, extra = false) {
    const today = await this.today(userId);

    const [completedToday, dueCandidatesRaw] = await Promise.all([
      this.prisma.errorRecord.findMany({
        where: { userId, completedTodayDate: today },
        orderBy: { lastPracticedAt: 'desc' },
      }),
      this.prisma.errorRecord.findMany({
        where: {
          userId,
          practiceStatus: {
            in: ['NEW', 'PRACTICING', 'RECURRING', 'SCHEDULED_REVIEW'],
          },
          completedTodayDate: null,
          OR: [
            { nextPracticeAt: { lte: new Date() } },
            { nextPracticeAt: null },
          ],
        },
        take: 50,
      }),
    ]);

    const priorityOf = (r: (typeof dueCandidatesRaw)[number]) =>
      r.practiceStatus === 'RECURRING'
        ? 0
        : r.practiceStatus === 'SCHEDULED_REVIEW'
          ? 1
          : 2;
    const dueCandidates = [...dueCandidatesRaw].sort(
      (a, b) =>
        priorityOf(a) - priorityOf(b) || b.occurrenceCount - a.occurrenceCount,
    );

    // extra=true — добровольная доп. практика сверх дневной цели (раздел 4
    // ТЗ): цель уже выполнена, но пользователь сам просит ещё заданий.
    const cap = extra ? 10 : DAILY_TARGET;
    const target = Math.min(cap, completedToday.length + dueCandidates.length);
    const remaining = Math.max(target - completedToday.length, 0);
    const pending = dueCandidates.slice(0, remaining);

    // completedToday всегда состоит из записей, отработанных сегодня ПРАВИЛЬНЫМ
    // ответом (submitDailyPractice попадает сюда только при correct=true) —
    // поэтому "исправлено правильным ответом" равно всем им. "Перенесено на
    // повторение" — те из них, что ещё не достигли MASTERED и получат
    // следующую проверку позже.
    const resolvedToday = completedToday.length;
    const scheduledToday = completedToday.filter(
      (r) => r.practiceStatus === 'SCHEDULED_REVIEW',
    ).length;

    return {
      date: today,
      targetCount: target,
      completedCount: completedToday.length,
      resolvedToday,
      scheduledToday,
      sessionComplete: !extra && target > 0 && completedToday.length >= target,
      tasks: pending.map((r) => this.serializeTask(r)),
      completedTasks: completedToday.map((r) => this.serializeTask(r)),
    };
  }

  private serializeTask(r: {
    id: string;
    originalText: string;
    correctedText: string;
    explanation: string;
    errorType: string;
    microCategory: string | null;
    practiceStatus: string;
    occurrenceCount: number;
    successfulReviewCount: number;
    nextPracticeAt: Date | null;
    sourceModule: string | null;
    sourcePrompt: string | null;
    sourceContext: string | null;
    originalUserAnswer: string | null;
  }) {
    const isReview = r.successfulReviewCount > 0;
    const blank = isReview
      ? buildBlankExercise(r.originalText, r.correctedText)
      : null;
    return {
      id: r.id,
      practiceStatus: r.practiceStatus,
      errorType: r.errorType,
      occurrenceCount: r.occurrenceCount,
      successfulReviewCount: r.successfulReviewCount,
      nextPracticeAt: r.nextPracticeAt,
      hasContext: !!(
        r.sourceModule ||
        r.sourcePrompt ||
        r.sourceContext ||
        r.originalUserAnswer
      ),
      sourceModule: r.sourceModule,
      sourcePrompt: r.sourcePrompt,
      sourceContext: r.sourceContext,
      originalUserAnswer: r.originalUserAnswer,
      // Первая практика — исправить исходное предложение целиком;
      // повторная — заполнить пропуск (другой контекст того же правила).
      exercise: blank
        ? {
            type: 'blank' as const,
            prompt: blank.promptWithBlank,
            answer: blank.answer,
          }
        : {
            type: 'correct_sentence' as const,
            prompt: r.originalText,
            answer: r.correctedText,
          },
      originalText: r.originalText,
      correctedText: r.correctedText,
      explanation: r.explanation,
      additionalExample: r.microCategory
        ? (CATEGORY_ADDITIONAL_EXAMPLE[
            r.microCategory as keyof typeof CATEGORY_ADDITIONAL_EXAMPLE
          ] ?? null)
        : null,
      ruleDetails: r.microCategory
        ? (CATEGORY_RULE_DETAILS[
            r.microCategory as keyof typeof CATEGORY_RULE_DETAILS
          ] ?? null)
        : null,
    };
  }

  /**
   * Отправка ответа в ежедневной практике. Один успешный ответ в день на
   * ошибку — этого достаточно, чтобы отработать её на сегодня и назначить
   * следующую проверку (см. раздел 5 ТЗ). НЕ присваивает MASTERED сразу.
   */
  async submitDailyPractice(userId: string, id: string, answer: string) {
    const record = await this.prisma.errorRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Ошибка не найдена');
    if (record.userId !== userId) throw new ForbiddenException();

    const isReview = record.successfulReviewCount > 0;
    const blank = isReview
      ? buildBlankExercise(record.originalText, record.correctedText)
      : null;
    const expected = blank ? blank.answer : record.correctedText;
    const correct = normalizeEn(answer) === normalizeEn(expected);
    const today = await this.today(userId);
    await this.usersService.registerStudyActivity(userId);

    if (!correct) {
      // Неверно: остаётся в текущей ротации и сразу доступна для повторной
      // попытки в этой же сессии (иначе она временно "выпадает" из очереди
      // due-заданий и дневная цель может ошибочно сократиться и досрочно
      // показать "сессия завершена" — этого быть не должно).
      // Если это был плановый повтор (не первая практика) — считаем
      // рецидивом: ошибка вернулась, occurrenceCount растёт (без дубля).
      const relapsed = record.practiceStatus === 'SCHEDULED_REVIEW';
      const updated = await this.prisma.errorRecord.update({
        where: { id },
        data: {
          practiceStatus: relapsed ? 'RECURRING' : 'PRACTICING',
          occurrenceCount: relapsed
            ? record.occurrenceCount + 1
            : record.occurrenceCount,
          successfulReviewCount: relapsed ? 0 : record.successfulReviewCount,
          nextPracticeAt: new Date(),
          lastPracticedAt: new Date(),
        },
      });
      return {
        correct: false,
        correctedText: record.correctedText,
        explanation: record.explanation,
        record: this.serializeTask(updated),
      };
    }

    const successfulReviewCount = record.successfulReviewCount + 1;
    const contextsPassed = record.contextsPassed + (blank ? 1 : 0);
    const mastered =
      successfulReviewCount >= MASTERED_SUCCESS_COUNT &&
      contextsPassed >= MASTERED_CONTEXTS_REQUIRED;

    const tier = Math.min(
      successfulReviewCount - 1,
      REVIEW_SCHEDULE_DAYS.length - 1,
    );
    const intervalDays = REVIEW_SCHEDULE_DAYS[tier];
    const nextPracticeAt = mastered
      ? null
      : new Date(Date.now() + intervalDays * 24 * 3600 * 1000);

    const updated = await this.prisma.errorRecord.update({
      where: { id },
      data: {
        practiceStatus: mastered ? 'MASTERED' : 'SCHEDULED_REVIEW',
        successfulReviewCount,
        contextsPassed,
        nextPracticeAt,
        lastPracticedAt: new Date(),
        completedTodayDate: today,
      },
    });

    return {
      correct: true,
      correctedText: record.correctedText,
      explanation: record.explanation,
      mastered,
      nextReviewInDays: mastered ? null : intervalDays,
      record: this.serializeTask(updated),
    };
  }
}
