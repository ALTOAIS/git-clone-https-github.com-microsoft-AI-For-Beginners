import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ProgressService } from './progress.service';

function buildPrisma(overrides: Partial<any> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        timezone: 'UTC',
        streakDays: 3,
      }),
    },
    dailyPlan: {
      findUnique: jest.fn().mockResolvedValue({ completionPercent: 100 }),
    },
    errorRecord: { findMany: jest.fn().mockResolvedValue([]) },
    reviewAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    conversation: { findMany: jest.fn().mockResolvedValue([]) },
    lessonAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    voiceAnswer: { findMany: jest.fn().mockResolvedValue([]) },
    userPhrase: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as unknown as PrismaService;
}

describe('ProgressService.getDailySummary', () => {
  it('считает сегодняшнюю активность из разных источников', async () => {
    const today = new Date();
    const prisma = buildPrisma({
      reviewAttempt: {
        findMany: jest.fn().mockResolvedValue([{ createdAt: today }, { createdAt: today }]),
      },
      lessonAttempt: {
        findMany: jest.fn().mockResolvedValue([
          { completedAt: today, speakingSeconds: 120 },
        ]),
      },
      voiceAnswer: {
        findMany: jest.fn().mockResolvedValue([{ createdAt: today, durationSec: 60 }]),
      },
      userPhrase: {
        findMany: jest.fn().mockResolvedValue([{ createdAt: today }]),
      },
      errorRecord: {
        findMany: jest.fn().mockResolvedValue([
          { createdAt: today, lastOccurrenceAt: today },
        ]),
      },
    });
    const usersService = new UsersService(prisma);
    const service = new ProgressService(prisma, usersService);

    const summary = await service.getDailySummary('u1');
    expect(summary.reviewsCompletedToday).toBe(2);
    expect(summary.lessonsCompletedToday).toBe(1);
    expect(summary.speakingMinutesToday).toBe(3); // (120+60)s / 60
    expect(summary.newPhrasesToday).toBe(1);
    expect(summary.correctedErrorsToday).toBe(1);
    expect(summary.streakDays).toBe(3);
    expect(summary.dailyGoalMet).toBe(true);
  });

  it('возвращает нули без выдуманных данных, если активности не было', async () => {
    const prisma = buildPrisma({
      dailyPlan: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const usersService = new UsersService(prisma);
    const service = new ProgressService(prisma, usersService);

    const summary = await service.getDailySummary('u1');
    expect(summary.correctedErrorsToday).toBe(0);
    expect(summary.reviewsCompletedToday).toBe(0);
    expect(summary.speakingMinutesToday).toBe(0);
    expect(summary.newPhrasesToday).toBe(0);
    expect(summary.lessonsCompletedToday).toBe(0);
    expect(summary.dailyGoalMet).toBe(false);
    expect(summary.speakingConfidenceNote).toBeUndefined();
  });

  it('не считает ошибку, изменённую сегодня (updatedAt), если это не occurrence — lastOccurrenceAt не в окне', async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    const prisma = buildPrisma({
      errorRecord: {
        findMany: jest.fn().mockResolvedValue([
          { createdAt: oldDate, lastOccurrenceAt: oldDate },
        ]),
      },
    });
    const usersService = new UsersService(prisma);
    const service = new ProgressService(prisma, usersService);

    const summary = await service.getDailySummary('u1');
    expect(summary.correctedErrorsToday).toBe(0);
  });
});

describe('ProgressService.getDailyHistory', () => {
  it('возвращает запись на каждый день запрошенного диапазона, включая нулевые дни', async () => {
    const prisma = buildPrisma();
    const usersService = new UsersService(prisma);
    const service = new ProgressService(prisma, usersService);

    const history = await service.getDailyHistory('u1', 7);
    expect(history).toHaveLength(7);
    expect(history.every((d) => d.correctedErrors === 0)).toBe(true);
    // Отсортировано по возрастанию даты
    const dates = history.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
  });
});
