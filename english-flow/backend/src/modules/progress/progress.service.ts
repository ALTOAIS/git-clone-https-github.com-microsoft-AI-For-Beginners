import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const WEEK_MS = 7 * 24 * 3600 * 1000;
const MONTH_MS = 30 * 24 * 3600 * 1000;

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

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
}
