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
    lastSkippedDate: null,
    skipCount: 0,
    lastPracticedAt: null,
    sourceModule: null,
    sourceEntityId: null,
    sourcePrompt: null,
    sourceContext: null,
    originalUserAnswer: null,
    ...overrides,
  };
}

/**
 * Мини-интерпретатор Prisma-style where для in-memory моков: понимает
 * вложенные OR/AND и точечные условия по полям, которые реально использует
 * ErrorsService (userId/practiceStatus/completedTodayDate/lastSkippedDate/
 * nextPracticeAt). Нужен из-за вложенного OR внутри OR в getDailySession
 * (раздел про nextPracticeAt только для SCHEDULED_REVIEW).
 */
function matchesWhere(r: Record<string, any>, where: any): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(cond as any[]).some((sub) => matchesWhere(r, sub))) return false;
      continue;
    }
    if (key === 'AND') {
      if (!(cond as any[]).every((sub) => matchesWhere(r, sub))) return false;
      continue;
    }
    if (key === 'userId') {
      if (r.userId !== cond) return false;
      continue;
    }
    if (key === 'completedTodayDate' || key === 'lastSkippedDate') {
      if (cond === null) {
        if (r[key] != null) return false;
      } else if (cond && typeof cond === 'object' && 'not' in cond) {
        // Prisma: {not: X} на nullable-поле матчит и NULL, и значения != X.
        if (r[key] === (cond as any).not) return false;
      } else if (r[key] !== cond) {
        return false;
      }
      continue;
    }
    if (key === 'practiceStatus') {
      if (typeof cond === 'string') {
        if (r.practiceStatus !== cond) return false;
      } else if (cond && typeof cond === 'object' && 'in' in cond) {
        if (!(cond as any).in.includes(r.practiceStatus)) return false;
      }
      continue;
    }
    if (key === 'nextPracticeAt') {
      if (cond === null) {
        if (r.nextPracticeAt != null) return false;
      } else if (cond && typeof cond === 'object' && 'lte' in cond) {
        if (!(
          r.nextPracticeAt != null && r.nextPracticeAt <= (cond as any).lte
        )) {
          return false;
        }
      }
      continue;
    }
  }
  return true;
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
        let result = records.filter((r) => matchesWhere(r, where));
        if (take) result = result.slice(0, take);
        return Promise.resolve(result);
      }),
      update: jest.fn(({ where: { id }, data }: any) => {
        const rec = records.find((r) => r.id === id);
        for (const [key, value] of Object.entries(data)) {
          if (
            value &&
            typeof value === 'object' &&
            'increment' in (value as any)
          ) {
            (rec as any)[key] =
              ((rec as any)[key] ?? 0) + (value as any).increment;
          } else {
            (rec as any)[key] = value;
          }
        }
        return Promise.resolve(rec);
      }),
      delete: jest.fn(({ where: { id } }: any) => {
        const idx = records.findIndex((r) => r.id === id);
        const [removed] = idx >= 0 ? records.splice(idx, 1) : [undefined];
        return Promise.resolve(removed);
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

describe('ErrorsService — регрессия production-инцидента после PR #33', () => {
  it('NEW-запись с nextPracticeAt в будущем (унаследованным от legacy-тренажёра) видна в daily session', async () => {
    // Именно этот сценарий воспроизводит production-баг: practiceStatus=NEW
    // (дефолт миграции), но nextPracticeAt в будущем — например, от старого
    // TrainerService mode=errors (submitPractice меняет nextPracticeAt, но
    // не practiceStatus).
    const record = makeRecord({
      practiceStatus: 'NEW',
      nextPracticeAt: FUTURE,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const session = await service.getDailySession('u1');
    expect(session.tasks.map((t) => t.id)).toContain(record.id);
  });

  it('пустая цель (targetCount=0) не возникает, пока есть хотя бы одна активная NEW-запись', async () => {
    const record = makeRecord({
      practiceStatus: 'NEW',
      nextPracticeAt: FUTURE,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const session = await service.getDailySession('u1');
    expect(session.targetCount).toBeGreaterThan(0);
    expect(session.tasks.length).toBeGreaterThan(0);
  });

  it('PRACTICING-запись с будущим nextPracticeAt (унаследованным) тоже видна', async () => {
    const record = makeRecord({
      practiceStatus: 'PRACTICING',
      nextPracticeAt: FUTURE,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const session = await service.getDailySession('u1');
    expect(session.tasks.map((t) => t.id)).toContain(record.id);
  });

  it('SCHEDULED_REVIEW с будущим nextPracticeAt по-прежнему НЕ видна (расписание — единственный легитимный кейс даты)', async () => {
    const record = makeRecord({
      practiceStatus: 'SCHEDULED_REVIEW',
      nextPracticeAt: FUTURE,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const session = await service.getDailySession('u1');
    expect(session.tasks.map((t) => t.id)).not.toContain(record.id);
  });

  it('старая запись, где correctedText сам по себе не английский, не попадает в daily session, но остаётся в списке', async () => {
    const record = makeRecord({
      practiceStatus: 'NEW',
      originalText: 'поужинали',
      correctedText: 'ужинаем',
      detectedLanguage: null,
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const session = await service.getDailySession('u1');
    expect(session.tasks.map((t) => t.id)).not.toContain(record.id);

    // Запись НЕ удалена и НЕ изменена — просто исключена из выборки.
    const stillThere = await service.list('u1');
    expect(stillThere.map((r) => r.id)).toContain(record.id);
    expect(stillThere.find((r) => r.id === record.id)?.practiceStatus).toBe(
      'NEW',
    );

    // getDailySession — read-only относительно этой записи: языковой фильтр
    // — это .filter() на уже прочитанных строках, ни один update/delete по
    // ней не должен уйти в БД просто от того, что она была отфильтрована.
    expect(prisma.errorRecord.update).not.toHaveBeenCalled();
    expect(prisma.errorRecord.delete).not.toHaveBeenCalled();
  });

  it('корректная английская запись с именем, числом и пунктуацией не считается повреждённой и участвует в daily session', async () => {
    const record = makeRecord({
      practiceStatus: 'NEW',
      originalText: "John have 3 apples, doesn't he?",
      correctedText: "John has 3 apples, doesn't he?",
    });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    const session = await service.getDailySession('u1');
    expect(session.tasks.map((t) => t.id)).toContain(record.id);
  });

  it('пропущенная сегодня NEW-запись не возвращается в этой же сессии, несмотря на "always due" правило для NEW', async () => {
    const record = makeRecord({ practiceStatus: 'NEW' });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.skipDailyTask('u1', record.id);
    const session = await service.getDailySession('u1');
    expect(session.tasks.map((t) => t.id)).not.toContain(record.id);
    expect(session.skippedCount).toBe(1);
  });

  it('deleteRecord удаляет запись только её владельцу и не позволяет чужому пользователю', async () => {
    const record = makeRecord({ userId: 'u1' });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await expect(
      service.deleteRecord('someone-else', record.id),
    ).rejects.toThrow();
    await expect(service.deleteRecord('u1', record.id)).resolves.toEqual({
      deleted: true,
    });

    const remaining = await service.list('u1');
    expect(remaining.map((r) => r.id)).not.toContain(record.id);
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

describe('ErrorsService.skipDailyTask — пропуск задания (доработки, раздел 2/4)', () => {
  it('пропуск НЕ увеличивает successfulReviewCount и НЕ приближает MASTERED', async () => {
    const record = makeRecord({ successfulReviewCount: 3, contextsPassed: 1 });
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.skipDailyTask('u1', record.id);

    expect(record.successfulReviewCount).toBe(3);
    expect(record.contextsPassed).toBe(1);
    expect(record.practiceStatus).toBe('NEW');
  });

  it('пропуск не считается completedTodayDate/исправлением, но помечает lastSkippedDate и увеличивает skipCount', async () => {
    const record = makeRecord({});
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.skipDailyTask('u1', record.id);

    expect(record.completedTodayDate).toBeNull();
    expect(record.lastSkippedDate).toBe(TODAY);
    expect(record.skipCount).toBe(1);
  });

  it('пропущенная ошибка не возвращается в той же сессии и не появляется сразу после "обновления страницы"', async () => {
    const record = makeRecord({});
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.skipDailyTask('u1', record.id);
    // "Обновление страницы" — повторный вызов getDailySession сразу после пропуска.
    const session = await service.getDailySession('u1');
    expect(session.tasks.map((t) => t.id)).not.toContain(record.id);
    expect(record.nextPracticeAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('повторные пропуски не увеличивают отсрочку и не прячут ошибку навсегда', async () => {
    const record = makeRecord({});
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.skipDailyTask('u1', record.id);
    const firstDelay = record.nextPracticeAt.getTime() - Date.now();
    // Симулируем, что ошибка снова стала актуальна (например, наступил
    // следующий день) и её пропустили повторно.
    record.nextPracticeAt = PAST;
    await service.skipDailyTask('u1', record.id);
    const secondDelay = record.nextPracticeAt.getTime() - Date.now();

    expect(record.skipCount).toBe(2);
    // Второй пропуск не откладывает ошибку сильно дальше первого —
    // отсрочка не растёт с каждым пропуском.
    expect(secondDelay).toBeLessThan(firstDelay + 2 * 3600 * 1000);
  });

  it('все 3 задания дневной сессии пропущены — сессия всё равно считается завершённой (но не "исправленной")', async () => {
    const records = [makeRecord({}), makeRecord({}), makeRecord({})];
    const prisma = makePrisma(records);
    const service = new ErrorsService(prisma, fakeUsersService);

    for (const r of records) {
      await service.skipDailyTask('u1', r.id);
    }

    const session = await service.getDailySession('u1');
    expect(session.dispositionedCount).toBe(3);
    expect(session.skippedCount).toBe(3);
    expect(session.resolvedToday).toBe(0);
    expect(session.sessionComplete).toBe(true);
    expect(session.tasks).toHaveLength(0);
  });

  it('2 задания исправлены, 1 пропущено — сессия завершена, буквы честно разделены', async () => {
    const records = [makeRecord({}), makeRecord({}), makeRecord({})];
    const prisma = makePrisma(records);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.submitDailyPractice(
      'u1',
      records[0].id,
      records[0].correctedText,
    );
    await service.submitDailyPractice(
      'u1',
      records[1].id,
      records[1].correctedText,
    );
    await service.skipDailyTask('u1', records[2].id);

    const session = await service.getDailySession('u1');
    expect(session.dispositionedCount).toBe(3);
    expect(session.resolvedToday).toBe(2);
    expect(session.skippedCount).toBe(1);
    expect(session.sessionComplete).toBe(true);
  });
});

describe('ErrorsService — граничные сценарии ежедневной сессии', () => {
  it('пользователь "закрыл страницу посередине": прогресс сохраняется между вызовами getDailySession', async () => {
    const records = [makeRecord({}), makeRecord({}), makeRecord({})];
    const prisma = makePrisma(records);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.submitDailyPractice(
      'u1',
      records[0].id,
      records[0].correctedText,
    );

    // Первый "заход" — увидели 1 исправленную задачу.
    const sessionA = await service.getDailySession('u1');
    expect(sessionA.dispositionedCount).toBe(1);
    expect(sessionA.sessionComplete).toBe(false);

    // "Закрыли страницу" и открыли снова — состояние то же самое, сессия не сбрасывается.
    const sessionB = await service.getDailySession('u1');
    expect(sessionB.dispositionedCount).toBe(1);
    expect(sessionB.tasks.map((t) => t.id).sort()).toEqual(
      [records[1].id, records[2].id].sort(),
    );
  });

  it('повторное открытие раздела после завершения снова показывает экран завершения, а не задания заново', async () => {
    const records = [makeRecord({}), makeRecord({}), makeRecord({})];
    const prisma = makePrisma(records);
    const service = new ErrorsService(prisma, fakeUsersService);

    for (const r of records) {
      await service.submitDailyPractice('u1', r.id, r.correctedText);
    }

    const first = await service.getDailySession('u1');
    const second = await service.getDailySession('u1');
    expect(first.sessionComplete).toBe(true);
    expect(second.sessionComplete).toBe(true);
    expect(second.tasks).toHaveLength(0);
  });

  it('ошибка снова возникла в другом модуле в тот же день после пропуска — не создаёт дубль и снова доступна для практики', async () => {
    const record = makeRecord({});
    const prisma = makePrisma([record]);
    const service = new ErrorsService(prisma, fakeUsersService);

    await service.skipDailyTask('u1', record.id);
    expect(record.nextPracticeAt.getTime()).toBeGreaterThan(Date.now());

    // recordErrors работает через отдельный findFirst/create/update —
    // подключаем его к тому же mock-объекту записи.
    (prisma as any).errorRecord.findFirst = jest.fn().mockResolvedValue(record);
    (prisma as any).errorRecord.update = jest
      .fn()
      .mockImplementation(({ data }: any) => {
        Object.assign(record, {
          occurrenceCount:
            record.occurrenceCount + (data.occurrenceCount?.increment ?? 0),
          nextPracticeAt: data.nextPracticeAt ?? record.nextPracticeAt,
        });
        return Promise.resolve(record);
      });

    await service.recordErrors(
      'u1',
      [
        {
          original: record.originalText,
          corrected: record.correctedText,
          explanation: '',
          errorType: 'VERB_FORM',
        },
      ],
      'lesson',
    );

    // Не создан дубль, occurrenceCount вырос, и запись снова доступна "сегодня".
    expect(record.occurrenceCount).toBe(2);
    expect(record.nextPracticeAt.getTime()).toBeLessThanOrEqual(Date.now());
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
