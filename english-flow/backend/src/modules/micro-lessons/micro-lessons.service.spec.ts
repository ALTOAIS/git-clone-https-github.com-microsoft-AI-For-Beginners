import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { MicroLessonsService } from './micro-lessons.service';
import { MICRO_LESSON_THRESHOLDS } from './thresholds';

function makeErrorRecord(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? `e${Math.random()}`,
    originalText: 'He work here.',
    correctedText: 'He works here.',
    microCategory: 'THIRD_PERSON_SINGULAR',
    createdAt: new Date(),
    lastOccurrenceAt: new Date(),
    ...overrides,
  };
}

describe('MicroLessonsService.getEligible — пороги срабатывания', () => {
  it('не предлагает урок, пока количество ошибок ниже порога', async () => {
    const threshold = MICRO_LESSON_THRESHOLDS.THIRD_PERSON_SINGULAR.count;
    const records = Array.from({ length: threshold - 1 }, (_, i) =>
      makeErrorRecord({ id: `e${i}` }),
    );
    const prisma = {
      errorRecord: {
        findMany: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.microCategory === 'THIRD_PERSON_SINGULAR' ? records : [],
          ),
        ),
      },
      microLesson: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const ai = {} as AiService;

    const service = new MicroLessonsService(prisma, ai);
    const eligible = await service.getEligible('u1');
    expect(eligible.find((e) => e.category === 'THIRD_PERSON_SINGULAR')).toBeUndefined();
  });

  it('предлагает урок, когда количество ошибок достигает порога', async () => {
    const threshold = MICRO_LESSON_THRESHOLDS.THIRD_PERSON_SINGULAR.count;
    const records = Array.from({ length: threshold }, (_, i) =>
      makeErrorRecord({ id: `e${i}` }),
    );
    const prisma = {
      errorRecord: {
        findMany: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.microCategory === 'THIRD_PERSON_SINGULAR' ? records : [],
          ),
        ),
      },
      microLesson: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const ai = {} as AiService;

    const service = new MicroLessonsService(prisma, ai);
    const eligible = await service.getEligible('u1');
    const found = eligible.find((e) => e.category === 'THIRD_PERSON_SINGULAR');
    expect(found).toBeDefined();
    expect(found?.count).toBe(threshold);
    expect(found?.examples.length).toBeLessThanOrEqual(3);
  });

  it('не предлагает урок повторно, пока предыдущий PENDING/IN_PROGRESS', async () => {
    const threshold = MICRO_LESSON_THRESHOLDS.THIRD_PERSON_SINGULAR.count;
    const records = Array.from({ length: threshold }, (_, i) =>
      makeErrorRecord({ id: `e${i}` }),
    );
    const prisma = {
      errorRecord: {
        findMany: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.microCategory === 'THIRD_PERSON_SINGULAR' ? records : [],
          ),
        ),
      },
      microLesson: {
        findFirst: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.category === 'THIRD_PERSON_SINGULAR'
              ? { id: 'ml1', status: 'PENDING', createdAt: new Date(0) }
              : null,
          ),
        ),
      },
    } as unknown as PrismaService;
    const ai = {} as AiService;

    const service = new MicroLessonsService(prisma, ai);
    const eligible = await service.getEligible('u1');
    expect(eligible.find((e) => e.category === 'THIRD_PERSON_SINGULAR')).toBeUndefined();
  });

  it('предлагает урок снова после COMPLETED, если ошибки повторились после него', async () => {
    const threshold = MICRO_LESSON_THRESHOLDS.THIRD_PERSON_SINGULAR.count;
    const lessonCreatedAt = new Date(Date.now() - 5 * 24 * 3600 * 1000);
    // Часть ошибок — до урока (не должны учитываться), часть — после (должны).
    const oldRecords = Array.from({ length: 3 }, (_, i) =>
      makeErrorRecord({
        id: `old${i}`,
        createdAt: new Date(lessonCreatedAt.getTime() - 1000),
        lastOccurrenceAt: new Date(lessonCreatedAt.getTime() - 1000),
      }),
    );
    const newRecords = Array.from({ length: threshold }, (_, i) =>
      makeErrorRecord({
        id: `new${i}`,
        createdAt: new Date(lessonCreatedAt.getTime() + 1000),
        lastOccurrenceAt: new Date(lessonCreatedAt.getTime() + 1000),
      }),
    );
    const allRecords = [...oldRecords, ...newRecords];

    const prisma = {
      errorRecord: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.microCategory !== 'THIRD_PERSON_SINGULAR') return Promise.resolve([]);
          const since: Date = where.OR[0].createdAt.gte;
          return Promise.resolve(
            allRecords.filter((r) => r.createdAt >= since || r.lastOccurrenceAt >= since),
          );
        }),
      },
      microLesson: {
        findFirst: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.category === 'THIRD_PERSON_SINGULAR'
              ? { id: 'ml1', status: 'COMPLETED', createdAt: lessonCreatedAt }
              : null,
          ),
        ),
      },
    } as unknown as PrismaService;
    const ai = {} as AiService;

    const service = new MicroLessonsService(prisma, ai);
    const eligible = await service.getEligible('u1');
    const found = eligible.find((e) => e.category === 'THIRD_PERSON_SINGULAR');
    expect(found).toBeDefined();
    expect(found?.count).toBe(threshold);
  });
});

describe('MicroLessonsService.complete — подсчёт результата', () => {
  it('корректно считает score по ответам ученика', async () => {
    const lesson = {
      id: 'ml1',
      userId: 'u1',
      contentJson: {
        ruleExplanation: 'r',
        additionalExamples: [],
        exercises: [
          { id: 'ex1', type: 'fill_blank', prompt: 'p1', answer: 'the' },
          { id: 'ex2', type: 'correct_sentence', prompt: 'p2', answer: 'He works here.' },
        ],
      },
    };
    const prisma = {
      microLesson: {
        findUnique: jest.fn().mockResolvedValue(lesson),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...lesson, ...data })),
      },
    } as unknown as PrismaService;
    const ai = {} as AiService;

    const service = new MicroLessonsService(prisma, ai);
    const result = await service.complete('u1', 'ml1', [
      { exerciseId: 'ex1', answer: 'The' },
      { exerciseId: 'ex2', answer: 'He work here.' },
    ]);
    expect(result.score).toBe(1);
    expect(result.total).toBe(2);
    expect(result.results.find((r) => r.exerciseId === 'ex1')?.correct).toBe(true);
    expect(result.results.find((r) => r.exerciseId === 'ex2')?.correct).toBe(false);
  });
});
