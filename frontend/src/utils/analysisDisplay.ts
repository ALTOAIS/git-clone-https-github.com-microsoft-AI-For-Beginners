import i18n from '../i18n';
import type {
  ActionPriority,
  AnalysisDocumentCategory,
  AnalysisStage,
  AnalysisStatus,
  CorruptogenicFactorType,
  ProcessControlPointType,
  RecommendationType,
} from '../types';

export const ANALYSIS_STAGE_ORDER: AnalysisStage[] = [
  'CREATION',
  'PLANNING',
  'WORKING_GROUP',
  'DOCUMENTS',
  'PROCESS_MAP',
  'FACTORS',
  'RISKS',
  'ASSESSMENT',
  'RECOMMENDATIONS',
  'ACTION_PLAN',
  'COORDINATION',
  'APPROVAL',
  'MONITORING',
  'REASSESSMENT',
];

export const IMPLEMENTED_ANALYSIS_STAGES: AnalysisStage[] = [
  'CREATION',
  'PLANNING',
  'WORKING_GROUP',
  'DOCUMENTS',
  'PROCESS_MAP',
  'FACTORS',
  'RISKS',
  'ASSESSMENT',
  'RECOMMENDATIONS',
  'ACTION_PLAN',
];

export function analysisStageLabel(stage: AnalysisStage): string {
  return i18n.t(`analysisStage.${stage}`);
}

export function analysisStatusLabel(status: AnalysisStatus): string {
  return i18n.t(`analysisStatus.${status}`);
}

export const ANALYSIS_STATUS_COLORS: Record<AnalysisStatus, string> = {
  DRAFT: 'default',
  IN_PROGRESS: 'blue',
  OVERDUE: 'red',
  COMPLETED: 'green',
  ARCHIVED: 'default',
};

export const ALL_ANALYSIS_STATUSES: AnalysisStatus[] = ['DRAFT', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED', 'ARCHIVED'];

export const ALL_ANALYSIS_DOCUMENT_CATEGORIES: AnalysisDocumentCategory[] = [
  'LAW',
  'INTERNAL_DOCUMENT',
  'REGULATION',
  'PROCEDURE',
  'POLICY',
  'INSTRUCTION',
  'ORG_STRUCTURE',
  'JOB_DESCRIPTION',
  'PROCESS_MAP',
  'PREVIOUS_ANALYSIS',
  'INSPECTION_MATERIALS',
  'APPEAL',
  'COURT_PRACTICE',
  'OTHER',
];

export function analysisDocumentCategoryLabel(category: AnalysisDocumentCategory): string {
  return i18n.t(`analysisDocumentCategory.${category}`);
}

export const ALL_PROCESS_CONTROL_POINT_TYPES: ProcessControlPointType[] = [
  'DECISION_MAKING',
  'DISCRETIONARY_POWERS',
  'EXTERNAL_CONTACTS',
  'FINANCIAL_OPERATIONS',
  'HR_DECISIONS',
  'PROCUREMENT',
  'DIGITAL_SYSTEMS',
  'CONTROL_MEASURES',
];

export function processControlPointTypeLabel(value: ProcessControlPointType): string {
  return i18n.t(`processControlPointType.${value}`);
}

export const ALL_CORRUPTOGENIC_FACTOR_TYPES: CorruptogenicFactorType[] = [
  'DISCRETION',
  'CONFLICT_OF_INTEREST',
  'LACK_OF_CONTROL',
  'OPACITY',
  'EXCEPTIONS',
  'MANUAL_OPERATIONS',
  'INFORMATION_ACCESS',
  'SUPPLIER_CONTACTS',
  'HR_DECISIONS',
  'FINANCIAL_OPERATIONS',
  'PROCUREMENT',
  'PERMITS',
  'PROPERTY_USE',
];

export function corruptogenicFactorTypeLabel(value: CorruptogenicFactorType): string {
  return i18n.t(`corruptogenicFactorType.${value}`);
}

export const ALL_RECOMMENDATION_TYPES: RecommendationType[] = [
  'ORGANIZATIONAL',
  'REGULATORY',
  'HR',
  'DIGITALIZATION',
  'AUTOMATION',
  'STRONGER_CONTROLS',
  'SEPARATION_OF_DUTIES',
  'PROCESS_CHANGE',
  'TRAINING',
  'MONITORING',
];

export function recommendationTypeLabel(value: RecommendationType): string {
  return i18n.t(`recommendationType.${value}`);
}

export const ALL_ACTION_PRIORITIES: ActionPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export function actionPriorityLabel(value: ActionPriority): string {
  return i18n.t(`actionPriority.${value}`);
}

export const ACTION_PRIORITY_COLORS: Record<ActionPriority, string> = {
  LOW: 'default',
  MEDIUM: 'gold',
  HIGH: 'red',
};
