import { RiskStatus } from '@prisma/client';

/** Allowed forward/back transitions for the risk lifecycle described in PRD section 7. */
export const RISK_LIFECYCLE: Record<RiskStatus, RiskStatus[]> = {
  [RiskStatus.DRAFT]: [RiskStatus.NEW],
  [RiskStatus.NEW]: [RiskStatus.ASSESSMENT, RiskStatus.DRAFT],
  [RiskStatus.ASSESSMENT]: [RiskStatus.APPROVED, RiskStatus.NEW],
  [RiskStatus.APPROVED]: [RiskStatus.MONITORING, RiskStatus.ASSESSMENT],
  [RiskStatus.MONITORING]: [RiskStatus.MITIGATION, RiskStatus.APPROVED],
  [RiskStatus.MITIGATION]: [RiskStatus.RESIDUAL_ASSESSMENT, RiskStatus.MONITORING],
  [RiskStatus.RESIDUAL_ASSESSMENT]: [RiskStatus.CLOSED, RiskStatus.MITIGATION],
  [RiskStatus.CLOSED]: [RiskStatus.ARCHIVED, RiskStatus.MONITORING],
  [RiskStatus.ARCHIVED]: [],
};

export function scoreToLevel(score: number | null | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null {
  if (score === null || score === undefined) return null;
  if (score >= 15) return 'CRITICAL';
  if (score >= 9) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
}
