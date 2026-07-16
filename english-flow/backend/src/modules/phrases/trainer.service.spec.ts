import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ErrorsService } from '../errors/errors.service';
import { UsersService } from '../users/users.service';
import { TrainerService } from './trainer.service';

function makeService(
  overrides: {
    evaluateTranslation?: jest.Mock;
  } = {},
) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ currentLevel: 'A2' }) },
  } as unknown as PrismaService;
  const ai = {
    evaluateTranslation:
      overrides.evaluateTranslation ??
      jest.fn().mockResolvedValue({
        aiMode: 'llm',
        verdict: 'correct',
        correctAnswer: 'She is responsible for compliance.',
        explanation: '',
        errors: [],
      }),
  } as unknown as AiService;
  const recordErrors = jest.fn().mockResolvedValue([]);
  const errors = { recordErrors } as unknown as ErrorsService;
  const usersService = {
    registerStudyActivity: jest.fn().mockResolvedValue(undefined),
  } as unknown as UsersService;
  const service = new TrainerService(prisma, ai, errors, usersService);
  return { service, ai, recordErrors, usersService };
}

describe('TrainerService.evaluate — языковой гейт (раздел 3 ТЗ)', () => {
  it('русский ответ на ru_en-задание блокируется до вызова ИИ, ошибка грамматики не создаётся', async () => {
    const { service, ai, recordErrors } = makeService();
    const result = await service.evaluate('u1', {
      direction: 'ru_en',
      prompt: 'Она отвечает за комплаенс.',
      expected: 'She is responsible for compliance.',
      userAnswer: 'Она отвечает за комплаенс.',
    } as any);

    expect(result.languageIssue?.detectedLanguage).toBe('RU');
    expect(result.errors).toHaveLength(0);
    expect(ai.evaluateTranslation).not.toHaveBeenCalled();
    expect(recordErrors).not.toHaveBeenCalled();
  });

  it('бессмысленный текст блокируется как UNCLEAR, а не отправляется в оценщик', async () => {
    const { service, ai } = makeService();
    const result = await service.evaluate('u1', {
      direction: 'ru_en',
      prompt: 'Она отвечает за комплаенс.',
      expected: 'She is responsible for compliance.',
      userAnswer: 'sdfsdf',
    } as any);

    expect(result.languageIssue?.detectedLanguage).toBe('UNCLEAR');
    expect(ai.evaluateTranslation).not.toHaveBeenCalled();
  });

  it('пустой ответ блокируется как EMPTY', async () => {
    const { service, ai } = makeService();
    const result = await service.evaluate('u1', {
      direction: 'ru_en',
      prompt: 'Она отвечает за комплаенс.',
      expected: 'She is responsible for compliance.',
      userAnswer: '   ',
    } as any);

    expect(result.languageIssue?.detectedLanguage).toBe('EMPTY');
    expect(ai.evaluateTranslation).not.toHaveBeenCalled();
  });

  it('английский ответ проходит гейт и уходит в обычную ИИ-оценку', async () => {
    const { service, ai } = makeService();
    await service.evaluate('u1', {
      direction: 'ru_en',
      prompt: 'Она отвечает за комплаенс.',
      expected: 'She is responsible for compliance.',
      userAnswer: 'She is responsible for compliance.',
    } as any);

    expect(ai.evaluateTranslation).toHaveBeenCalledTimes(1);
  });

  it('en_ru направление не проверяется языковым гейтом (эталон сам на русском)', async () => {
    const { service, ai } = makeService();
    const result = await service.evaluate('u1', {
      direction: 'en_ru',
      prompt: 'She is responsible for compliance.',
      expected: 'Она отвечает за комплаенс.',
      userAnswer: 'Она отвечает за комплаенс.',
    } as any);

    expect(result.languageIssue).toBeUndefined();
    expect(ai.evaluateTranslation).toHaveBeenCalledTimes(1);
  });
});

describe('TrainerService.evaluate — устойчивость к сбою ИИ (раздел 9 ТЗ)', () => {
  it('при ошибках ИИ (fallback-режим) модуль не падает и всё равно сохраняет контекст исходного задания', async () => {
    const evaluateTranslation = jest.fn().mockResolvedValue({
      aiMode: 'fallback',
      fallbackReason: 'llm_error',
      verdict: 'incorrect',
      correctAnswer: 'She is responsible for compliance.',
      explanation: 'Дев-режим ИИ',
      errors: [
        {
          original: 'She responsible for compliance.',
          corrected: 'She is responsible for compliance.',
          explanation: 'Пропущен глагол-связка is.',
          errorType: 'OTHER',
        },
      ],
    });
    const { service, recordErrors } = makeService({ evaluateTranslation });

    const result = await service.evaluate('u1', {
      direction: 'ru_en',
      prompt: 'Она отвечает за комплаенс.',
      expected: 'She is responsible for compliance.',
      userAnswer: 'She responsible for compliance.',
    } as any);

    expect(result.aiMode).toBe('fallback');
    expect(recordErrors).toHaveBeenCalledTimes(1);
    const [, , , , context] = recordErrors.mock.calls[0];
    expect(context).toMatchObject({
      sourceModule: 'trainer',
      sourcePrompt: 'Она отвечает за комплаенс.',
      originalUserAnswer: 'She responsible for compliance.',
    });
  });
});
