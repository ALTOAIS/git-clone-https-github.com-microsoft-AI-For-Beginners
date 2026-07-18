import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedGrammarContentStatuses } from './grammar-publication-gate';
import { GrammarExerciseTemplateSet } from './exercise-templates';

export interface GrammarRuleListItem {
  ruleCode: string;
  titleRu: string;
  titleEn: string | null;
  shortExplanationRu: string;
  cefrLevel: string;
}

export interface GrammarRuleExampleDto {
  exampleType: string;
  sentence: string;
  correction: string | null;
  explanation: string | null;
  context: string | null;
  sortOrder: number;
}

export interface GrammarRuleDetail {
  ruleCode: string;
  titleRu: string;
  titleEn: string | null;
  shortExplanationRu: string;
  explanationRu: string;
  formula: string | null;
  cefrLevel: string;
  examples: GrammarRuleExampleDto[];
  exerciseTemplates: GrammarExerciseTemplateSet['exercises'];
}

/**
 * Read-only Grammar MVP module. No method here ever writes to GrammarRule
 * or GrammarRuleExample — this is a browse/study surface only, entirely
 * separate from content import and from the (still inactive) resolver.
 */
@Injectable()
export class GrammarService {
  constructor(private prisma: PrismaService) {}

  async listRules(): Promise<GrammarRuleListItem[]> {
    const statuses = allowedGrammarContentStatuses();
    const rules = await this.prisma.grammarRule.findMany({
      where: { contentStatus: { in: statuses } },
      orderBy: [{ cefrLevel: 'asc' }, { titleRu: 'asc' }],
      select: {
        ruleCode: true,
        titleRu: true,
        titleEn: true,
        shortExplanationRu: true,
        cefrLevel: true,
      },
    });
    return rules;
  }

  async getRuleDetail(ruleCode: string): Promise<GrammarRuleDetail> {
    const statuses = allowedGrammarContentStatuses();
    const rule = await this.prisma.grammarRule.findUnique({
      where: { ruleCode },
      include: { examples: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!rule || !statuses.includes(rule.contentStatus)) {
      throw new NotFoundException('Правило не найдено');
    }
    const templateSet =
      rule.exerciseTemplates as unknown as GrammarExerciseTemplateSet;
    return {
      ruleCode: rule.ruleCode,
      titleRu: rule.titleRu,
      titleEn: rule.titleEn,
      shortExplanationRu: rule.shortExplanationRu,
      explanationRu: rule.explanationRu,
      formula: rule.formula,
      cefrLevel: rule.cefrLevel,
      examples: rule.examples.map((e) => ({
        exampleType: e.exampleType,
        sentence: e.sentence,
        correction: e.correction,
        explanation: e.explanation,
        context: e.context,
        sortOrder: e.sortOrder,
      })),
      exerciseTemplates: templateSet.exercises,
    };
  }
}
