import type { ActionStatus, ControlEffectiveness, IncidentStatus, RiskStatus, SourceType } from '../types';

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  DRAFT: 'Draft',
  NEW: 'New',
  ASSESSMENT: 'Assessment',
  APPROVED: 'Approved',
  MONITORING: 'Monitoring',
  MITIGATION: 'Mitigation',
  RESIDUAL_ASSESSMENT: 'Residual Assessment',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

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

export function scoreLevel(score?: number | null): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null {
  if (score === null || score === undefined) return null;
  if (score >= 15) return 'CRITICAL';
  if (score >= 9) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
}

export const SCORE_LEVEL_COLORS: Record<string, string> = {
  LOW: '#52c41a',
  MEDIUM: '#faad14',
  HIGH: '#fa8c16',
  CRITICAL: '#f5222d',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  CORRUPTION_RISK_ASSESSMENT: 'Corruption Risk Assessment',
  ANTI_CORRUPTION_MONITORING: 'Anti-Corruption Monitoring',
  CANDIDATE_DUE_DILIGENCE: 'Candidate Due Diligence',
  COUNTERPARTY_DUE_DILIGENCE: 'Counterparty Due Diligence',
  INVESTIGATION: 'Investigation',
  HOTLINE: 'Hotline',
  CONFLICT_OF_INTEREST: 'Conflict of Interest',
  GIFTS: 'Gifts',
  AUDIT: 'Audit',
  STATE_INSPECTION: 'State Inspection',
  MEDIA: 'Media',
  HR: 'HR',
  PROCUREMENT: 'Procurement',
  INVESTMENT: 'Investment',
  ESG: 'ESG',
};

export const CONTROL_EFFECTIVENESS_LABELS: Record<ControlEffectiveness, string> = {
  EFFECTIVE: 'Effective',
  PARTIALLY_EFFECTIVE: 'Partially Effective',
  INEFFECTIVE: 'Ineffective',
  NOT_TESTED: 'Not Tested',
};

export const CONTROL_EFFECTIVENESS_COLORS: Record<ControlEffectiveness, string> = {
  EFFECTIVE: 'green',
  PARTIALLY_EFFECTIVE: 'gold',
  INEFFECTIVE: 'red',
  NOT_TESTED: 'default',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'gold',
  COMPLETED: 'green',
  OVERDUE: 'red',
  CANCELLED: 'default',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under Review',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};
