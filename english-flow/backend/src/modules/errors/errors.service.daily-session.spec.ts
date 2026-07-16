import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ErrorsService } from './errors.service';

const fakeUsersService = {
  localDate: () => '2026-07-16',
  registerStudyActivity: jest.fn().mockResolvedValue(undefined),
} as unknown as UsersService;

const TODAY = '2026-07-16';
const PAST = new Date(Date.now() - 60_000);
const FUTURE = new Date(Date.now() + 10 * 24 * 3600 * 1000);

function makeRecord(overrides: Record<string, any>) {
  return {
    id: `r-${Math.random().toString(36).slice(2)}`,
    userId: 'u1',
    originalText: 'He work here.',
    correctedText: 'He works here.',
    explanation: '3-е лицо в Present Simple требует -s.',
    errorType: 'VERB_FORM',
    microCategory: 'THIRD_PERSON_SINGULAR',
    status: 'NEW',
    practiceStatus: 'NEW',
    occurrenceCount: 1,
    successfulReviewCount: 0,
    contextsPassed: 0,
    nextPracticeAt: PAST,
    completedTodayDate: null,
    lastPracticedAt: null,
    sourceModule: null,
    sourceEntityId: null,
    sourcePrompt: null,
    sourceContext: null,
    originalUserAnswer: null,
    ...overrides,
  };
}

/** Простой in-memory Prisma для сценариев ежедневной практики. */
function makePrisma(records: ReturnType<typeof makeRecord>[]) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ timezone: 'Asia/Qyzylorda' }),
    },
    errorRecord: {
      findUnique: jest.fn(({ where: { id } }: any) =>
        Promise.resolve(records.find((r) => r.id === id) ?? null),
      ),
      findMany: jest.fn(({ where, take }: any) => {
        let result = records.filter((r) => {
          if (where.userId && r.userId !== where.userId) return false;
          if ('completedTodayDate' in where) {
            if (where.completedTodayDate === null) {
              if (r.completedTodayDate != null) return false;
            } else if (r.completedTodayDate !== where.completedTodayDate) {
              return false;
            }
          }
          if (
            where.practiceStatus?.in &&
            !where.practiceStatus.in.includes(r.practiceStatus)
          ) {
            return false;
          }
          if (where.OR) {
            const ok = where.OR.some((cond: any) => {
              if (cond.nextPracticeAt?.lte) {
                return (
                  r.nextPracticeAt != null &&
                  r.nextPracticeAt <= cond.nextPracticeAt.lte
                );
              }
              if ('nextPracticeAt' in cond && cond.nextPracticeAt === null) {
                return r.nextPracticeAt == null;
              }
              return false;
            });
            if (!ok) return false;
          }
          return true;
        });
        if (take) result = result.slice(0, take);
        return Promise.resolve(result);
      }),
      update: jest.fn(({ where: { id }, data }: any) => {
        const rec = records.find((r) => r.id === id);
        Object.assign(rec, data);
        return Promise.resolve(rec);
      }),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('ErrorsService — контекст исходного задания (раздел 2 ТЗ)', () => {
  it('ошибка с сохранённым контекстом: карточка содержит источник, задание и ответ пользователя', async () => {
    const record = makeRecord({
      sourceModule: 'trainer',
      sourcePrompt: 'Он работает здесь.',
      sourceContext: 'Тренажёр перевода · RU→EN',
      originalUserAnswer: 'He work here.',
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const session = await service.getDailySession('u1');
    expect(session.tasks).toHaveLength(1);
    const task = session.tasks[0];
    expect(task.hasContext).toBe(true);
    expect(task.sourceModule).toBe('trainer');
    expect(task.sourcePrompt).toBe('Он работает здесь.');
    expect(task.originalUserAnswer).toBe('He work here.');
  });

  it('старая ошибка без контекста: hasContext=false, но сама ошибка и исправление не выдуманы', async () => {
    const record = makeRecord({}); // sourceModule/sourcePrompt/originalUserAnswer всё null — «до миграции»
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const session = await service.getDailySession('u1');
    const task = session.tasks[0];
    expect(task.hasContext).toBe(false);
    expect(task.originalText).toBe('He work here.');
    expect(task.correctedText).toBe('He works here.');
  });
});

describe('ErrorsService — ежедневная сессия (раздел 4 ТЗ)', () => {
  it('честно уменьшает цель, если активных ошибок меньше DAILY_TARGET', async () => {
    const prisma = makePrisma([makeRecord({}), makeRecord({})]); // всего 2 ошибки
    const service = new ErrorsService(prisma, fakeUsersService);
    const session = await service.getDailySession('u1');
    expect(session.targetCount).toBe(2);
  });

  it('успешное завершение 3 из 3 — sessionComplete становится true', async () => {
    const records = [makeRecord({}), makeRecord({}), makeRecord({})];
    const prisma = makePrisma(records);
    const service = new ErrorsService(prisma, fakeUsersService);

    let session = await service.getDailySession('u1');
    expect(session.targetCount).toBe(3);
    expect(session.sessionComplete).toBe(false);

    for (const r of records) {
      const result = await service.submitDailyPractice(
        'u1',
        r.id,
        r.correctedText,
      );
      expect(result.correct).toBe(true);
    }

    session = await service.getDailySession('u1');
    expect(session.completedCount).toBe(3);
    expect(session.sessionComplete).toBe(true);
    expect(session.tasks).toHaveLength(0);
  });

  it('отработанные сегодня ошибки отображаются в completedTasks', async () => {
    const record = makeRecord({});
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.submitDailyPractice('u1', record.id, record.correctedText);
    const session = await service.getDailySession('u1');
    expect(session.completedTasks).toHaveLength(1);
    expect(session.completedTasks[0].id).toBe(record.id);
    expect(record.completedTodayDate).toBe(TODAY);
  });
});

describe('ErrorsService — расписание повторов и предотвращение преждевременного MASTERED (раздел 5 ТЗ)', () => {
  it('первый успешный ответ назначает следующую проверку через 3 дня и НЕ ставит MASTERED', async () => {
    const record = makeRecord({});
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const result = await service.submitDailyPractice(
      'u1',
      record.id,
      'He works here.',
    );
    expect(result.correct).toBe(true);
    expect(result.mastered).toBe(false);
    expect(result.nextReviewInDays).toBe(3);
    expect(record.practiceStatus).toBe('SCHEDULED_REVIEW');
    expect(record.nextPracticeAt.getTime()).toBeGreaterThan(
      Date.now() + 2 * 24 * 3600 * 1000,
    );
  });

  it('ошибка, которая должна повториться (nextPracticeAt в прошлом), возвращается в сегодняшнюю сессию', async () => {
    const record = makeRecord({
      practiceStatus: 'SCHEDULED_REVIEW',
      successfulReviewCount: 1,
      nextPracticeAt: PAST,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);
    const session = await service.getDailySession('u1');
    expect(session.tasks.map((t) => t.id)).toContain(record.id);
  });

  it('ошибка с будущей датой проверки НЕ показывается сегодня', async () => {
    const record = makeRecord({
      practiceStatus: 'SCHEDULED_REVIEW',
      successfulReviewCount: 1,
      nextPracticeAt: FUTURE,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);
    const session = await service.getDailySession('u1');
    expect(session.tasks).toHaveLength(0);
    expect(session.targetCount).toBe(0);
  });

  it('MASTERED присваивается только после нескольких успехов в разных контекстах, не после одного ответа', async () => {
    // Уже 3 успеха и 1 контекст пройден в предыдущих сессиях — не хватает
    // ни MASTERED_SUCCESS_COUNT (нужно 4), ни contextsPassed (нужно 2).
    const record = makeRecord({
      practiceStatus: 'SCHEDULED_REVIEW',
      successfulReviewCount: 3,
      contextsPassed: 1,
      nextPracticeAt: PAST,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    // successfulReviewCount>0 → это повтор, поэтому используется задание
    // с пропуском (blank), отличное от исходного предложения — новый контекст.
    const result = await service.submitDailyPractice('u1', record.id, 'works');
    expect(result.correct).toBe(true);
    expect(result.mastered).toBe(true); // 4-й успех + 2-й контекст → усвоено
    expect(record.practiceStatus).toBe('MASTERED');
    expect(record.nextPracticeAt).toBeNull();
  });

  it('неверный ответ во время планового повтора переводит ошибку в RECURRING и увеличивает occurrenceCount', async () => {
    const record = makeRecord({
      practiceStatus: 'SCHEDULED_REVIEW',
      successfulReviewCount: 2,
      occurrenceCount: 1,
      nextPracticeAt: PAST,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const result = await service.submitDailyPractice(
      'u1',
      record.id,
      'completely wrong answer',
    );
    expect(result.correct).toBe(false);
    expect(record.practiceStatus).toBe('RECURRING');
    expect(record.occurrenceCount).toBe(2);
    expect(record.successfulReviewCount).toBe(0);
  });
});

describe('ErrorsService.recordErrors — повторное появление уже отработанной ошибки (раздел 5 ТЗ)', () => {
  it('ошибка, которая уже была SCHEDULED_REVIEW/MASTERED, возвращается в RECURRING при новом появлении "в дикой природе"', async () => {
    const existing = makeRecord({
      id: 'e1',
      correctedText: 'He works here.',
      practiceStatus: 'MASTERED',
      status: 'RESOLVED',
    });
    const prisma = {
      errorRecord: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockImplementation(({ data }: any) => {
          Object.assign(existing, {
            occurrenceCount:
              existing.occurrenceCount + (data.occurrenceCount?.increment ?? 0),
            practiceStatus: data.practiceStatus,
          });
          return Promise.resolve(existing);
        }),
        create: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.recordErrors(
      'u1',
      [
        {
          original: 'He work here.',
          corrected: 'He works here.',
          explanation: '',
          errorType: 'VERB_FORM',
        },
      ],
      'lesson',
    );

    expect(existing.practiceStatus).toBe('RECURRING');
    expect(existing.occurrenceCount).toBe(2);
  });
});

describe('ErrorsService — совместимость со старыми пользователями после миграции (раздел 8 ТЗ)', () => {
  it('запись без новых полей (созданная до миграции) не ломает getDailySession и list', async () => {
    const legacyRecord = makeRecord({
      practiceStatus: undefined, // как если бы поле было добавлено только что и Prisma подставила default NEW
      successfulReviewCount: undefined,
      contextsPassed: undefined,
      completedTodayDate: undefined,
      sourceModule: undefined,
      sourcePrompt: undefined,
      sourceContext: undefined,
      originalUserAnswer: undefined,
      detectedLanguage: undefined,
    });
    // Симулируем реальное поведение Prisma @default(NEW)/@default(0) — эти
    // поля были бы заполнены дефолтами миграцией, а не оставлены undefined.
    legacyRecord.practiceStatus = 'NEW';
    legacyRecord.successfulReviewCount = 0;
    legacyRecord.contextsPassed = 0;
    const prisma = makePrisma([legacyRecord]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await expect(service.getDailySession('u1')).resolves.toBeDefined();
    const session = await service.getDailySession('u1');
    expect(session.tasks[0].hasContext).toBe(false);
  });
});
