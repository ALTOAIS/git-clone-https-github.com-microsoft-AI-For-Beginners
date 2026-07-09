import { LessonContentType, TestQuestionType } from '@prisma/client';
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

export interface CourseOutlineContext {
  topic: string;
  audienceHint?: string;
  moduleCount: number;
  /** базовый / средний / продвинутый */
  level?: string;
  /** Ориентировочная длительность курса, часов */
  durationHours?: number;
  /** Цели обучения, заданные автором курса */
  goals?: string[];
  /** Извлечённый текст загруженного материала-источника (уже усечён) */
  sourceText?: string;
}

export interface CourseOutlineLessonDraft {
  order: number;
  title: string;
  contentType: LessonContentType;
  content?: string;
}

export interface CourseOutlineModuleDraft {
  order: number;
  title: string;
  lessons: CourseOutlineLessonDraft[];
}

export interface CourseOutlineDraft {
  /** Предлагаемое название курса (если пользователь его ещё не задал) */
  title?: string;
  description: string;
  goals?: string[];
  modules: CourseOutlineModuleDraft[];
  recommendedTest?: { title: string; questionCount: number };
  recommendedCases?: string[];
}

export interface LessonContentContext {
  courseTopic: string;
  lessonTitle: string;
  contentType: LessonContentType;
  audienceHint?: string;
  durationMinutes?: number;
  sourceText?: string;
}

export interface LessonContentDraft {
  content: string;
  goal?: string;
  keyPoints?: string[];
  practicalExample?: string;
  selfCheckQuestions?: string[];
}

export interface QuizQuestionsContext {
  topic: string;
  questionCount: number;
  /** базовый / средний / продвинутый */
  difficulty?: string;
  questionTypes?: TestQuestionType[];
  sourceText?: string;
}

export interface QuizQuestionOptionDraft {
  order: number;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionDraft {
  order: number;
  type: TestQuestionType;
  text: string;
  points: number;
  options?: QuizQuestionOptionDraft[];
  correctAnswerText?: string;
  /** Пояснение, почему ответ правильный */
  explanation?: string;
}

export interface QuizDraft {
  questions: QuizQuestionDraft[];
  suggestedPassingScore?: number;
}

export interface CaseStudyContext {
  topic: string;
  audienceHint?: string;
  sourceText?: string;
}

export interface CaseStudyDraft {
  title: string;
  situation: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  correctApproach: string;
  analysis: string;
  complianceRiskLink: string;
}

export interface MemoContext {
  topic: string;
  audienceHint?: string;
  sourceText?: string;
}

export interface MemoDraft {
  title: string;
  summary: string;
  checklist: string[];
  prohibited: string[];
  required: string[];
  contacts: string;
}

export interface CampaignMessageContext {
  topic: string;
  courseTitle?: string;
  linkHint?: string;
  sourceText?: string;
}

export interface CampaignMessageDraft {
  subject: string;
  body: string;
  keyPoints: string[];
  linkText?: string;
  surveyQuestions: string[];
}

export interface AiCallInfo {
  provider: string;
  model?: string;
  /** SUCCESS | ERROR | ERROR_FALLBACK */
  status: string;
  errorMessage?: string;
}

export interface ImproveDescriptionContext {
  title: string;
  description: string;
}

export interface SuggestRiskActionsContext {
  riskTitle: string;
  riskDescription?: string;
  corruptionScheme?: string;
  existingActions?: string;
}

export interface GenerateRiskForProcessContext {
  processDescription: string;
  directionHint?: string;
}

export interface RiskTemplateDraft {
  title: string;
  description: string;
  causes: string;
  corruptionScheme: string;
  corruptionFactors: string;
  consequences: string;
  redFlags: string;
  typicalControls: string[];
  recommendedActions: string[];
  tags: string[];
  baseProbability: number;
  baseImpact: number;
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
  generateCourseOutline(ctx: CourseOutlineContext): Promise<CourseOutlineDraft>;
  generateLessonContent(ctx: LessonContentContext): Promise<LessonContentDraft>;
  generateQuizQuestions(
    ctx: QuizQuestionsContext,
  ): Promise<QuizQuestionDraft[]>;
  generateQuiz(ctx: QuizQuestionsContext): Promise<QuizDraft>;
  generateCaseStudy(ctx: CaseStudyContext): Promise<CaseStudyDraft>;
  generateMemo(ctx: MemoContext): Promise<MemoDraft>;
  generateCampaignMessage(
    ctx: CampaignMessageContext,
  ): Promise<CampaignMessageDraft>;
  improveRiskDescription(
    ctx: ImproveDescriptionContext,
  ): Promise<{ improvedDescription: string }>;
  suggestRiskActions(ctx: SuggestRiskActionsContext): Promise<string[]>;
  generateRiskForProcess(
    ctx: GenerateRiskForProcessContext,
  ): Promise<RiskTemplateDraft>;
  /**
   * Метаданные последнего вызова (провайдер/модель/статус/ошибка) для
   * записи в AiInteractionLog. Опционально: MockAiProvider не реализует.
   */
  describeLastCall?(): AiCallInfo | undefined;
}

export const AI_PROVIDER = 'AI_PROVIDER';
