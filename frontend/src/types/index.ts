export type Role =
  | 'ADMINISTRATOR'
  | 'COMPLIANCE_OFFICER'
  | 'COMPLIANCE_MANAGER'
  | 'RISK_OWNER'
  | 'DEPARTMENT_MANAGER'
  | 'INTERNAL_AUDIT'
  | 'BOARD';

export type RiskStatus =
  | 'DRAFT'
  | 'NEW'
  | 'ASSESSMENT'
  | 'APPROVED'
  | 'MONITORING'
  | 'MITIGATION'
  | 'RESIDUAL_ASSESSMENT'
  | 'CLOSED'
  | 'ARCHIVED';

export const RISK_LIFECYCLE_ORDER: RiskStatus[] = [
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

export type SourceType =
  | 'CORRUPTION_RISK_ASSESSMENT'
  | 'ANTI_CORRUPTION_MONITORING'
  | 'CANDIDATE_DUE_DILIGENCE'
  | 'COUNTERPARTY_DUE_DILIGENCE'
  | 'INVESTIGATION'
  | 'HOTLINE'
  | 'CONFLICT_OF_INTEREST'
  | 'GIFTS'
  | 'AUDIT'
  | 'STATE_INSPECTION'
  | 'MEDIA'
  | 'HR'
  | 'PROCUREMENT'
  | 'INVESTMENT'
  | 'ESG';

export type ControlType = 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
export type ControlEffectiveness = 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE' | 'NOT_TESTED';
export type ActionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
export type IncidentAction = 'CREATE_RISK' | 'UPDATE_RISK' | 'CLOSE_RISK' | 'ESCALATE_RISK' | 'NONE';
export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
export type EntityType = 'RISK' | 'SOURCE' | 'CONTROL' | 'ACTION' | 'INCIDENT';

export interface NamedRef {
  id: string;
  name?: string;
  fullName?: string;
  title?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  title?: string | null;
  isActive: boolean;
  companyId?: string | null;
  departmentId?: string | null;
  company?: NamedRef | null;
  department?: NamedRef | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
  company?: NamedRef;
  isActive: boolean;
}

export interface BusinessProcess {
  id: string;
  name: string;
  departmentId: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  children?: Category[];
  isActive: boolean;
  _count?: { risks: number; children: number };
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  description?: string | null;
  referenceNumber?: string | null;
  occurredAt?: string | null;
  createdAt: string;
  _count?: { risks: number; incidents: number };
}

export interface Control {
  id: string;
  riskId: string;
  type: ControlType;
  title: string;
  description?: string | null;
  ownerId?: string | null;
  owner?: NamedRef | null;
  effectiveness: ControlEffectiveness;
  lastTestedAt?: string | null;
  createdAt: string;
}

export interface Action {
  id: string;
  riskId: string;
  risk?: { id: string; code: string; title: string; status: RiskStatus };
  title: string;
  description?: string | null;
  ownerId?: string | null;
  owner?: NamedRef | null;
  deadline?: string | null;
  status: ActionStatus;
  evidence?: string | null;
  result?: string | null;
  residualRiskImpact?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description?: string | null;
  occurredAt?: string | null;
  status: IncidentStatus;
  action: IncidentAction;
  sourceId?: string | null;
  source?: Source | null;
  riskId?: string | null;
  risk?: { id: string; code: string; title: string; status: RiskStatus } | null;
  reportedBy?: NamedRef | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  riskId: string;
  authorId?: string | null;
  author?: NamedRef | null;
  text: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  entityType: EntityType;
  entityId: string;
  riskId?: string | null;
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedBy?: NamedRef | null;
  createdAt: string;
}

export interface RiskHistoryEntry {
  id: string;
  riskId: string;
  version: number;
  snapshot: unknown;
  changedById?: string | null;
  changeNote?: string | null;
  createdAt: string;
}

export interface RiskListItem {
  id: string;
  code: string;
  title: string;
  status: RiskStatus;
  likelihood?: number | null;
  impact?: number | null;
  inherentScore?: number | null;
  residualScore?: number | null;
  category?: NamedRef | null;
  company?: NamedRef | null;
  department?: NamedRef | null;
  owner?: NamedRef | null;
  createdAt: string;
  updatedAt: string;
  _count?: { actions: number; controls: number };
}

export interface RiskDetail extends RiskListItem {
  description?: string | null;
  categoryId?: string | null;
  companyId?: string | null;
  departmentId?: string | null;
  businessProcessId?: string | null;
  businessProcess?: NamedRef | null;
  ownerId?: string | null;
  createdById?: string | null;
  createdBy?: NamedRef | null;
  residualLikelihood?: number | null;
  residualImpact?: number | null;
  controlEffectivenessAvg?: number | null;
  version: number;
  approvedAt?: string | null;
  closedAt?: string | null;
  archivedAt?: string | null;
  sources: Array<{ source: Source }>;
  controls: Control[];
  actions: Action[];
  incidents: Incident[];
  comments: Comment[];
  attachments: Attachment[];
  history: RiskHistoryEntry[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  kpis: {
    activeRisks: number;
    criticalRisks: number;
    residualRisks: number;
    overdueActions: number;
  };
  residualRiskSummary: {
    averageInherent: number;
    averageResidual: number;
    reductionPercent: number;
    count: number;
  };
  topCompanies: Array<{ id: string; name?: string; count: number }>;
  topDepartments: Array<{ id: string; name?: string; count: number }>;
  topCategories: Array<{ id: string; name?: string; count: number }>;
  heatMap: { grid: number[][] };
  trends: Array<{ month: string; created: number; closed: number }>;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}
