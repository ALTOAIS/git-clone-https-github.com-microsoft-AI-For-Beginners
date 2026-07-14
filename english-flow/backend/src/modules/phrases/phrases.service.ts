import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PHRASE_CATEGORIES } from '../content/seed-phrases';
import { CreatePhraseDto, UpdateUserPhraseDto } from './phrases.dto';

const PROFESSIONAL_CATEGORIES = [
  'compliance',
  'risk',
  'anticorruption',
  'governance',
  'meetings',
  'presentations',
  'emails',
  'career',
  'work',
];

@Injectable()
export class PhrasesService {
  constructor(private prisma: PrismaService) {}

  getCategories() {
    return PHRASE_CATEGORIES;
  }

  async list(
    userId: string,
    filter?: string,
    category?: string,
    search?: string,
  ) {
    const where: Prisma.UserPhraseWhereInput = { userId };
    if (category) where.phrase = { category };
    if (filter === 'new') where.status = 'NEW';
    else if (filter === 'learning') where.status = 'LEARNING';
    else if (filter === 'mastered') where.status = 'MASTERED';
    else if (filter === 'difficult') where.status = 'DIFFICULT';
    else if (filter === 'professional') {
      where.phrase = {
        ...(where.phrase as object),
        category: { in: PROFESSIONAL_CATEGORIES },
      };
    } else if (filter === 'due') {
      where.nextReviewAt = { lte: new Date() };
      where.status = { not: 'MASTERED' };
    }
    if (search) {
      where.phrase = {
        ...(where.phrase as object),
        OR: [
          { englishText: { contains: search, mode: 'insensitive' } },
          { russianTranslation: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    return this.prisma.userPhrase.findMany({
      where,
      include: { phrase: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async create(userId: string, dto: CreatePhraseDto) {
    const phrase = await this.prisma.phrase.create({
      data: {
        englishText: dto.english.trim(),
        russianTranslation: dto.russian.trim(),
        category: dto.category ?? 'everyday',
        cefrLevel: (dto.cefrLevel as any) ?? 'A2',
        exampleSentence: dto.example,
        pronunciationHint: dto.hint,
        tags: dto.tags ?? [],
        source: (dto.source as any) ?? 'MANUAL',
      },
    });
    return this.prisma.userPhrase.create({
      data: { userId, phraseId: phrase.id, nextReviewAt: new Date() },
      include: { phrase: true },
    });
  }

  async bulkCreate(userId: string, phrases: CreatePhraseDto[]) {
    const results = [];
    for (const dto of phrases.slice(0, 50)) {
      // Не дублируем уже существующую в библиотеке пользователя фразу
      const existing = await this.prisma.userPhrase.findFirst({
        where: {
          userId,
          phrase: {
            englishText: { equals: dto.english.trim(), mode: 'insensitive' },
          },
        },
      });
      if (existing) continue;
      results.push(await this.create(userId, dto));
    }
    return { created: results.length, items: results };
  }

  async update(userId: string, userPhraseId: string, dto: UpdateUserPhraseDto) {
    const userPhrase = await this.prisma.userPhrase.findUnique({
      where: { id: userPhraseId },
    });
    if (!userPhrase) throw new NotFoundException('Фраза не найдена');
    if (userPhrase.userId !== userId) throw new ForbiddenException();
    return this.prisma.userPhrase.update({
      where: { id: userPhraseId },
      data: {
        personalExample: dto.personalExample,
        status: dto.status as any,
      },
      include: { phrase: true },
    });
  }

  async remove(userId: string, userPhraseId: string) {
    const userPhrase = await this.prisma.userPhrase.findUnique({
      where: { id: userPhraseId },
    });
    if (!userPhrase) throw new NotFoundException('Фраза не найдена');
    if (userPhrase.userId !== userId) throw new ForbiddenException();
    await this.prisma.userPhrase.delete({ where: { id: userPhraseId } });
    return { success: true };
  }

  /** Добавляет фразу в библиотеку пользователя, без дублей. */
  async attachPhrase(
    userId: string,
    data: {
      english: string;
      russian: string;
      category?: string;
      example?: string;
      hint?: string;
      source:
        | 'AI_LESSON'
        | 'MANUAL'
        | 'SPEAKING'
        | 'UPLOADED_DOCUMENT'
        | 'ERROR_CORRECTION'
        | 'DIAGNOSTIC';
      tags?: string[];
    },
  ) {
    const existing = await this.prisma.userPhrase.findFirst({
      where: {
        userId,
        phrase: {
          englishText: { equals: data.english.trim(), mode: 'insensitive' },
        },
      },
      include: { phrase: true },
    });
    if (existing) return existing;
    const phrase = await this.prisma.phrase.create({
      data: {
        englishText: data.english.trim(),
        russianTranslation: data.russian.trim(),
        category: data.category ?? 'everyday',
        exampleSentence: data.example,
        pronunciationHint: data.hint,
        source: data.source,
        tags: data.tags ?? [],
      },
    });
    return this.prisma.userPhrase.create({
      data: { userId, phraseId: phrase.id, nextReviewAt: new Date() },
      include: { phrase: true },
    });
  }

  /** Фраза дня — детерминированно по дате из библиотеки пользователя. */
  async phraseOfTheDay(userId: string) {
    const count = await this.prisma.userPhrase.count({ where: { userId } });
    if (count === 0) return null;
    const dayIndex =
      Math.floor(Date.now() / (24 * 3600 * 1000)) % Math.max(count, 1);
    const items = await this.prisma.userPhrase.findMany({
      where: { userId },
      include: { phrase: true },
      orderBy: { createdAt: 'asc' },
      skip: dayIndex,
      take: 1,
    });
    return items[0] ?? null;
  }
}
