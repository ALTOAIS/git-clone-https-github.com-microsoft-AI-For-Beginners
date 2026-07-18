import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GrammarService } from './grammar.service';

function makeRule(overrides: Partial<any> = {}) {
  return {
    id: 'r1',
    ruleCode: 'ARTICLE_A_AN',
    titleRu: 'Артикли a / an',
    titleEn: 'Articles a / an',
    shortExplanationRu: 'Кратко про a/an',
    explanationRu: 'Подробно про a/an',
    formula: 'a/an + существительное',
    cefrLevel: 'A1',
    contentStatus: 'REVIEWED',
    sourceVerificationStatus: 'PARTIALLY_VERIFIED',
    exerciseSchemaVersion: '1.0',
    exerciseTemplates: {
      exerciseSchemaVersion: '1.0',
      exercises: [
        {
          id: 'ex1',
          type: 'fill_blank',
          prompt: 'I saw ___ cat.',
          answer: 'a',
        },
      ],
    },
    examples: [
      {
        id: 'ex-a',
        exampleType: 'CORRECT',
        sentence: 'I saw a cat.',
        correction: null,
        explanation: null,
        context: null,
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}

describe('GrammarService — environment publication gate', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('listRules', () => {
    it('local/dev: queries for PUBLISHED and REVIEWED rules', async () => {
      process.env.NODE_ENV = 'development';
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = { grammarRule: { findMany } } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      await service.listRules();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contentStatus: { in: ['PUBLISHED', 'REVIEWED'] } },
        }),
      );
    });

    it('production: queries for PUBLISHED only', async () => {
      process.env.NODE_ENV = 'production';
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = { grammarRule: { findMany } } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      await service.listRules();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contentStatus: { in: ['PUBLISHED'] } },
        }),
      );
    });

    it('never selects governance fields (contentStatus, sourceVerificationStatus, exerciseTemplates)', async () => {
      process.env.NODE_ENV = 'development';
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = { grammarRule: { findMany } } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      await service.listRules();

      const call = findMany.mock.calls[0][0];
      expect(call.select).toEqual({
        ruleCode: true,
        titleRu: true,
        titleEn: true,
        shortExplanationRu: true,
        cefrLevel: true,
      });
    });
  });

  describe('getRuleDetail', () => {
    it('local/dev: returns a REVIEWED rule', async () => {
      process.env.NODE_ENV = 'development';
      const rule = makeRule({ contentStatus: 'REVIEWED' });
      const findUnique = jest.fn().mockResolvedValue(rule);
      const prisma = {
        grammarRule: { findUnique },
      } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      const result = await service.getRuleDetail('ARTICLE_A_AN');

      expect(result.ruleCode).toBe('ARTICLE_A_AN');
      expect(result.exerciseTemplates).toEqual(
        rule.exerciseTemplates.exercises,
      );
      expect(result.examples).toHaveLength(1);
    });

    it('production: hides a REVIEWED (not yet PUBLISHED) rule behind 404', async () => {
      process.env.NODE_ENV = 'production';
      const rule = makeRule({ contentStatus: 'REVIEWED' });
      const findUnique = jest.fn().mockResolvedValue(rule);
      const prisma = {
        grammarRule: { findUnique },
      } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      await expect(service.getRuleDetail('ARTICLE_A_AN')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('production: returns a PUBLISHED rule', async () => {
      process.env.NODE_ENV = 'production';
      const rule = makeRule({ contentStatus: 'PUBLISHED' });
      const findUnique = jest.fn().mockResolvedValue(rule);
      const prisma = {
        grammarRule: { findUnique },
      } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      const result = await service.getRuleDetail('ARTICLE_A_AN');
      expect(result.ruleCode).toBe('ARTICLE_A_AN');
    });

    it('unknown ruleCode: 404', async () => {
      process.env.NODE_ENV = 'development';
      const findUnique = jest.fn().mockResolvedValue(null);
      const prisma = {
        grammarRule: { findUnique },
      } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      await expect(service.getRuleDetail('NOT_A_REAL_CODE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not expose contentStatus/sourceVerificationStatus in the response', async () => {
      process.env.NODE_ENV = 'development';
      const rule = makeRule({ contentStatus: 'REVIEWED' });
      const findUnique = jest.fn().mockResolvedValue(rule);
      const prisma = {
        grammarRule: { findUnique },
      } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      const result = await service.getRuleDetail('ARTICLE_A_AN');

      expect(result).not.toHaveProperty('contentStatus');
      expect(result).not.toHaveProperty('sourceVerificationStatus');
    });

    it('returns exactly the supported exercise data for the exercise set', async () => {
      process.env.NODE_ENV = 'development';
      const rule = makeRule({
        contentStatus: 'REVIEWED',
        exerciseTemplates: {
          exerciseSchemaVersion: '1.0',
          exercises: [
            {
              id: 'ex1',
              type: 'fill_blank',
              prompt: 'I saw ___ cat.',
              answer: 'a',
            },
            {
              id: 'ex2',
              type: 'choice',
              prompt: 'She ___ works here.',
              options: ['work', 'works'],
              answer: 'works',
            },
            {
              id: 'ex3',
              type: 'correct_sentence',
              prompt: 'She work here.',
              answer: 'She works here.',
            },
          ],
        },
      });
      const findUnique = jest.fn().mockResolvedValue(rule);
      const prisma = {
        grammarRule: { findUnique },
      } as unknown as PrismaService;
      const service = new GrammarService(prisma);

      const result = await service.getRuleDetail('ARTICLE_A_AN');

      expect(result.exerciseTemplates).toEqual(
        rule.exerciseTemplates.exercises,
      );
      expect(result.exerciseTemplates.map((e: any) => e.type)).toEqual([
        'fill_blank',
        'choice',
        'correct_sentence',
      ]);
    });
  });
});
