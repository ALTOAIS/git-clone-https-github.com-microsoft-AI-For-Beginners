import { AiControlSuggestion, AiRiskSuggestion } from '../types/ai-results';

export interface RiskSuggestionContext {
  processStepName: string;
  processStepDescription?: string;
  departmentName?: string;
  legalBasis?: string;
  existingFactorTypes: string[];
}

export interface ControlSuggestionContext {
  riskTitle: string;
  riskDescription?: string;
  corruptionScheme?: string;
  existingControls?: string;
}

export interface AnalysisFactsContext {
  analysisName: string;
  processStepsCount: number;
  factorsCount: number;
  risksCount: number;
  risksWithoutAssessment: number;
  risksWithoutRecommendations: number;
  recommendationsCount: number;
  actionItemsCount: number;
}

export interface ReportFactsContext {
  analysisName: string;
  code: string;
  subject?: string;
  processStepsCount: number;
  risksCount: number;
  actionItemsCount: number;
}

export interface RiskRegisterFactsContext {
  riskTitle: string;
  riskDescription?: string;
  corruptionScheme?: string;
}

export interface ChatFactsContext {
  message: string;
  moduleHint?: string;
  extraContext?: string;
}

export interface CrossModuleFactsContext {
  vakrOverdue: number;
  vakrTotal: number;
  criticalRisks: number;
  activeRisks: number;
  ineffectiveControls: number;
  incidentsOpen: number;
  incidentsUnderReview: number;
  academyCompletionPercent: number;
  academyOverdueAssignments: number;
}

/**
 * Abstraction over the underlying AI backend. Phase 1 ships `MockAiProvider`
 * only — the interface is designed so a real LLM-backed provider (Phase 2)
 * can be dropped in behind `AI_PROVIDER` without touching AiService.
 */
export interface AiProvider {
  readonly name: string;
  suggestRisks(ctx: RiskSuggestionContext): Promise<AiRiskSuggestion[]>;
  suggestControls(
    ctx: ControlSuggestionContext,
  ): Promise<AiControlSuggestion[]>;
  reviewAnalysis(ctx: AnalysisFactsContext): Promise<{
    missingConsiderations: string[];
    qualityIssues: string[];
    summary: string;
  }>;
  generateExecutiveSummary(ctx: ReportFactsContext): Promise<string>;
  proposeRiskRegisterEntry(ctx: RiskRegisterFactsContext): Promise<{
    title: string;
    description: string;
    categoryHint: string;
    justification: string;
  }>;
  chat(ctx: ChatFactsContext): Promise<string>;
  generateCrossModuleInsights(ctx: CrossModuleFactsContext): Promise<string[]>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
