import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CefrString } from '../ai/ai.types';
import {
  DIAGNOSTIC_CHOICE_QUESTIONS,
  DIAGNOSTIC_OPEN_TASKS,
} from '../content/diagnostic';
import { ErrorsService } from '../errors/errors.service';

export interface DiagnosticSubmission {
  choiceAnswers: Record<string, number>;
  writingAnswers: Record<string, string>;
  speakingTranscripts: Record<string, string>;
}

function levelFromPercent(percent: number): CefrString {
  if (percent >= 90) return 'B1_PLUS';
  if (percent >= 75) return 'B1';
  if (percent >= 60) return 'A2_PLUS';
  if (percent >= 40) return 'A2';
  if (percent >= 25) return 'A1_PLUS';
  return 'A1';
}

const SKILL_LABELS_RU: Record<string, string> = {
  vocabulary: 'Словарный запас',
  grammar: 'Грамматика',
  reading: 'Чтение',
  listening: 'Аудирование',
  writing: 'Письмо',
  speaking: 'Говорение',
};

@Injectable()
export class DiagnosticsService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private errorsService: ErrorsService,
  ) {}

  /** Тест без правильных ответов. */
  getTest() {
    return {
      choiceQuestions: DIAGNOSTIC_CHOICE_QUESTIONS.map(
        ({ correctIndex: _correctIndex, ...question }) => question,
      ),
      openTasks: DIAGNOSTIC_OPEN_TASKS,
    };
  }

  async submit(userId: string, submission: DiagnosticSubmission) {
    // 1. Детеминированная оценка закрытых секций
    const sections: Record<string, { correct: number; total: number }> = {};
    for (const question of DIAGNOSTIC_CHOICE_QUESTIONS) {
      const section = (sections[question.section] ??= {
        correct: 0,
        total: 0,
      });
      section.total++;
      if (submission.choiceAnswers[question.id] === question.correctIndex) {
        section.correct++;
      }
    }
    const sectionScores: Record<string, number> = {};
    for (const [name, { correct, total }] of Object.entries(sections)) {
      sectionScores[name] = Math.round((correct / total) * 100);
    }

    // 2. ИИ-оценка открытых заданий (письмо и речь)
    const writingTasks = DIAGNOSTIC_OPEN_TASKS.filter(
      (t) => t.section === 'writing',
    );
    const speakingTasks = DIAGNOSTIC_OPEN_TASKS.filter(
      (t) => t.section === 'speaking',
    );
    const aiEvaluation = await this.ai.evaluateDiagnosticOpenTasks({
      writingAnswers: writingTasks.map((t) => ({
        prompt: t.promptEn,
        answer: submission.writingAnswers[t.id] ?? '',
      })),
      speakingTranscripts: speakingTasks.map((t) => ({
        prompt: t.promptEn,
        transcript: submission.speakingTranscripts[t.id] ?? '',
      })),
      sectionScores,
    });

    const levels = {
      vocabulary: levelFromPercent(sectionScores.vocabulary ?? 0),
      grammar: levelFromPercent(sectionScores.grammar ?? 0),
      reading: levelFromPercent(sectionScores.reading ?? 0),
      listening: levelFromPercent(sectionScores.listening ?? 0),
      writing: aiEvaluation.writingLevel,
      speaking: aiEvaluation.speakingLevel,
    };

    // Общий уровень — медиана по навыкам
    const order: CefrString[] = [
      'A1',
      'A1_PLUS',
      'A2',
      'A2_PLUS',
      'B1',
      'B1_PLUS',
      'B2',
      'C1',
    ];
    const sorted = Object.values(levels)
      .map((l) => order.indexOf(l))
      .sort((a, b) => a - b);
    const overall = order[sorted[Math.floor(sorted.length / 2)]];

    // Сильные и слабые навыки по закрытым секциям
    const ranked = Object.entries(levels).sort(
      (a, b) => order.indexOf(b[1]) - order.indexOf(a[1]),
    );
    const strengths =
      aiEvaluation.strengths.length > 0
        ? aiEvaluation.strengths
        : ranked.slice(0, 2).map(([k]) => SKILL_LABELS_RU[k]);
    const weaknesses =
      aiEvaluation.weaknesses.length > 0
        ? aiEvaluation.weaknesses
        : ranked.slice(-2).map(([k]) => SKILL_LABELS_RU[k]);

    // 3. Сохраняем профиль навыков и уровень пользователя
    await this.prisma.skillProfile.upsert({
      where: { userId },
      update: {
        vocabulary: levels.vocabulary as any,
        grammar: levels.grammar as any,
        reading: levels.reading as any,
        listening: levels.listening as any,
        writing: levels.writing as any,
        speaking: levels.speaking as any,
        strengths,
        weaknesses,
        summary: aiEvaluation.summary,
        lastAssessedAt: new Date(),
      },
      create: {
        userId,
        vocabulary: levels.vocabulary as any,
        grammar: levels.grammar as any,
        reading: levels.reading as any,
        listening: levels.listening as any,
        writing: levels.writing as any,
        speaking: levels.speaking as any,
        strengths,
        weaknesses,
        summary: aiEvaluation.summary,
      },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentLevel: overall as any,
        dailyGoalMinutes: aiEvaluation.recommendedDailyMinutes,
      },
    });

    // 4. Повторяющиеся ошибки → реестр ошибок
    if (aiEvaluation.recurringErrors.length > 0) {
      await this.errorsService.recordErrors(
        userId,
        aiEvaluation.recurringErrors,
        'diagnostic',
      );
    }

    return {
      aiMode: aiEvaluation.aiMode,
      aiError: aiEvaluation.aiError,
      sectionScores,
      levels,
      overall,
      strengths,
      weaknesses,
      recurringErrors: aiEvaluation.recurringErrors,
      summary: aiEvaluation.summary,
      suggestedTrack: aiEvaluation.suggestedTrack,
      recommendedDailyMinutes: aiEvaluation.recommendedDailyMinutes,
      estimatedPath:
        'При регулярных занятиях 15 минут в день уровень B1 обычно достижим за 6–12 месяцев. Точный срок зависит от практики — приложение не даёт гарантированных дат.',
    };
  }
}
