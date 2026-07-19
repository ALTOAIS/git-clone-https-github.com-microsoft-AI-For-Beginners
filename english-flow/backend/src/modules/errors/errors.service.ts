import {
  ForbiddenException,
  Injectable,
  Logger,
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
  buildHelpDetails,
} from './context-examples';
import { detectAnswerLanguage } from './language-detector';
import {
  isAssignmentCandidate,
  runGrammarResolverShadow,
} from '../grammar/resolver/resolver-shadow';

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
  private readonly logger = new Logger(ErrorsService.name);

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
   * Удаление ошибочной записи по явному действию пользователя (раздел 7
   * доработок) — например, старой записи, где "исправленный" вариант сам по
   * себе не английский. Никакого автоматического удаления нигде в коде нет:
   * это единственный путь, и он требует прямого клика пользователя.
   */
  async deleteRecord(userId: string, id: string) {
    const record = await this.prisma.errorRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Ошибка не найдена');
    if (record.userId !== userId) throw new ForbiddenException();
    await this.prisma.errorRecord.delete({ where: { id } });
    return { deleted: true };
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
    // Shadow-mode only (Grammar MVP resolver, grammar-mvp-v1): fetched once
    // per call, best-effort, never blocks error recording — see
    // safeGetPublishedGrammarRuleCodes(). Not used for anything but the
    // shadow observation's assignmentCandidate field below; no assignment
    // is ever persisted.
    const publishedGrammarRuleCodes =
      await this.safeGetPublishedGrammarRuleCodes();
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

      // Grammar MVP resolver — SHADOW MODE ONLY. Runs the existing,
      // unmodified resolver against this real error and logs structured,
      // non-sensitive metadata only. Never writes grammarRuleId or
      // grammarResolverVersion, never influences the create/update below,
      // and can never fail this call — see observeGrammarResolverShadow's
      // own doc comment for the failure-isolation guarantee.
      this.observeGrammarResolverShadow(
        error.original.trim(),
        error.corrected.trim(),
        microCategory,
        publishedGrammarRuleCodes,
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

  /**
   * Best-effort, read-only lookup of the ruleCodes currently PUBLISHED in
   * Grammar MVP — used ONLY to compute the shadow observation's
   * `assignmentCandidate` field (see observeGrammarResolverShadow below).
   * Never hardcodes the current 8 PUBLISHED ruleCodes: always reflects
   * live DB state. On any failure, returns an empty set rather than
   * throwing — `isAssignmentCandidate` then simply reports `false`, and
   * error recording continues unaffected either way.
   */
  private async safeGetPublishedGrammarRuleCodes(): Promise<
    ReadonlySet<string>
  > {
    try {
      const rows = await this.prisma.grammarRule.findMany({
        where: { contentStatus: 'PUBLISHED' },
        select: { ruleCode: true },
      });
      return new Set(rows.map((r) => r.ruleCode));
    } catch (e) {
      this.logger.warn(
        `grammar_resolver_shadow: failed to load PUBLISHED ruleCodes, assignmentCandidate will be false this call: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return new Set();
    }
  }

  /**
   * Grammar MVP resolver (grammar-mvp-v1) — SHADOW MODE ONLY.
   *
   * Runs the existing, unmodified resolver against a real
   * originalText/correctedText pair and logs only non-sensitive,
   * structured metadata (resolverVersion, resolved ruleCode or null,
   * confidence, ambiguous, candidate count, and the pure
   * assignmentCandidate eligibility flag). NEVER logs or otherwise
   * persists originalText, correctedText, any other user-authored text,
   * or user identity.
   *
   * Failure isolation: this method never throws. `runGrammarResolverShadow`
   * already swallows any resolver exception internally and returns
   * `null`; the try/catch here additionally guards the (already very
   * unlikely) case of the eligibility check or the logging call itself
   * failing, so that neither a resolver bug nor a logging bug can ever
   * reach the caller and block ErrorRecord creation, which remains fully
   * authoritative and unaffected by anything in this method.
   *
   * Absolute no-persistence rule: this method has no access to — and
   * never calls — `errorRecord.create`/`update`. It cannot write
   * `grammarRuleId` or `grammarResolverVersion`; both remain exactly as
   * they were before this call.
   */
  private observeGrammarResolverShadow(
    originalText: string,
    correctedText: string,
    existingMicroCategory: ReturnType<typeof classifyMicroCategory>,
    publishedGrammarRuleCodes: ReadonlySet<string>,
  ): void {
    try {
      const observation = runGrammarResolverShadow({
        originalText,
        correctedText,
        existingMicroCategory,
      });
      const assignmentCandidate = isAssignmentCandidate(
        observation,
        publishedGrammarRuleCodes,
      );
      this.logger.log(
        `grammar_resolver_shadow ${JSON.stringify({
          resolverVersion: observation?.resolverVersion ?? null,
          ruleCode: observation?.ruleCode ?? null,
          confidence: observation?.confidence ?? null,
          ambiguous: observation?.ambiguous ?? null,
          candidateCount: observation?.candidateCount ?? null,
          assignmentCandidate,
        })}`,
      );
    } catch (e) {
      // Best-effort only, per the shadow-mode contract: a logging/eligibility
      // failure must never block ErrorRecord creation. Swallow, warn, move on.
      try {
        this.logger.warn(
          `grammar_resolver_shadow: shadow observation failed, ignoring: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      } catch {
        // Even logging the failure must not be allowed to throw further.
      }
    }
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
   * Момент начала следующего локального календарного дня пользователя —
   * минимальный retryAfter для пропущенной ошибки (раздел 4 доработок):
   * не должна вернуться в этой же дневной сессии, но и не должна прятаться
   * дольше, чем до следующей сессии. Точность — до часа, timezone-библиотека
   * не нужна: просто ищем первый час вперёд, где локальная дата уже другая.
   */
  private async nextDailySessionAt(userId: string): Promise<Date> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = user?.timezone ?? 'Asia/Qyzylorda';
    const today = this.usersService.localDate(new Date(), timezone);
    for (let hours = 1; hours <= 48; hours++) {
      const candidate = new Date(Date.now() + hours * 3600 * 1000);
      if (this.usersService.localDate(candidate, timezone) !== today) {
        return candidate;
      }
    }
    return new Date(Date.now() + 24 * 3600 * 1000);
  }

  /**
   * Сегодняшняя практика: до DAILY_TARGET заданий. Если у пользователя
   * меньше активных ошибок, чем DAILY_TARGET, цель честно уменьшается —
   * никаких выдуманных заданий.
   */
  async getDailySession(userId: string, extra = false) {
    const today = await this.today(userId);

    const [completedToday, skippedToday, dueCandidatesRaw] = await Promise.all([
      this.prisma.errorRecord.findMany({
        where: { userId, completedTodayDate: today },
        orderBy: { lastPracticedAt: 'desc' },
      }),
      // Пропущенные сегодня — часть сессии (продвигают к завершению), но
      // НЕ считаются отработанными: successfulReviewCount/contextsPassed
      // не трогаются (раздел 2 доработок).
      this.prisma.errorRecord.findMany({
        where: { userId, lastSkippedDate: today },
      }),
      this.prisma.errorRecord.findMany({
        where: {
          userId,
          completedTodayDate: null,
          AND: [
            // Пропущенная сегодня запись не должна вернуться в этой же
            // сессии (раздел 4 доработок) — это единственная причина
            // временно скрыть NEW/PRACTICING/RECURRING, независимая от
            // общего "always due" правила ниже.
            {
              OR: [
                { lastSkippedDate: null },
                { lastSkippedDate: { not: today } },
              ],
            },
            {
              OR: [
                // NEW/PRACTICING/RECURRING не имеют легитимного
                // "расписания" — nextPracticeAt на них может быть
                // унаследован от старого (пред-редизайн) трекера или от
                // legacy-тренажёра ошибок (submitPractice меняет
                // nextPracticeAt, но не practiceStatus), поэтому такие
                // записи ВСЕГДА активны независимо от даты.
                { practiceStatus: { in: ['NEW', 'PRACTICING', 'RECURRING'] } },
                // SCHEDULED_REVIEW — единственный статус с настоящим
                // расписанием интервального повторения (раздел 5 ТЗ) —
                // здесь дата важна.
                {
                  practiceStatus: 'SCHEDULED_REVIEW',
                  OR: [
                    { nextPracticeAt: { lte: new Date() } },
                    { nextPracticeAt: null },
                  ],
                },
              ],
            },
          ],
        },
        take: 50,
      }),
    ]);

    // Записи, чей "исправленный" вариант сам по себе не английский
    // (старые данные до языкового гейта — например, обе части ошибочно
    // русские), не должны попадать в ежедневную практику. Это фильтр
    // выборки, не изменение данных — запись остаётся в БД как есть и
    // по-прежнему видна в общем списке /errors.
    const validCandidatesRaw = dueCandidatesRaw.filter(
      (r) => detectAnswerLanguage(r.correctedText) === 'EN',
    );

    const priorityOf = (r: (typeof validCandidatesRaw)[number]) =>
      r.practiceStatus === 'RECURRING'
        ? 0
        : r.practiceStatus === 'SCHEDULED_REVIEW'
          ? 1
          : 2;
    const dueCandidates = [...validCandidatesRaw].sort(
      (a, b) =>
        priorityOf(a) - priorityOf(b) || b.occurrenceCount - a.occurrenceCount,
    );

    // Сколько заданий сегодня уже прошли ЧЕРЕЗ сессию — исправленные и
    // пропущенные вместе. Именно это число определяет прогресс/завершение
    // сессии (раздел 2 доработок): пропуск засчитывается в "прошли", но не
    // в "исправили".
    const dispositionedCount = completedToday.length + skippedToday.length;

    // extra=true — добровольная доп. практика сверх дневной цели (раздел 4
    // ТЗ): цель уже выполнена, но пользователь сам просит ещё заданий.
    const cap = extra ? 10 : DAILY_TARGET;
    const target = Math.min(cap, dispositionedCount + dueCandidates.length);
    const remaining = Math.max(target - dispositionedCount, 0);
    const pending = dueCandidates.slice(0, remaining);

    // completedToday всегда состоит из записей, отработанных сегодня ПРАВИЛЬНЫМ
    // ответом (submitDailyPractice попадает сюда только при correct=true) —
    // поэтому "исправлено правильным ответом" равно всем им. "Перенесено на
    // повторение" — те из них, что ещё не достигли MASTERED и получат
    // следующую проверку позже. Зелёный статус сессии ("завершена") означает
    // именно "прошли все задания" — не "исправили все ошибки".
    const resolvedToday = completedToday.length;
    const scheduledToday = completedToday.filter(
      (r) => r.practiceStatus === 'SCHEDULED_REVIEW',
    ).length;
    const skippedCount = skippedToday.length;

    return {
      date: today,
      targetCount: target,
      completedCount: completedToday.length,
      skippedCount,
      dispositionedCount,
      resolvedToday,
      scheduledToday,
      sessionComplete: !extra && target > 0 && dispositionedCount >= target,
      tasks: pending.map((r) => this.serializeTask(r)),
      completedTasks: completedToday.map((r) => this.serializeTask(r)),
    };
  }

  /**
   * Пропуск задания в ежедневной практике (раздел 4 доработок): НЕ считается
   * успешным исправлением, НЕ увеличивает successfulReviewCount/contextsPassed
   * (не приближает MASTERED), но НЕ прячет ошибку навсегда — nextPracticeAt
   * переносится минимум до следующей дневной сессии, а не дальше с каждым
   * повторным пропуском.
   */
  async skipDailyTask(userId: string, id: string) {
    const record = await this.prisma.errorRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Ошибка не найдена');
    if (record.userId !== userId) throw new ForbiddenException();

    const today = await this.today(userId);
    const nextPracticeAt = await this.nextDailySessionAt(userId);

    const updated = await this.prisma.errorRecord.update({
      where: { id },
      data: {
        lastSkippedDate: today,
        skipCount: { increment: 1 },
        nextPracticeAt,
      },
    });
    return this.serializeTask(updated);
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
      helpDetails: buildHelpDetails(
        r.microCategory,
        r.originalText,
        r.correctedText,
        r.explanation,
      ),
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
