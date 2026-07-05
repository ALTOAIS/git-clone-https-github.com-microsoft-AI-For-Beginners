import i18n from '../i18n';
import type { AnalysisDocumentCategory, AnalysisStage, AnalysisStatus } from '../types';

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

export const IMPLEMENTED_ANALYSIS_STAGES: AnalysisStage[] = ['CREATION', 'PLANNING', 'WORKING_GROUP', 'DOCUMENTS'];

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
