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
  analyses: AnalysesSummary;
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

// ------------------------------------------------------------------
// Внутренний анализ коррупционных рисков (ВАКР)
// ------------------------------------------------------------------

export type AnalysisStage =
  | 'CREATION'
  | 'PLANNING'
  | 'WORKING_GROUP'
  | 'DOCUMENTS'
  | 'PROCESS_MAP'
  | 'FACTORS'
  | 'RISKS'
  | 'ASSESSMENT'
  | 'RECOMMENDATIONS'
  | 'ACTION_PLAN'
  | 'COORDINATION'
  | 'APPROVAL'
  | 'MONITORING'
  | 'REASSESSMENT';

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
  'COORDINATION',
  'APPROVAL',
  'MONITORING',
  'REASSESSMENT',
];

export type AnalysisStatus = 'DRAFT' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED' | 'ARCHIVED';

export type AnalysisDocumentCategory =
  | 'LAW'
  | 'INTERNAL_DOCUMENT'
  | 'REGULATION'
  | 'PROCEDURE'
  | 'POLICY'
  | 'INSTRUCTION'
  | 'ORG_STRUCTURE'
  | 'JOB_DESCRIPTION'
  | 'PROCESS_MAP'
  | 'PREVIOUS_ANALYSIS'
  | 'INSPECTION_MATERIALS'
  | 'APPEAL'
  | 'COURT_PRACTICE'
  | 'OTHER';

export interface AnalysisDepartmentLink {
  id: string;
  departmentId: string;
  department: NamedRef;
}

export interface AnalysisPlanItem {
  id: string;
  process: string;
  direction?: string | null;
  departmentId?: string | null;
  department?: NamedRef | null;
  ownerId?: string | null;
  owner?: NamedRef | null;
  deadline?: string | null;
  checkpoint?: string | null;
}

export interface AnalysisWorkingGroupMember {
  id: string;
  userId: string;
  user: NamedRef & { email: string; role: Role };
  role: string;
  functions?: string | null;
  responsibilityArea?: string | null;
  tasks?: string | null;
  completed: boolean;
}

export interface AnalysisDocument {
  id: string;
  category: AnalysisDocumentCategory;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy?: NamedRef | null;
  createdAt: string;
}

export interface AnalysisListItem {
  id: string;
  code: string;
  name: string;
  companyId?: string | null;
  company?: NamedRef | null;
  leadId?: string | null;
  lead?: NamedRef | null;
  stage: AnalysisStage;
  status: AnalysisStatus;
  deadline?: string | null;
  createdAt: string;
  _count?: { workingGroup: number; documents: number; planItems: number };
}

export interface AnalysisDetail extends AnalysisListItem {
  subject?: string | null;
  legalBasis?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  completedAt?: string | null;
  reassessmentNotes?: string | null;
  reassessedAt?: string | null;
  createdById?: string | null;
  createdBy?: NamedRef | null;
  departments: AnalysisDepartmentLink[];
  workingGroup: AnalysisWorkingGroupMember[];
  planItems: AnalysisPlanItem[];
  documents: AnalysisDocument[];
  processSteps: AnalysisProcessStep[];
  factors: AnalysisFactor[];
  risks: AnalysisRisk[];
  recommendations: AnalysisRecommendation[];
  actionItems: AnalysisActionItem[];
  comments: AnalysisComment[];
}

export interface AnalysisComment {
  id: string;
  text: string;
  author?: NamedRef | null;
  createdAt: string;
}

export interface AnalysisHistoryEntry {
  id: string;
  action: string;
  user?: NamedRef | null;
  changes?: unknown;
  createdAt: string;
}

export interface AnalysesSummary {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
}

// ------------------------------------------------------------------
// ВАКР — Stages 5-8: process map, factors, risks, assessment
// ------------------------------------------------------------------

export type ProcessControlPointType =
  | 'DECISION_MAKING'
  | 'DISCRETIONARY_POWERS'
  | 'EXTERNAL_CONTACTS'
  | 'FINANCIAL_OPERATIONS'
  | 'HR_DECISIONS'
  | 'PROCUREMENT'
  | 'DIGITAL_SYSTEMS'
  | 'CONTROL_MEASURES';

export type CorruptogenicFactorType =
  | 'DISCRETION'
  | 'CONFLICT_OF_INTEREST'
  | 'LACK_OF_CONTROL'
  | 'OPACITY'
  | 'EXCEPTIONS'
  | 'MANUAL_OPERATIONS'
  | 'INFORMATION_ACCESS'
  | 'SUPPLIER_CONTACTS'
  | 'HR_DECISIONS'
  | 'FINANCIAL_OPERATIONS'
  | 'PROCUREMENT'
  | 'PERMITS'
  | 'PROPERTY_USE';

export interface AnalysisProcessStep {
  id: string;
  order: number;
  name: string;
  description?: string | null;
  departmentId?: string | null;
  department?: NamedRef | null;
  executorId?: string | null;
  executor?: NamedRef | null;
  legalBasis?: string | null;
  inputDescription?: string | null;
  outputDescription?: string | null;
  controlPoints: ProcessControlPointType[];
}

export interface AnalysisFactor {
  id: string;
  processStepId?: string | null;
  processStep?: NamedRef | null;
  factorType: CorruptogenicFactorType;
  description?: string | null;
}

export interface AnalysisRisk {
  id: string;
  factorId?: string | null;
  factor?: { id: string; factorType: CorruptogenicFactorType } | null;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  category?: NamedRef | null;
  source?: string | null;
  cause?: string | null;
  conditions?: string | null;
  corruptionScheme?: string | null;
  interestedParties?: string | null;
  consequences?: string | null;
  existingControls?: string | null;
  ownerId?: string | null;
  owner?: NamedRef | null;
  likelihood?: number | null;
  impact?: number | null;
  score?: number | null;
  controlEffectiveness: ControlEffectiveness;
  residualLikelihood?: number | null;
  residualImpact?: number | null;
  residualScore?: number | null;
  linkedRiskId?: string | null;
}

// ------------------------------------------------------------------
// ВАКР — Stages 9-10: recommendations, action plan
// ------------------------------------------------------------------

export type RecommendationType =
  | 'ORGANIZATIONAL'
  | 'REGULATORY'
  | 'HR'
  | 'DIGITALIZATION'
  | 'AUTOMATION'
  | 'STRONGER_CONTROLS'
  | 'SEPARATION_OF_DUTIES'
  | 'PROCESS_CHANGE'
  | 'TRAINING'
  | 'MONITORING';

export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AnalysisRecommendation {
  id: string;
  riskId?: string | null;
  risk?: { id: string; title: string } | null;
  type: RecommendationType;
  description: string;
  responsibleId?: string | null;
  responsible?: NamedRef | null;
}

export interface AnalysisActionItem {
  id: string;
  recommendationId?: string | null;
  recommendation?: { id: string; type: RecommendationType } | null;
  task: string;
  expectedResult?: string | null;
  responsibleId?: string | null;
  responsible?: NamedRef | null;
  departmentId?: string | null;
  department?: NamedRef | null;
  deadline?: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  supportingDocs?: string | null;
  comments?: string | null;
  linkedActionId?: string | null;
}

// ------------------------------------------------------------------
// Академия комплаенса
// ------------------------------------------------------------------

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type LessonContentType =
  | 'PRESENTATION'
  | 'ARTICLE'
  | 'INSTRUCTION'
  | 'MEMO'
  | 'CHECKLIST'
  | 'VIDEO'
  | 'WEBINAR'
  | 'IN_PERSON_EVENT'
  | 'EBOOK'
  | 'PDF_COURSE'
  | 'INTERACTIVE'
  | 'PRACTICAL_TASK'
  | 'CASE_STUDY';

export type CourseAssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface CourseLesson {
  id: string;
  order: number;
  title: string;
  contentType: LessonContentType;
  content?: string | null;
  durationMinutes?: number | null;
  scheduledAt?: string | null;
}

export interface CourseModule {
  id: string;
  order: number;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseAssignment {
  id: string;
  courseId: string;
  userId: string;
  user?: NamedRef & { email: string };
  status: CourseAssignmentStatus;
  assignedById?: string | null;
  assignedBy?: NamedRef | null;
  dueDate?: string | null;
  progressPercent: number;
  completedAt?: string | null;
  createdAt: string;
}

export interface CourseListItem {
  id: string;
  title: string;
  description?: string | null;
  status: CourseStatus;
  isMandatory: boolean;
  applicableRoles: Role[];
  createdBy?: NamedRef | null;
  createdAt: string;
  _count?: { modules: number; assignments: number };
}

export interface CourseDetail extends CourseListItem {
  modules: CourseModule[];
  assignments: CourseAssignment[];
}

export interface MyCourseAssignment {
  id: string;
  status: CourseAssignmentStatus;
  progressPercent: number;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  course: { id: string; title: string; description?: string | null; isMandatory: boolean };
}

export interface AcademySummary {
  totalCourses: number;
  totalAssigned: number;
  completed: number;
  overdue: number;
  completionPercent: number;
  averageProgress: number;
}

export interface CalendarDeadline {
  id: string;
  dueDate: string;
  status: CourseAssignmentStatus;
  course: { id: string; title: string };
  user: NamedRef;
}

export interface CalendarEvent {
  id: string;
  title: string;
  contentType: LessonContentType;
  scheduledAt: string;
  module: { title: string; course: { id: string; title: string } };
}

export interface AcademyCalendar {
  deadlines: CalendarDeadline[];
  events: CalendarEvent[];
}

export interface TrainingMatrixCourse {
  id: string;
  title: string;
  status: CourseStatus;
  isMandatory: boolean;
  applicableRoles: Role[];
}

export interface TrainingMatrixRoleStats {
  assigned: number;
  completed: number;
}

export interface TrainingMatrix {
  courses: TrainingMatrixCourse[];
  stats: Record<string, Partial<Record<Role, TrainingMatrixRoleStats>>>;
}

// ------------------------------------------------------------------
// Тестирование и Проверка знаний
// ------------------------------------------------------------------

export type TestQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export type TestAttemptStage = 'BEFORE' | 'AFTER' | 'CHECK_3M' | 'CHECK_6M' | 'ANNUAL';

export interface TestQuestionOption {
  id: string;
  order: number;
  text: string;
  isCorrect?: boolean;
}

export interface TestQuestion {
  id: string;
  order: number;
  type: TestQuestionType;
  text: string;
  points: number;
  correctAnswerText?: string | null;
  options: TestQuestionOption[];
}

export interface TestDetail {
  id: string;
  courseId: string;
  title: string;
  passScorePercent: number;
  questions: TestQuestion[];
}

export interface TestAttempt {
  id: string;
  testId: string;
  userId: string;
  user?: NamedRef & { email: string };
  stage: TestAttemptStage;
  scorePercent: number;
  passed: boolean;
  answers: Record<string, unknown>;
  submittedAt: string;
}
