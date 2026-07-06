export type AiConfidence = 'high' | 'medium' | 'low';

export interface AiMitigationMeasure {
  measure: string;
  responsibleUnit: string;
  deadline: string;
  expectedResult: string;
}

export interface AiRiskSuggestion {
  riskTitle: string;
  riskDescription: string;
  processStage: string;
  riskFactors: string[];
  possibleSchemes: string[];
  rootCauses: string[];
  recommendedControls: string[];
  mitigationMeasures: AiMitigationMeasure[];
  confidence: AiConfidence;
}

export interface AiControlSuggestion {
  controlType: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  description: string;
  implementationNotes: string;
  confidence: AiConfidence;
}

export interface AiReviewResult {
  completenessScore: number;
  coveredStages: string[];
  missingConsiderations: string[];
  qualityIssues: string[];
  summary: string;
}

export interface AiReportSection {
  heading: string;
  content: string;
}

export interface AiReportResult {
  title: string;
  generatedAt: string;
  sections: AiReportSection[];
}

export interface AiRiskRegisterEntryProposal {
  title: string;
  description: string;
  categoryHint: string;
  likelihood?: number;
  impact?: number;
  justification: string;
}

export interface AiChatResult {
  reply: string;
}

export interface AiRiskIntelligenceDashboard {
  vakr: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  riskRegister: { active: number; critical: number };
  controlEffectiveness: Record<string, number>;
  incidents: {
    total: number;
    open: number;
    underReview: number;
    resolved: number;
    closed: number;
  };
  academy: { completionPercent: number; overdueAssignments: number };
  insights: string[];
}

export const AI_ADVISORY_DISCLAIMER =
  'Результат сформирован ИИ и носит рекомендательный характер. Перед использованием обязательно проверьте и подтвердите его комплаенс-офицером.';
