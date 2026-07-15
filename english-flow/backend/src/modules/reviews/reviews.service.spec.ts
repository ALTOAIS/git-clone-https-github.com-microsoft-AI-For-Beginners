import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AiService } from '../ai/ai.service';
import { ErrorsService } from '../errors/errors.service';
import { ReviewsService } from './reviews.service';

function phrase(i: number) {
  return {
    englishText: `phrase ${i} text here`,
    russianTranslation: `перевод ${i}`,
    pronunciationHint: null,
    exampleSentence: null,
  };
}

/** Строит набор кандидатов с разными характеристиками. */
function makeCandidates() {
  const now = Date.now();
  const day = 86_400_000;
  return [
    // Просроченная сложная — должна быть в топе приоритета
    {
      id: 'up-difficult',
      phraseId: 'p-difficult',
      masteryScore: 10,
      status: 'DIFFICULT',
      reviewStage: 1,
      incorrectCount: 5,
      correctCount: 1,
      nextReviewAt: new Date(now - 5 * day),
      phrase: phrase(0),
    },
    // Лёгкая освоенная (но due) — для «немного лёгких»
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `up-easy-${i}`,
      phraseId: `p-easy-${i}`,
      masteryScore: 80,
      status: 'LEARNING',
      reviewStage: 5,
      incorrectCount: 0,
      correctCount: 8,
      nextReviewAt: new Date(now - day),
      phrase: phrase(100 + i),
    })),
    // Средние новые
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `up-mid-${i}`,
      phraseId: `p-mid-${i}`,
      masteryScore: 30,
      status: 'LEARNING',
      reviewStage: 1,
      incorrectCount: 2,
      correctCount: 1,
      nextReviewAt: new Date(now - day),
      phrase: phrase(200 + i),
    })),
  ];
}

function buildService(overrides: Partial<Record<string, any>> = {}) {
  const candidates = makeCandidates();
  const prisma = {
    userPhrase: {
      findMany: jest
        .fn()
        // 1-й вызов — кандидаты, 2-й — дистракторы
        .mockResolvedValueOnce(candidates)
        .mockResolvedValueOnce(candidates.slice(0, 20)),
      count: jest.fn().mockResolvedValue(candidates.length),
      findUnique: jest.fn(),
    },
    user: { findUnique: jest.fn().mockResolvedValue({ currentLevel: 'A2' }) },
    voiceAnswer: {
      create: jest.fn().mockResolvedValue({ id: 'va-1' }),
      findFirst: jest.fn(),
    },
    ...overrides,
  } as unknown as PrismaService;

  const users = {} as UsersService;
  const ai = {
    evaluateReviewAnswer: jest.fn(),
  } as unknown as AiService;
  const errors = {
    recordErrors: jest.fn().mockResolvedValue([{ id: 'err-1' }]),
  } as unknown as ErrorsService;

  return {
    service: new ReviewsService(prisma, users, ai, errors),
    prisma,
    ai,
    errors,
  };
}

describe('ReviewsService.getQueue — размер и приоритизация', () => {
  it('стандартная сессия ограничена 8 заданиями, даже если due много', async () => {
    const { service } = buildService();
    const res = await service.getQueue('u1', 'standard');
    expect(res.tasks.length).toBe(8);
    expect(res.dueTotal).toBe(21);
    expect(res.sessionSize).toBe(8);
    expect(res.estimatedMinutes).toBeGreaterThanOrEqual(1);
  });

  it('короткая сессия — 5 заданий', async () => {
    const { service } = buildService();
    const res = await service.getQueue('u1', 'short');
    expect(res.tasks.length).toBe(5);
  });

  it('интенсивная сессия — до 20 заданий', async () => {
    const { service } = buildService();
    const res = await service.getQueue('u1', 'intensive');
    expect(res.tasks.length).toBe(20);
  });

  it('просроченная сложная фраза попадает в сессию (высокий приоритет)', async () => {
    const { service } = buildService();
    const res = await service.getQueue('u1', 'standard');
    expect(res.tasks.some((t) => t.phraseId === 'p-difficult')).toBe(true);
  });

  it('сессия не состоит только из сложных — есть лёгкие', async () => {
    const { service } = buildService();
    const res = await service.getQueue('u1', 'standard');
    const hasEasy = res.tasks.some((t) => t.phraseId.startsWith('p-easy'));
    expect(hasEasy).toBe(true);
  });
});

describe('ReviewsService.evaluate — разбор и сохранение ошибок', () => {
  const evaluation = {
    aiMode: 'llm' as const,
    verdict: 'minor_error' as const,
    accepted: true,
    corrected: 'He works in a company.',
    natural: 'He works at a company.',
    rule: 'Present Simple + -s',
    examples: ['She lives here.'],
    errors: [
      {
        original: 'work',
        corrected: 'works',
        explanation: '3-е лицо',
        errorType: 'VERB_FORM' as const,
      },
    ],
  };

  function withUserPhrase(prisma: any) {
    prisma.userPhrase.findUnique = jest.fn().mockResolvedValue({
      id: 'up1',
      phraseId: 'p1',
      phrase: {
        englishText: 'He works in a company.',
        russianTranslation: 'Он работает в компании.',
      },
    });
  }

  it('текстовый ответ: ошибки сохраняются в реестр, VoiceAnswer не создаётся', async () => {
    const { service, prisma, ai, errors } = buildService();
    withUserPhrase(prisma);
    (ai.evaluateReviewAnswer as jest.Mock).mockResolvedValue(evaluation);

    const res = await service.evaluate('u1', {
      phraseId: 'p1',
      taskType: 'translation',
      userAnswer: 'He work in a company.',
    });

    expect(res.verdict).toBe('minor_error');
    expect(errors.recordErrors).toHaveBeenCalledTimes(1);
    expect((prisma as any).voiceAnswer.create).not.toHaveBeenCalled();
    expect(res.voiceAnswerId).toBeUndefined();
  });

  it('голосовой ответ: создаётся VoiceAnswer со связанными ошибками', async () => {
    const { service, prisma, ai } = buildService();
    withUserPhrase(prisma);
    (ai.evaluateReviewAnswer as jest.Mock).mockResolvedValue(evaluation);

    const res = await service.evaluate('u1', {
      phraseId: 'p1',
      taskType: 'voice',
      userAnswer: 'He work in a company.',
      durationSec: 4,
    });

    expect((prisma as any).voiceAnswer.create).toHaveBeenCalledTimes(1);
    const createArg = (prisma as any).voiceAnswer.create.mock.calls[0][0].data;
    expect(createArg.sourceModule).toBe('review');
    expect(createArg.errorRecordIds).toEqual(['err-1']);
    expect(createArg.durationSec).toBe(4);
    expect(res.voiceAnswerId).toBe('va-1');
  });

  it('повторный голосовой ответ помечает repeatedAfterCorrection и улучшение', async () => {
    const { service, prisma, ai } = buildService();
    withUserPhrase(prisma);
    (prisma as any).voiceAnswer.findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'va-old', verdict: 'significant_error' });
    (ai.evaluateReviewAnswer as jest.Mock).mockResolvedValue(evaluation); // minor_error лучше

    await service.evaluate('u1', {
      phraseId: 'p1',
      taskType: 'voice',
      userAnswer: 'He works in a company.',
      retryOfVoiceAnswerId: 'va-old',
    });

    const createArg = (prisma as any).voiceAnswer.create.mock.calls[0][0].data;
    expect(createArg.repeatedAfterCorrection).toBe(true);
    expect(createArg.secondImproved).toBe(true);
  });
});
