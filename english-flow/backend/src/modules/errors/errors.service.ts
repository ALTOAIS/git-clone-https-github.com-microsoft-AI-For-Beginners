import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DetectedError } from '../ai/ai.types';
import { normalizeEn } from '../ai/fallbacks';
import { classifyMicroCategory } from './micro-category.classifier';

@Injectable()
export class ErrorsService {
  constructor(private prisma: PrismaService) {}

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
   * увеличивает счётчик и получает статус REPEATED.
   */
  async recordErrors(
    userId: string,
    errors: DetectedError[],
    source: string,
    personalExample?: string,
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
        results.push(
          await this.prisma.errorRecord.update({
            where: { id: existing.id },
            data: {
              occurrenceCount: { increment: 1 },
              status:
                existing.status === 'RESOLVED' ? 'REPEATED' : existing.status,
              nextPracticeAt: new Date(),
              lastOccurrenceAt: new Date(),
              microCategory: microCategory ?? existing.microCategory,
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
            },
          }),
        );
      }
    }
    return results;
  }

  /** Упражнения по ошибкам: исправить неверное предложение. */
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
}
