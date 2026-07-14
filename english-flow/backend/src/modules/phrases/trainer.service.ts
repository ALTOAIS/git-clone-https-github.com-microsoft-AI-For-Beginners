import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ErrorsService } from '../errors/errors.service';
import { UsersService } from '../users/users.service';
import { EvaluateTranslationDto } from './phrases.dto';

export type TrainerMode =
  'words' | 'phrases' | 'sentences' | 'professional' | 'voice' | 'errors';

const PROFESSIONAL_CATEGORIES = [
  'compliance',
  'risk',
  'anticorruption',
  'governance',
  'meetings',
  'presentations',
  'emails',
];

export interface TrainerTask {
  id: string;
  type: 'ru_en' | 'en_ru' | 'missing' | 'order' | 'voice_ru_en' | 'fix_error';
  prompt: string;
  answer: string;
  acceptable?: string[];
  words?: string[];
  hint?: string;
  explanation?: string;
}

/**
 * Тренажёр перевода: генерирует задания из библиотеки фраз пользователя
 * и его реестра ошибок. Оценка свободных ответов — через ИИ-оценщик.
 */
@Injectable()
export class TrainerService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private errors: ErrorsService,
    private usersService: UsersService,
  ) {}

  async getTasks(
    userId: string,
    mode: TrainerMode,
    limit = 8,
  ): Promise<TrainerTask[]> {
    if (mode === 'errors') {
      const practice = await this.errors.getPracticeTasks(userId, limit);
      const records = await this.prisma.errorRecord.findMany({
        where: { id: { in: practice.map((p) => p.id) } },
      });
      const byId = new Map(records.map((r) => [r.id, r]));
      return practice.map((p) => ({
        id: p.id,
        type: 'fix_error' as const,
        prompt: p.originalText,
        answer: byId.get(p.id)?.correctedText ?? '',
        explanation: p.explanation,
      }));
    }

    const where: any = { userId };
    if (mode === 'professional') {
      where.phrase = { category: { in: PROFESSIONAL_CATEGORIES } };
    }
    const userPhrases = await this.prisma.userPhrase.findMany({
      where,
      include: { phrase: true },
      orderBy: [{ lastReviewedAt: 'asc' }],
      take: 40,
    });

    const pool = userPhrases.filter((up) => {
      const words = up.phrase.englishText.split(' ').length;
      if (mode === 'words') return words <= 2;
      if (mode === 'sentences') return words >= 4;
      return true;
    });
    const source = (pool.length >= 3 ? pool : userPhrases).slice(0, limit * 2);

    const tasks: TrainerTask[] = [];
    source.forEach((up, i) => {
      if (tasks.length >= limit) return;
      const p = up.phrase;
      if (mode === 'voice') {
        tasks.push({
          id: up.id,
          type: 'voice_ru_en',
          prompt: p.russianTranslation,
          answer: p.englishText,
          hint: p.pronunciationHint ?? undefined,
        });
        return;
      }
      const variant = i % 4;
      if (variant === 0) {
        tasks.push({
          id: up.id,
          type: 'ru_en',
          prompt: p.russianTranslation,
          answer: p.englishText,
        });
      } else if (variant === 1) {
        tasks.push({
          id: up.id,
          type: 'en_ru',
          prompt: p.englishText,
          answer: p.russianTranslation,
        });
      } else if (variant === 2) {
        const words = p.englishText.split(' ');
        if (words.length >= 3) {
          const idx = Math.max(1, Math.floor(words.length / 2));
          const answer = words[idx].replace(/[.,!?]/g, '');
          tasks.push({
            id: up.id,
            type: 'missing',
            prompt: words.map((w, j) => (j === idx ? '___' : w)).join(' '),
            answer,
            hint: p.russianTranslation,
          });
        } else {
          tasks.push({
            id: up.id,
            type: 'ru_en',
            prompt: p.russianTranslation,
            answer: p.englishText,
          });
        }
      } else {
        const words = p.englishText.split(' ');
        if (words.length >= 3) {
          tasks.push({
            id: up.id,
            type: 'order',
            prompt: 'Соберите фразу',
            answer: p.englishText,
            words: this.shuffle(words, up.id),
            hint: p.russianTranslation,
          });
        } else {
          tasks.push({
            id: up.id,
            type: 'en_ru',
            prompt: p.englishText,
            answer: p.russianTranslation,
          });
        }
      }
    });
    return tasks;
  }

  async evaluate(userId: string, dto: EvaluateTranslationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });
    const result = await this.ai.evaluateTranslation({
      direction: dto.direction,
      prompt: dto.prompt,
      expected: dto.expected,
      acceptable: dto.acceptable,
      userAnswer: dto.userAnswer,
      level: user?.currentLevel ?? 'A2',
    });
    if (result.errors.length > 0) {
      await this.errors.recordErrors(
        userId,
        result.errors,
        dto.source ?? 'translation_trainer',
      );
    }
    await this.usersService.registerStudyActivity(userId);
    return result;
  }

  private shuffle(items: string[], seedKey: string): string[] {
    let seed = 0;
    for (let i = 0; i < seedKey.length; i++) {
      seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0;
    }
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const j = seed % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    // Гарантируем, что порядок отличается от исходного
    if (copy.join(' ') === items.join(' ') && copy.length > 1) {
      [copy[0], copy[1]] = [copy[1], copy[0]];
    }
    return copy;
  }
}
