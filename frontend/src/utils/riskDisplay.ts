import i18n from '../i18n';
import type { ActionStatus, ControlEffectiveness, IncidentStatus, RiskStatus, SourceType } from '../types';

export function riskStatusLabel(status: RiskStatus): string {
  return i18n.t(`riskStatus.${status}`);
}

export const RISK_STATUS_COLORS: Record<RiskStatus, string> = {
  DRAFT: 'default',
  NEW: 'blue',
  ASSESSMENT: 'gold',
  APPROVED: 'geekblue',
  MONITORING: 'purple',
  MITIGATION: 'orange',
  RESIDUAL_ASSESSMENT: 'cyan',
  CLOSED: 'green',
  ARCHIVED: 'default',
};

export const ALL_RISK_STATUSES: RiskStatus[] = [
  'DRAFT',
  'NEW',
  'ASSESSMENT',
  'APPROVED',
  'MONITORING',
  'MITIGATION',
  'RESIDUAL_ASSESSMENT',
  'CLOSED',
  'ARCHIVED',
];

export function scoreLevel(score?: number | null): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null {
  if (score === null || score === undefined) return null;
  if (score >= 15) return 'CRITICAL';
  if (score >= 9) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
}

export function scoreLevelLabel(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
  return i18n.t(`scoreLevel.${level}`);
}

export const SCORE_LEVEL_COLORS: Record<string, string> = {
  LOW: '#52c41a',
  MEDIUM: '#faad14',
  HIGH: '#fa8c16',
  CRITICAL: '#f5222d',
};

export const ALL_SOURCE_TYPES: SourceType[] = [
  'CORRUPTION_RISK_ASSESSMENT',
  'ANTI_CORRUPTION_MONITORING',
  'CANDIDATE_DUE_DILIGENCE',
  'COUNTERPARTY_DUE_DILIGENCE',
  'INVESTIGATION',
  'HOTLINE',
  'CONFLICT_OF_INTEREST',
  'GIFTS',
  'AUDIT',
  'STATE_INSPECTION',
  'MEDIA',
  'HR',
  'PROCUREMENT',
  'INVESTMENT',
  'ESG',
];

export function sourceTypeLabel(type: SourceType): string {
  return i18n.t(`sourceType.${type}`);
}

export const ALL_CONTROL_EFFECTIVENESS: ControlEffectiveness[] = [
  'EFFECTIVE',
  'PARTIALLY_EFFECTIVE',
  'INEFFECTIVE',
  'NOT_TESTED',
];

export function controlEffectivenessLabel(value: ControlEffectiveness): string {
  return i18n.t(`controlEffectiveness.${value}`);
}

export const CONTROL_EFFECTIVENESS_COLORS: Record<ControlEffectiveness, string> = {
  EFFECTIVE: 'green',
  PARTIALLY_EFFECTIVE: 'gold',
  INEFFECTIVE: 'red',
  NOT_TESTED: 'default',
};

export const ALL_ACTION_STATUSES: ActionStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'];

export function actionStatusLabel(status: ActionStatus): string {
  return i18n.t(`actionStatus.${status}`);
}

export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'gold',
  COMPLETED: 'green',
  OVERDUE: 'red',
  CANCELLED: 'default',
};

export const ALL_INCIDENT_STATUSES: IncidentStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'];

export function incidentStatusLabel(status: IncidentStatus): string {
  return i18n.t(`incidentStatus.${status}`);
}
