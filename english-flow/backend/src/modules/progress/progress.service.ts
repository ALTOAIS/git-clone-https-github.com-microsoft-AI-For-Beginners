import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const WEEK_MS = 7 * 24 * 3600 * 1000;
const MONTH_MS = 30 * 24 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

interface DayBucket {
  correctedErrors: number;
  reviewsCompleted: number;
  speakingSeconds: number;
  newPhrases: number;
  lessonsCompleted: number;
}

export interface DailySummary {
  date: string;
  correctedErrorsToday: number;
  reviewsCompletedToday: number;
  speakingMinutesToday: number;
  newPhrasesToday: number;
  lessonsCompletedToday: number;
  streakDays: number;
  dailyGoalMet: boolean;
  speakingConfidenceNote?: string;
}

export interface DailyHistoryEntry {
  date: string;
  correctedErrors: number;
  reviewsCompleted: number;
  speakingMinutes: number;
  newPhrases: number;
  lessonsCompleted: number;
}

@Injectable()
export class ProgressService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async getOverview(userId: string) {
    const now = Date.now();
    const weekAgo = new Date(now - WEEK_MS);
    const monthAgo = new Date(now - MONTH_MS);

    const [
      user,
      skillProfile,
      activePhrases,
      masteredPhrases,
      reviewAttempts,
      conversations,
      weekConversations,
      lessonAttempts,
      topErrors,
      benchmarks,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentLevel: true,
          streakDays: true,
          dailyGoalMinutes: true,
        },
      }),
      this.prisma.skillProfile.findUnique({ where: { userId } }),
      this.prisma.userPhrase.count({
        where: { userId, status: { in: ['LEARNING', 'DIFFICULT'] } },
      }),
      this.prisma.userPhrase.count({ where: { userId, status: 'MASTERED' } }),
      this.prisma.reviewAttempt.findMany({
        where: { userId, createdAt: { gte: monthAgo } },
        select: { correct: true },
      }),
      this.prisma.conversation.findMany({
        where: { userId, completedAt: { not: null } },
        select: { speakingSeconds: true, startedAt: true },
      }),
      this.prisma.conversation.aggregate({
        where: { userId, startedAt: { gte: weekAgo } },
        _sum: { speakingSeconds: true },
      }),
      this.prisma.lessonAttempt.findMany({
        where: { userId, completedAt: { not: null } },
        select: { speakingSeconds: true, startedAt: true, completedAt: true },
      }),
      this.prisma.errorRecord.findMany({
        where: { userId, status: { not: 'RESOLVED' } },
        orderBy: { occurrenceCount: 'desc' },
        take: 5,
      }),
      this.prisma.voiceBenchmark.findMany({
        where: { userId },
        orderBy: { month: 'asc' },
        select: {
          id: true,
          month: true,
          prompt: true,
          transcript: true,
          wordCount: true,
          durationSec: true,
          createdAt: true,
        },
      }),
    ]);

    const reviewAccuracy =
      reviewAttempts.length > 0
        ? Math.round(
            (reviewAttempts.filter((a) => a.correct).length /
              reviewAttempts.length) *
              100,
          )
        : null;

    const totalSpeakingSeconds =
      conversations.reduce((sum, c) => sum + c.speakingSeconds, 0) +
      lessonAttempts.reduce((sum, a) => sum + a.speakingSeconds, 0);

    const studyMinutes = lessonAttempts.reduce((sum, a) => {
      if (!a.completedAt) return sum;
      const minutes = (a.completedAt.getTime() - a.startedAt.getTime()) / 60000;
      return sum + Math.min(Math.max(minutes, 1), 60);
    }, 0);

    // Практические достижения — выводятся из реальных данных
    const achievements = [
      {
        id: 'introduce',
        title: 'Могу представиться на английском',
        achieved: lessonAttempts.length >= 1 || conversations.length >= 1,
      },
      {
        id: 'describe-work',
        title: 'Могу описать свою работу',
        achieved: conversations.length >= 2,
      },
      {
        id: 'compliance-risk',
        title: 'Могу объяснить комплаенс-риск',
        achieved: conversations.length >= 5,
      },
      {
        id: 'follow-up',
        title: 'Могу задавать уточняющие вопросы',
        achieved: conversations.length >= 3,
      },
      {
        id: 'past-events',
        title: 'Могу рассказать о прошедших событиях',
        achieved: lessonAttempts.length >= 3,
      },
      {
        id: 'future-plans',
        title: 'Могу обсудить планы на будущее',
        achieved: lessonAttempts.length >= 4,
      },
    ];

    return {
      currentLevel: user?.currentLevel ?? 'A2',
      streakDays: user?.streakDays ?? 0,
      skillProfile,
      activePhrases,
      masteredPhrases,
      reviewAccuracy,
      speakingMinutesTotal: Math.round(totalSpeakingSeconds / 60),
      speakingMinutesWeek: Math.round(
        (weekConversations._sum.speakingSeconds ?? 0) / 60,
      ),
      completedDialogues: conversations.length,
      completedLessons: lessonAttempts.length,
      studyMinutesTotal: Math.round(studyMinutes),
      topErrors,
      achievements,
      benchmarks,
    };
  }

  async saveBenchmark(
    userId: string,
    data: {
      prompt: string;
      transcript: string;
      durationSec: number;
      audioDataUrl?: string;
    },
  ) {
    const month = new Date().toISOString().slice(0, 7);
    const wordCount = data.transcript.split(/\s+/).filter(Boolean).length;
    return this.prisma.voiceBenchmark.upsert({
      where: { userId_month: { userId, month } },
      update: {
        prompt: data.prompt,
        transcript: data.transcript,
        durationSec: data.durationSec,
        wordCount,
        audioDataUrl: data.audioDataUrl,
      },
      create: {
        userId,
        month,
        prompt: data.prompt,
        transcript: data.transcript,
        durationSec: data.durationSec,
        wordCount,
        audioDataUrl: data.audioDataUrl,
      },
    });
  }

  async getBenchmark(userId: string, id: string) {
    return this.prisma.voiceBenchmark.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Ежедневная сводка достижений: факты, без геймификации.
   * "Сегодня вы прошли повторение, исправили N ошибок, говорили M минут."
   */
  async getDailySummary(userId: string): Promise<DailySummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, streakDays: true },
    });
    const timezone = user?.timezone ?? 'Asia/Qyzylorda';
    const today = this.usersService.localDate(new Date(), timezone);

    const [buckets, plan, speakingConfidenceNote] = await Promise.all([
      this.computeDailyBuckets(userId, timezone, 1),
      this.prisma.dailyPlan.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { completionPercent: true },
      }),
      this.computeSpeakingConfidenceNote(userId),
    ]);

    const b = buckets.get(today);
    return {
      date: today,
      correctedErrorsToday: b?.correctedErrors ?? 0,
      reviewsCompletedToday: b?.reviewsCompleted ?? 0,
      speakingMinutesToday: b ? Math.round(b.speakingSeconds / 60) : 0,
      newPhrasesToday: b?.newPhrases ?? 0,
      lessonsCompletedToday: b?.lessonsCompleted ?? 0,
      streakDays: user?.streakDays ?? 0,
      dailyGoalMet: (plan?.completionPercent ?? 0) === 100,
      speakingConfidenceNote,
    };
  }

  /** История за N дней (по умолчанию 30) для графика прогресса. */
  async getDailyHistory(
    userId: string,
    days = 30,
  ): Promise<DailyHistoryEntry[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = user?.timezone ?? 'Asia/Qyzylorda';
    const buckets = await this.computeDailyBuckets(userId, timezone, days);

    const result: DailyHistoryEntry[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = this.usersService.localDate(
        new Date(Date.now() - i * DAY_MS),
        timezone,
      );
      const b = buckets.get(date);
      result.push({
        date,
        correctedErrors: b?.correctedErrors ?? 0,
        reviewsCompleted: b?.reviewsCompleted ?? 0,
        speakingMinutes: b ? Math.round(b.speakingSeconds / 60) : 0,
        newPhrases: b?.newPhrases ?? 0,
        lessonsCompleted: b?.lessonsCompleted ?? 0,
      });
    }
    return result;
  }

  /** Группирует активность пользователя по локальным (часовой пояс) дням. */
  private async computeDailyBuckets(
    userId: string,
    timezone: string,
    days: number,
  ): Promise<Map<string, DayBucket>> {
    // +1 день запаса на случай сдвига часового пояса относительно UTC.
    const since = new Date(Date.now() - (days + 1) * DAY_MS);
    const sinceDateStr = this.usersService.localDate(since, timezone);

    const [
      errorRecords,
      practicedErrors,
      reviewAttempts,
      conversations,
      lessonAttempts,
      voiceAnswers,
      newPhrases,
    ] = await Promise.all([
      this.prisma.errorRecord.findMany({
        where: {
          userId,
          OR: [
            { createdAt: { gte: since } },
            { lastOccurrenceAt: { gte: since } },
          ],
        },
        select: { createdAt: true, lastOccurrenceAt: true },
      }),
      // Ошибки, успешно отработанные в ежедневной практике (раздел 4 ТЗ) —
      // completedTodayDate хранит только последнюю дату отработки записи,
      // поэтому в истории учитывается не более одного раза за день на
      // запись, но для "сегодня" (основной случай использования) это
      // всегда точно.
      this.prisma.errorRecord.findMany({
        where: { userId, completedTodayDate: { gte: sinceDateStr } },
        select: { completedTodayDate: true },
      }),
      this.prisma.reviewAttempt.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.conversation.findMany({
        where: { userId, completedAt: { gte: since } },
        select: { completedAt: true, speakingSeconds: true },
      }),
      this.prisma.lessonAttempt.findMany({
        where: { userId, completedAt: { gte: since } },
        select: { completedAt: true, speakingSeconds: true },
      }),
      this.prisma.voiceAnswer.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true, durationSec: true },
      }),
      this.prisma.userPhrase.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    const buckets = new Map<string, DayBucket>();
    const bucket = (dateStr: string) => {
      let b = buckets.get(dateStr);
      if (!b) {
        b = {
          correctedErrors: 0,
          reviewsCompleted: 0,
          speakingSeconds: 0,
          newPhrases: 0,
          lessonsCompleted: 0,
        };
        buckets.set(dateStr, b);
      }
      return b;
    };
    const local = (d: Date) => this.usersService.localDate(d, timezone);

    for (const e of errorRecords) {
      const days = new Set<string>();
      if (e.createdAt >= since) days.add(local(e.createdAt));
      if (e.lastOccurrenceAt >= since) days.add(local(e.lastOccurrenceAt));
      for (const d of days) bucket(d).correctedErrors += 1;
    }
    for (const e of practicedErrors) {
      if (e.completedTodayDate)
        bucket(e.completedTodayDate).correctedErrors += 1;
    }
    for (const a of reviewAttempts) {
      bucket(local(a.createdAt)).reviewsCompleted += 1;
    }
    for (const c of conversations) {
      if (c.completedAt)
        bucket(local(c.completedAt)).speakingSeconds += c.speakingSeconds;
    }
    for (const a of lessonAttempts) {
      if (a.completedAt) {
        const b = bucket(local(a.completedAt));
        b.speakingSeconds += a.speakingSeconds;
        b.lessonsCompleted += 1;
      }
    }
    for (const v of voiceAnswers) {
      bucket(local(v.createdAt)).speakingSeconds += v.durationSec;
    }
    for (const p of newPhrases) {
      bucket(local(p.createdAt)).newPhrases += 1;
    }

    return buckets;
  }

  /**
   * Заметка о росте уверенности в устной речи: сравнивает долю "улучшенных
   * после исправления" повторных ответов за последнюю неделю и предыдущую.
   * Возвращает текст только при достаточном количестве наблюдений — иначе
   * ничего не утверждает (без фиктивных метрик).
   */
  private async computeSpeakingConfidenceNote(
    userId: string,
  ): Promise<string | undefined> {
    const since = new Date(Date.now() - 14 * DAY_MS);
    const mid = new Date(Date.now() - 7 * DAY_MS);
    const answers = await this.prisma.voiceAnswer.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        secondImproved: { not: null },
      },
      select: { createdAt: true, secondImproved: true },
    });
    const recent = answers.filter((a) => a.createdAt >= mid);
    const previous = answers.filter((a) => a.createdAt < mid);
    if (recent.length < 3 || previous.length < 3) return undefined;
    const rate = (arr: typeof answers) =>
      arr.filter((a) => a.secondImproved).length / arr.length;
    if (rate(recent) > rate(previous) + 0.1) {
      return 'За последнюю неделю вы чаще успешно исправляете свой ответ с первого повтора, чем неделю назад.';
    }
    return undefined;
  }
}
