import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ConversationTurn } from '../ai/ai.types';
import { normalizeEn } from '../ai/fallbacks';
import { SPEAKING_MODES, SPEAKING_SCENARIOS } from '../content/scenarios';
import { ErrorsService } from '../errors/errors.service';
import { PhrasesService } from '../phrases/phrases.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private errorsService: ErrorsService,
    private phrasesService: PhrasesService,
    private usersService: UsersService,
  ) {}

  getScenarios() {
    return { modes: SPEAKING_MODES, scenarios: SPEAKING_SCENARIOS };
  }

  async start(userId: string, scenarioId: string) {
    const scenario = SPEAKING_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) throw new NotFoundException('Сценарий не найден');
    const transcript: ConversationTurn[] = [
      { role: 'assistant', text: scenario.aiOpening },
    ];
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        scenario: scenario.id,
        mode: scenario.mode,
        level: scenario.level as any,
        transcriptJson: transcript as any,
      },
    });
    return {
      ...conversation,
      scenarioTitle: scenario.titleRu,
      aiMode: this.ai.isRealAi ? 'llm' : 'fallback',
    };
  }

  async addTurn(
    userId: string,
    conversationId: string,
    text: string,
    speakingSeconds?: number,
  ) {
    const conversation = await this.getOwned(userId, conversationId);
    const scenario = SPEAKING_SCENARIOS.find(
      (s) => s.id === conversation.scenario,
    );
    const transcript =
      (conversation.transcriptJson as unknown as ConversationTurn[]) ?? [];
    transcript.push({ role: 'user', text });
    const userTurns = transcript.filter((t) => t.role === 'user').length;

    const result = await this.ai.speakingTurn({
      scenarioTitle: scenario?.titleEn ?? conversation.scenario,
      scenarioQuestions: scenario?.questions ?? [],
      level: conversation.level,
      history: transcript.slice(0, -1),
      userMessage: text,
      userTurnCount: userTurns,
      allowRussianHints: true,
    });
    transcript.push({ role: 'assistant', text: result.reply });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        transcriptJson: transcript as any,
        userTurns,
        speakingSeconds:
          conversation.speakingSeconds + Math.max(speakingSeconds ?? 0, 0),
      },
    });
    return result;
  }

  async finish(userId: string, conversationId: string) {
    const conversation = await this.getOwned(userId, conversationId);
    const scenario = SPEAKING_SCENARIOS.find(
      (s) => s.id === conversation.scenario,
    );
    const transcript =
      (conversation.transcriptJson as unknown as ConversationTurn[]) ?? [];

    const feedback = await this.ai.speakingFeedback({
      scenarioTitle: scenario?.titleEn ?? conversation.scenario,
      level: conversation.level,
      transcript,
    });

    // Статистика считается детерминированно из транскрипта —
    // никаких выдуманных метрик произношения.
    const userMessages = transcript
      .filter((t) => t.role === 'user')
      .map((t) => t.text);
    const words = userMessages.flatMap((m) =>
      normalizeEn(m).split(' ').filter(Boolean),
    );
    const uniqueWords = new Set(words);
    const stats = {
      speakingSeconds: conversation.speakingSeconds,
      userTurns: userMessages.length,
      totalWords: words.length,
      avgWordsPerTurn:
        userMessages.length > 0
          ? Math.round((words.length / userMessages.length) * 10) / 10
          : 0,
      vocabularyVariety:
        words.length > 0
          ? Math.round((uniqueWords.size / words.length) * 100)
          : 0,
    };

    if (feedback.mistakes.length > 0) {
      // Лучшее приближение исходного контекста: последний вопрос ИИ перед
      // завершением и реплика ученика, где встречается ошибочный фрагмент
      // (если её удаётся найти) — надёжно определить, какой ИМЕННО вопрос
      // спровоцировал каждую конкретную ошибку, невозможно (ИИ анализирует
      // весь транскрипт целиком), поэтому даём общий, но честный контекст.
      const lastAssistantTurn = [...transcript]
        .reverse()
        .find((t) => t.role === 'assistant');
      await this.errorsService.recordErrors(
        userId,
        feedback.mistakes,
        'speaking',
        undefined,
        {
          sourceModule: 'speaking',
          sourceEntityId: conversationId,
          sourceContext: scenario?.titleRu ?? conversation.scenario,
          sourcePrompt: lastAssistantTurn?.text,
        },
      );
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        completedAt: new Date(),
        feedbackJson: { ...feedback, stats } as any,
      },
    });
    await this.usersService.registerStudyActivity(userId);
    return { conversation: updated, feedback, stats };
  }

  async savePhrase(
    userId: string,
    conversationId: string,
    english: string,
    russian: string,
  ) {
    await this.getOwned(userId, conversationId);
    return this.phrasesService.attachPhrase(userId, {
      english,
      russian,
      category: 'work',
      source: 'SPEAKING',
    });
  }

  async list(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getById(userId: string, id: string) {
    return this.getOwned(userId, id);
  }

  private async getOwned(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation) throw new NotFoundException('Диалог не найден');
    if (conversation.userId !== userId) throw new ForbiddenException();
    return conversation;
  }
}
