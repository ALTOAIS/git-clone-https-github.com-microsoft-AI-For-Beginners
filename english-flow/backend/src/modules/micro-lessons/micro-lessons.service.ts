import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  MICRO_CATEGORIES,
  MicroCategoryString,
  MicroLessonContent,
} from '../ai/ai.types';
import { normalizeEn } from '../ai/fallbacks';
import { MICRO_LESSON_THRESHOLDS } from './thresholds';

const DAY_MS = 24 * 3600 * 1000;

export interface EligibleMicroLesson {
  category: MicroCategoryString;
  count: number;
  threshold: number;
  lookbackDays: number;
  examples: { original: string; corrected: string }[];
}

@Injectable()
export class MicroLessonsService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  /** Категории, где количество ошибок за окно наблюдения превысило порог. */
  async getEligible(userId: string): Promise<EligibleMicroLesson[]> {
    const results = await Promise.all(
      MICRO_CATEGORIES.map(async (category) => {
        const { records, latestLesson } = await this.getRelevantErrors(
          userId,
          category,
        );
        if (
          latestLesson &&
          (latestLesson.status === 'PENDING' ||
            latestLesson.status === 'IN_PROGRESS')
        ) {
          return null;
        }
        const threshold = MICRO_LESSON_THRESHOLDS[category];
        if (records.length < threshold.count) return null;
        return {
          category,
          count: records.length,
          threshold: threshold.count,
          lookbackDays: threshold.lookbackDays,
          examples: records.slice(0, 3).map((r) => ({
            original: r.originalText,
            corrected: r.correctedText,
          })),
        } satisfies EligibleMicroLesson;
      }),
    );
    return results
      .filter((r): r is EligibleMicroLesson => r !== null)
      .sort((a, b) => b.count - a.count);
  }

  async generate(userId: string, category: MicroCategoryString) {
    if (!MICRO_LESSON_THRESHOLDS[category]) {
      throw new BadRequestException('Неизвестная категория');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });
    const { records } = await this.getRelevantErrors(userId, category);
    if (records.length === 0) {
      throw new BadRequestException(
        'Недостаточно данных об ошибках в этой категории',
      );
    }
    const userExamples = records
      .slice(0, 5)
      .map((r) => ({ original: r.originalText, corrected: r.correctedText }));
    const generated = await this.ai.generateMicroLesson({
      category,
      level: user?.currentLevel ?? 'A2',
      userExamples,
    });
    const lesson = await this.prisma.microLesson.create({
      data: {
        userId,
        category,
        status: 'PENDING',
        contentJson: generated.content as any,
        sourceErrorIds: records.map((r) => r.id),
        aiMode: generated.aiMode,
      },
    });
    return this.serialize(lesson, records);
  }

  async getById(userId: string, id: string) {
    const lesson = await this.findOwned(userId, id);
    const records = await this.prisma.errorRecord.findMany({
      where: { id: { in: lesson.sourceErrorIds } },
    });
    if (lesson.status === 'PENDING') {
      const updated = await this.prisma.microLesson.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
      return this.serialize(updated, records);
    }
    return this.serialize(lesson, records);
  }

  async list(userId: string) {
    return this.prisma.microLesson.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async complete(
    userId: string,
    id: string,
    answers: { exerciseId: string; answer: string }[],
  ) {
    const lesson = await this.findOwned(userId, id);
    const content = lesson.contentJson as unknown as MicroLessonContent;
    let score = 0;
    const results = content.exercises.map((ex) => {
      const given = answers.find((a) => a.exerciseId === ex.id);
      const isCorrect =
        !!given && normalizeEn(given.answer) === normalizeEn(ex.answer);
      if (isCorrect) score += 1;
      return {
        exerciseId: ex.id,
        correct: isCorrect,
        correctAnswer: ex.answer,
        given: given?.answer ?? '',
      };
    });
    const resultJson = { results, score, total: content.exercises.length };
    await this.prisma.microLesson.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        resultJson: resultJson as any,
      },
    });
    return resultJson;
  }

  async dismiss(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.microLesson.update({
      where: { id },
      data: { status: 'DISMISSED' },
    });
    return { success: true };
  }

  private async findOwned(userId: string, id: string) {
    const lesson = await this.prisma.microLesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Микро-урок не найден');
    if (lesson.userId !== userId) throw new ForbiddenException();
    return lesson;
  }

  /**
   * Ошибки категории в пределах окна наблюдения. Если по категории уже
   * есть завершённый/отклонённый урок, учитываются только ошибки ПОСЛЕ
   * его создания — так порог можно достичь заново, и урок предложится снова.
   */
  private async getRelevantErrors(
    userId: string,
    category: MicroCategoryString,
  ) {
    const threshold = MICRO_LESSON_THRESHOLDS[category];
    const categorySince = new Date(
      Date.now() - threshold.lookbackDays * DAY_MS,
    );
    const latestLesson = await this.prisma.microLesson.findFirst({
      where: { userId, category },
      orderBy: { createdAt: 'desc' },
    });
    const effectiveSince =
      latestLesson && latestLesson.createdAt > categorySince
        ? latestLesson.createdAt
        : categorySince;
    const records = await this.prisma.errorRecord.findMany({
      where: {
        userId,
        microCategory: category,
        OR: [
          { createdAt: { gte: effectiveSince } },
          { lastOccurrenceAt: { gte: effectiveSince } },
        ],
      },
      orderBy: { lastOccurrenceAt: 'desc' },
    });
    return { records, latestLesson };
  }

  private serialize(
    lesson: {
      id: string;
      category: MicroCategoryString;
      status: string;
      aiMode: string | null;
      createdAt: Date;
      completedAt: Date | null;
      resultJson: unknown;
      contentJson: unknown;
    },
    records: { originalText: string; correctedText: string }[],
  ) {
    return {
      id: lesson.id,
      category: lesson.category,
      status: lesson.status,
      aiMode: lesson.aiMode,
      createdAt: lesson.createdAt,
      completedAt: lesson.completedAt,
      resultJson: lesson.resultJson,
      content: lesson.contentJson as unknown as MicroLessonContent,
      userExamples: records.map((r) => ({
        original: r.originalText,
        corrected: r.correctedText,
      })),
    };
  }
}
