import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ReviewAttemptDto } from '../phrases/phrases.dto';

/** Интервалы повторения в днях (раздел 11 PRD). */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 90];

export type ReviewTaskType =
  'recognition' | 'translation' | 'sentence' | 'voice';

export interface ReviewTask {
  userPhraseId: string;
  phraseId: string;
  taskType: ReviewTaskType;
  english: string;
  russian: string;
  hint?: string;
  example?: string;
  stage: number;
  status: string;
  /** Для recognition: варианты ответа (перевод) */
  options?: string[];
}

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  /**
   * Очередь повторения: смешанные типы заданий.
   * Пассивное узнавание — только на ранних стадиях; дальше фраза
   * продвигается только через активные задания (перевод/предложение/голос).
   */
  async getQueue(userId: string, limit = 10) {
    const due = await this.prisma.userPhrase.findMany({
      where: {
        userId,
        status: { not: 'MASTERED' },
        OR: [{ nextReviewAt: { lte: new Date() } }, { nextReviewAt: null }],
      },
      include: { phrase: true },
      orderBy: [{ nextReviewAt: 'asc' }],
      take: Math.min(limit, 30),
    });

    // Дистракторы для заданий на узнавание
    const distractorPool = await this.prisma.userPhrase.findMany({
      where: { userId },
      include: { phrase: true },
      take: 60,
    });

    const tasks: ReviewTask[] = due.map((up, index) => {
      const taskType = this.pickTaskType(up.reviewStage, index);
      const task: ReviewTask = {
        userPhraseId: up.id,
        phraseId: up.phraseId,
        taskType,
        english: up.phrase.englishText,
        russian: up.phrase.russianTranslation,
        hint: up.phrase.pronunciationHint ?? undefined,
        example: up.phrase.exampleSentence ?? undefined,
        stage: up.reviewStage,
        status: up.status,
      };
      if (taskType === 'recognition') {
        const others = distractorPool
          .filter((d) => d.phraseId !== up.phraseId)
          .map((d) => d.phrase.russianTranslation)
          .filter((v, i, arr) => arr.indexOf(v) === i);
        const distractors = this.sample(others, 3, up.phraseId);
        task.options = this.shuffle(
          [up.phrase.russianTranslation, ...distractors],
          up.phraseId,
        );
      }
      return task;
    });

    const total = await this.prisma.userPhrase.count({
      where: {
        userId,
        status: { not: 'MASTERED' },
        OR: [{ nextReviewAt: { lte: new Date() } }, { nextReviewAt: null }],
      },
    });

    return { tasks, dueTotal: total };
  }

  private pickTaskType(stage: number, index: number): ReviewTaskType {
    if (stage <= 1) return index % 2 === 0 ? 'recognition' : 'translation';
    if (stage <= 3) return index % 2 === 0 ? 'translation' : 'recognition';
    // Поздние стадии — только активная продукция
    const active: ReviewTaskType[] = ['translation', 'sentence', 'voice'];
    return active[index % active.length];
  }

  async submitAttempt(userId: string, dto: ReviewAttemptDto) {
    const userPhrase = await this.prisma.userPhrase.findUnique({
      where: { userId_phraseId: { userId, phraseId: dto.phraseId } },
    });
    if (!userPhrase) throw new NotFoundException('Фраза не найдена');

    await this.prisma.reviewAttempt.create({
      data: {
        userId,
        phraseId: dto.phraseId,
        taskType: dto.taskType,
        answer: dto.answer,
        correct: dto.correct,
        confidence: dto.confidence,
        responseTimeMs: dto.responseTimeMs,
      },
    });

    let stage = userPhrase.reviewStage;
    const isActiveTask = dto.taskType !== 'recognition';
    const slow = (dto.responseTimeMs ?? 0) > 20_000;

    if (!dto.correct || dto.confidence === 0) {
      stage = Math.max(0, stage - 2);
    } else if (dto.confidence === 1) {
      // «С трудом» — интервал не растёт
    } else {
      // Пассивное узнавание не продвигает фразу дальше 3-й стадии
      const cap = isActiveTask ? REVIEW_INTERVALS_DAYS.length : 3;
      const step = dto.confidence === 3 && !slow ? 1 : 1;
      stage = Math.min(stage + step, cap);
    }

    const intervalDays =
      REVIEW_INTERVALS_DAYS[
        Math.min(Math.max(stage - 1, 0), REVIEW_INTERVALS_DAYS.length - 1)
      ] ?? 1;
    const nextReviewAt = new Date(
      Date.now() +
        (dto.correct && dto.confidence >= 1
          ? intervalDays * 24 * 3600 * 1000
          : 10 * 60 * 1000), // ошибка — повтор через 10 минут
    );

    const correctCount = userPhrase.correctCount + (dto.correct ? 1 : 0);
    const incorrectCount = userPhrase.incorrectCount + (dto.correct ? 0 : 1);
    const masteryScore = Math.min(
      100,
      Math.round((stage / REVIEW_INTERVALS_DAYS.length) * 100),
    );

    let status = userPhrase.status;
    if (!dto.correct && incorrectCount >= 3 && incorrectCount > correctCount) {
      status = 'DIFFICULT';
    } else if (stage >= 5 && isActiveTask && dto.correct) {
      status = 'MASTERED';
    } else if (stage >= 1) {
      status = 'LEARNING';
    }

    const updated = await this.prisma.userPhrase.update({
      where: { id: userPhrase.id },
      data: {
        reviewStage: stage,
        nextReviewAt,
        lastReviewedAt: new Date(),
        correctCount,
        incorrectCount,
        masteryScore,
        confidenceScore: dto.confidence * 33,
        status,
      },
      include: { phrase: true },
    });

    await this.usersService.registerStudyActivity(userId);
    return updated;
  }

  /** Детерминированная выборка/перемешивание, чтобы очередь была стабильной. */
  private seedFrom(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  private sample(pool: string[], count: number, seedKey: string): string[] {
    const result: string[] = [];
    let seed = this.seedFrom(seedKey);
    const copy = [...pool];
    while (result.length < count && copy.length > 0) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      result.push(copy.splice(seed % copy.length, 1)[0]);
    }
    return result;
  }

  private shuffle(items: string[], seedKey: string): string[] {
    const copy = [...items];
    let seed = this.seedFrom(seedKey);
    for (let i = copy.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const j = seed % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
