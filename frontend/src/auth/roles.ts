import type { Role } from '../types';

export const ROLE_LABELS: Record<Role, string> = {
  ADMINISTRATOR: 'Administrator',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  COMPLIANCE_MANAGER: 'Compliance Manager',
  RISK_OWNER: 'Risk Owner',
  DEPARTMENT_MANAGER: 'Department Manager',
  INTERNAL_AUDIT: 'Internal Audit',
  BOARD: 'Board',
};

export const ALL_ROLES: Role[] = Object.keys(ROLE_LABELS) as Role[];

export function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}
