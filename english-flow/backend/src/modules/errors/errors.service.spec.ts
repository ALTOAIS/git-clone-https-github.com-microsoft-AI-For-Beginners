import { PrismaService } from '../../prisma/prisma.service';
import { ErrorsService } from './errors.service';

describe('ErrorsService.recordErrors — дедупликация и объединение', () => {
  it('новая ошибка создаётся, повторная — инкрементит occurrenceCount без дубля', async () => {
    const store: any[] = [];
    const prisma = {
      errorRecord: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const target = where.correctedText.equals.trim().toLowerCase();
          return Promise.resolve(
            store.find(
              (r) => r.correctedText.trim().toLowerCase() === target,
            ) ?? null,
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const rec = {
            id: `e${store.length + 1}`,
            occurrenceCount: 1,
            ...data,
          };
          store.push(rec);
          return Promise.resolve(rec);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const rec = store.find((r) => r.id === where.id);
          if (data.occurrenceCount?.increment) {
            rec.occurrenceCount += data.occurrenceCount.increment;
          }
          if (data.status) rec.status = data.status;
          return Promise.resolve(rec);
        }),
      },
    } as unknown as PrismaService;

    const service = new ErrorsService(prisma);
    const err = {
      original: 'He work',
      corrected: 'He works',
      explanation: '3-е лицо',
      errorType: 'VERB_FORM' as const,
    };

    await service.recordErrors('u1', [err], 'review_translation');
    await service.recordErrors('u1', [err], 'review_voice'); // та же ошибка

    expect(store).toHaveLength(1); // без дубля
    expect(store[0].occurrenceCount).toBe(2); // счётчик увеличен
    expect((prisma as any).errorRecord.create).toHaveBeenCalledTimes(1);
    expect((prisma as any).errorRecord.update).toHaveBeenCalledTimes(1);
  });

  it('разные ошибки создают отдельные записи', async () => {
    const store: any[] = [];
    const prisma = {
      errorRecord: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const target = where.correctedText.equals.trim().toLowerCase();
          return Promise.resolve(
            store.find(
              (r) => r.correctedText.trim().toLowerCase() === target,
            ) ?? null,
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const rec = {
            id: `e${store.length + 1}`,
            occurrenceCount: 1,
            ...data,
          };
          store.push(rec);
          return Promise.resolve(rec);
        }),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    const service = new ErrorsService(prisma);
    await service.recordErrors(
      'u1',
      [
        {
          original: 'He work',
          corrected: 'He works',
          explanation: '',
          errorType: 'VERB_FORM' as const,
        },
        {
          original: 'am officer',
          corrected: 'am an officer',
          explanation: '',
          errorType: 'ARTICLE' as const,
        },
      ],
      'review',
    );
    expect(store).toHaveLength(2);
  });
});
