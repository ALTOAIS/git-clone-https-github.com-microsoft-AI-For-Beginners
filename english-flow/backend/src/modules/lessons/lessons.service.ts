import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CefrString, SentenceEvaluation } from '../ai/ai.types';
import { isValidLessonContent, LessonContent } from '../content/lesson-content';
import { ErrorsService } from '../errors/errors.service';
import {
  buildLanguageIssue,
  detectAnswerLanguage,
  extractEnglishPart,
} from '../errors/language-detector';
import { PhrasesService } from '../phrases/phrases.service';
import { UsersService } from '../users/users.service';
import {
  EvaluateSentenceDto,
  FinishAttemptDto,
  GenerateLessonDto,
  UpdateLessonDto,
} from './lessons.dto';

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private phrasesService: PhrasesService,
    private errorsService: ErrorsService,
    private usersService: UsersService,
  ) {}

  async list(userId: string) {
    return this.prisma.lesson.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
        status: { not: 'ARCHIVED' },
      },
      orderBy: [{ dayNumber: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        topic: true,
        level: true,
        durationMinutes: true,
        objective: true,
        dayNumber: true,
        source: true,
        status: true,
        aiGenerated: true,
        createdAt: true,
        attempts: {
          where: { userId, completedAt: { not: null } },
          select: { id: true, completedAt: true, score: true },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getById(userId: string, id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        attempts: {
          where: { userId },
          orderBy: { startedAt: 'desc' },
          take: 3,
        },
      },
    });
    if (!lesson) throw new NotFoundException('Урок не найден');
    if (lesson.userId && lesson.userId !== userId) {
      throw new ForbiddenException();
    }
    return lesson;
  }

  /** Урок дня: первый непройденный сидовый урок по dayNumber. */
  async getTodayLesson(userId: string) {
    const seedLessons = await this.prisma.lesson.findMany({
      where: { userId: null, dayNumber: { not: null }, status: 'READY' },
      orderBy: { dayNumber: 'asc' },
      include: {
        attempts: {
          where: { userId, completedAt: { not: null } },
          select: { id: true },
          take: 1,
        },
      },
    });
    const next = seedLessons.find((l) => l.attempts.length === 0);
    if (next) return next;
    // Все сидовые уроки пройдены — предложим последний свой READY-урок
    const own = await this.prisma.lesson.findFirst({
      where: { userId, status: 'READY' },
      orderBy: { createdAt: 'desc' },
    });
    return own ?? seedLessons[seedLessons.length - 1] ?? null;
  }

  async startAttempt(userId: string, lessonId: string) {
    await this.getById(userId, lessonId);
    return this.prisma.lessonAttempt.create({
      data: { userId, lessonId },
    });
  }

  async finishAttempt(
    userId: string,
    attemptId: string,
    dto: FinishAttemptDto,
  ) {
    const attempt = await this.prisma.lessonAttempt.findUnique({
      where: { id: attemptId },
      include: { lesson: true },
    });
    if (!attempt) throw new NotFoundException('Попытка не найдена');
    if (attempt.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.lessonAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score: dto.score,
        speakingSeconds: dto.speakingSeconds ?? 0,
        errorsCount: dto.errorsCount ?? 0,
        resultJson: (dto.resultJson as any) ?? undefined,
      },
    });

    // Новые фразы урока добавляются в библиотеку пользователя
    const content = attempt.lesson.contentJson as unknown as LessonContent;
    if (content?.newPhrases) {
      for (const phrase of content.newPhrases) {
        await this.phrasesService.attachPhrase(userId, {
          english: phrase.english,
          russian: phrase.russian,
          example: phrase.example,
          hint: phrase.hint,
          source: 'AI_LESSON',
          category: attempt.lesson.dayNumber ? 'everyday' : 'work',
        });
      }
    }

    await this.usersService.registerStudyActivity(userId);
    return updated;
  }

  async generate(userId: string, dto: GenerateLessonDto) {
    let sourceText: string | undefined;
    if (dto.materialId) {
      const material = await this.prisma.uploadedMaterial.findUnique({
        where: { id: dto.materialId },
      });
      if (!material || material.userId !== userId) {
        throw new NotFoundException('Материал не найден');
      }
      sourceText = material.extractedText ?? undefined;
    }

    const generated = await this.ai.generateLesson({
      topic: dto.topic,
      level: (dto.level as CefrString) ?? 'A2',
      durationMinutes: dto.durationMinutes ?? 15,
      phraseCount: dto.phraseCount ?? 5,
      focusSkill: dto.focusSkill,
      context: dto.context,
      sourceText,
    });

    const lesson = await this.prisma.lesson.create({
      data: {
        userId,
        title: generated.title,
        topic: generated.topic,
        level: generated.level as any,
        durationMinutes: generated.durationMinutes,
        objective: generated.objective,
        contentJson: generated.content as any,
        source: dto.materialId ? 'UPLOADED_DOCUMENT' : 'AI_GENERATED',
        status: 'DRAFT',
        aiGenerated: true,
      },
    });
    return { ...lesson, aiMode: generated.aiMode, aiError: generated.aiError };
  }

  async update(userId: string, id: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Урок не найден');
    if (lesson.userId !== userId) {
      throw new ForbiddenException('Сидовые уроки нельзя изменять');
    }
    if (dto.content && !isValidLessonContent(dto.content)) {
      throw new BadRequestException('Некорректная структура урока');
    }
    return this.prisma.lesson.update({
      where: { id },
      data: {
        title: dto.title,
        objective: dto.objective,
        contentJson: (dto.content as any) ?? undefined,
        status: dto.status as any,
      },
    });
  }

  async remove(userId: string, id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Урок не найден');
    if (lesson.userId !== userId) {
      throw new ForbiddenException('Сидовые уроки нельзя удалять');
    }
    await this.prisma.lesson.delete({ where: { id } });
    return { success: true };
  }

  /** Оценка личного предложения (этап 4 урока) с записью ошибок. */
  async evaluateSentence(
    userId: string,
    dto: EvaluateSentenceDto,
  ): Promise<SentenceEvaluation> {
    // Задание требует английское предложение (раздел 3 ТЗ).
    let sentence = dto.sentence;
    const detected = detectAnswerLanguage(sentence);
    if (detected !== 'EN') {
      const englishPart =
        detected === 'MIXED' ? extractEnglishPart(sentence) : null;
      if (englishPart) {
        sentence = englishPart;
      } else {
        return {
          aiMode: 'llm',
          corrected: dto.sentence,
          natural: dto.sentence,
          explanation: '',
          errors: [],
          languageIssue: buildLanguageIssue(
            detected as 'RU' | 'MIXED' | 'EMPTY' | 'UNCLEAR',
            dto.targetPhrase,
          ),
        };
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });
    const result = await this.ai.evaluateSentence({
      sentence,
      targetPhrase: dto.targetPhrase,
      level: user?.currentLevel ?? 'A2',
      context: dto.context,
    });
    if (result.errors.length > 0) {
      await this.errorsService.recordErrors(
        userId,
        result.errors,
        dto.source ?? 'lesson',
        result.natural,
        {
          sourceModule: 'lesson',
          sourceEntityId: dto.lessonId,
          sourcePrompt: dto.targetPhrase,
          sourceContext: dto.context,
          originalUserAnswer: dto.sentence,
        },
      );
    }
    return result;
  }
}
