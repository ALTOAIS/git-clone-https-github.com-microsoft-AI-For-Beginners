import i18n from '../i18n';
import type { Role } from '../types';

export const ALL_ROLES: Role[] = [
  'ADMINISTRATOR',
  'COMPLIANCE_OFFICER',
  'COMPLIANCE_MANAGER',
  'RISK_OWNER',
  'DEPARTMENT_MANAGER',
  'INTERNAL_AUDIT',
  'BOARD',
];

export function roleLabel(role: Role): string {
  return i18n.t(`roles.${role}`);
}

export function hasRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}
