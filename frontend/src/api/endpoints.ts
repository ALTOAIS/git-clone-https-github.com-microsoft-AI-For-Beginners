import { apiClient } from './client';
import type {
  Action,
  AnalysisDetail,
  AnalysisListItem,
  AppNotification,
  BusinessProcess,
  Category,
  Comment,
  Company,
  Control,
  DashboardSummary,
  Department,
  Incident,
  Paginated,
  RiskDetail,
  RiskListItem,
  Source,
  User,
} from '../types';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
  logout: (refreshToken: string) => apiClient.post('/auth/logout', { refreshToken }),
  me: () => apiClient.get<User>('/users/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }),
};

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
export const companiesApi = {
  list: () => apiClient.get<Company[]>('/companies'),
  get: (id: string) => apiClient.get<Company>(`/companies/${id}`),
  create: (data: Partial<Company>) => apiClient.post<Company>('/companies', data),
  update: (id: string, data: Partial<Company>) => apiClient.patch<Company>(`/companies/${id}`, data),
  remove: (id: string) => apiClient.delete(`/companies/${id}`),
};

export const departmentsApi = {
  list: (companyId?: string) => apiClient.get<Department[]>('/departments', { params: { companyId } }),
  get: (id: string) => apiClient.get<Department>(`/departments/${id}`),
  create: (data: { name: string; companyId: string }) => apiClient.post<Department>('/departments', data),
  update: (id: string, data: Partial<Department>) => apiClient.patch<Department>(`/departments/${id}`, data),
  remove: (id: string) => apiClient.delete(`/departments/${id}`),
};

export const businessProcessesApi = {
  list: (departmentId?: string) =>
    apiClient.get<BusinessProcess[]>('/business-processes', { params: { departmentId } }),
  create: (data: { name: string; departmentId: string }) => apiClient.post<BusinessProcess>('/business-processes', data),
  update: (id: string, data: Partial<BusinessProcess>) => apiClient.patch(`/business-processes/${id}`, data),
  remove: (id: string) => apiClient.delete(`/business-processes/${id}`),
};

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
  tree: () => apiClient.get<Category[]>('/categories/tree'),
  create: (data: { name: string; description?: string; parentId?: string }) =>
    apiClient.post<Category>('/categories', data),
  update: (id: string, data: Partial<Category>) => apiClient.patch<Category>(`/categories/${id}`, data),
  remove: (id: string) => apiClient.delete(`/categories/${id}`),
};

export const usersApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; role?: string }) =>
    apiClient.get<Paginated<User>>('/users', { params }),
  get: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<User>('/users', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<User>(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) => apiClient.patch(`/users/${id}/reset-password`, { newPassword }),
  remove: (id: string) => apiClient.delete(`/users/${id}`),
};

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------
export const sourcesApi = {
  list: (params: { page?: number; pageSize?: number; type?: string; search?: string }) =>
    apiClient.get<Paginated<Source>>('/sources', { params }),
  get: (id: string) => apiClient.get<Source>(`/sources/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<Source>('/sources', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<Source>(`/sources/${id}`, data),
  remove: (id: string) => apiClient.delete(`/sources/${id}`),
  link: (id: string, riskId: string) => apiClient.post(`/sources/${id}/link/${riskId}`),
  unlink: (id: string, riskId: string) => apiClient.delete(`/sources/${id}/link/${riskId}`),
};

// ---------------------------------------------------------------------------
// Risks
// ---------------------------------------------------------------------------
export interface RiskQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  categoryId?: string;
  companyId?: string;
  departmentId?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const risksApi = {
  list: (params: RiskQuery) => apiClient.get<Paginated<RiskListItem>>('/risks', { params }),
  get: (id: string) => apiClient.get<RiskDetail>(`/risks/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<RiskDetail>('/risks', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<RiskDetail>(`/risks/${id}`, data),
  assess: (id: string, data: Record<string, unknown>) => apiClient.patch<RiskDetail>(`/risks/${id}/assess`, data),
  changeStatus: (id: string, status: string, note?: string) =>
    apiClient.patch<RiskDetail>(`/risks/${id}/status`, { status, note }),
  archive: (id: string) => apiClient.patch<RiskDetail>(`/risks/${id}/archive`),
  remove: (id: string) => apiClient.delete(`/risks/${id}`),
};

// ---------------------------------------------------------------------------
// Controls / Actions / Incidents / Comments / Attachments
// ---------------------------------------------------------------------------
export const controlsApi = {
  listForRisk: (riskId: string) => apiClient.get<Control[]>('/controls', { params: { riskId } }),
  create: (data: Record<string, unknown>) => apiClient.post<Control>('/controls', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<Control>(`/controls/${id}`, data),
  remove: (id: string) => apiClient.delete(`/controls/${id}`),
};

export const actionsApi = {
  list: (params: Record<string, unknown>) => apiClient.get<Paginated<Action>>('/actions', { params }),
  overdue: () => apiClient.get<Action[]>('/actions/overdue'),
  create: (data: Record<string, unknown>) => apiClient.post<Action>('/actions', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<Action>(`/actions/${id}`, data),
  remove: (id: string) => apiClient.delete(`/actions/${id}`),
};

export const incidentsApi = {
  list: (params: Record<string, unknown>) => apiClient.get<Paginated<Incident>>('/incidents', { params }),
  get: (id: string) => apiClient.get<Incident>(`/incidents/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<Incident>('/incidents', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<Incident>(`/incidents/${id}`, data),
  remove: (id: string) => apiClient.delete(`/incidents/${id}`),
};

export const commentsApi = {
  listForRisk: (riskId: string) => apiClient.get<Comment[]>('/comments', { params: { riskId } }),
  create: (riskId: string, text: string) => apiClient.post<Comment>('/comments', { riskId, text }),
  remove: (id: string) => apiClient.delete(`/comments/${id}`),
};

export const attachmentsApi = {
  listForRisk: (riskId: string) => apiClient.get(`/attachments`, { params: { riskId } }),
  upload: (file: File, entityType: string, entityId: string, riskId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/attachments', formData, {
      params: { entityType, entityId, riskId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadPath: (id: string) => `/attachments/${id}/download`,
  remove: (id: string) => apiClient.delete(`/attachments/${id}`),
};

// ---------------------------------------------------------------------------
// Analytics / Dashboard / Reports / Notifications
// ---------------------------------------------------------------------------
export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummary>('/dashboard/summary'),
};

export const analyticsApi = {
  heatmap: (kind: 'inherent' | 'residual') => apiClient.get('/analytics/heatmap', { params: { kind } }),
  trends: (months?: number) => apiClient.get('/analytics/trends', { params: { months } }),
  topRisks: (limit?: number) => apiClient.get('/analytics/top-risks', { params: { limit } }),
  topCompanies: (limit?: number) => apiClient.get('/analytics/top-companies', { params: { limit } }),
  topDepartments: (limit?: number) => apiClient.get('/analytics/top-departments', { params: { limit } }),
  topCategories: (limit?: number) => apiClient.get('/analytics/top-categories', { params: { limit } }),
  topSources: (limit?: number) => apiClient.get('/analytics/top-sources', { params: { limit } }),
  controlEffectiveness: () => apiClient.get('/analytics/control-effectiveness'),
  residualRisk: () => apiClient.get('/analytics/residual-risk'),
};

export const reportsApi = {
  exportPath: (kind: string, format: 'csv' | 'xlsx') => `/reports/${kind}/export?format=${format}`,
  pdfPath: (kind: 'board' | 'audit-committee' | 'compliance') => `/reports/${kind}`,
};

export const notificationsApi = {
  list: (unreadOnly = false) => apiClient.get<AppNotification[]>('/notifications', { params: { unreadOnly } }),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export const auditApi = {
  list: (params: Record<string, unknown>) => apiClient.get('/audit-logs', { params }),
};

// ---------------------------------------------------------------------------
// ВАКР — Внутренний анализ коррупционных рисков
// ---------------------------------------------------------------------------
export const analysesApi = {
  list: (params: Record<string, unknown>) => apiClient.get<Paginated<AnalysisListItem>>('/analyses', { params }),
  summary: () => apiClient.get('/analyses/summary'),
  get: (id: string) => apiClient.get<AnalysisDetail>(`/analyses/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<AnalysisDetail>('/analyses', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<AnalysisDetail>(`/analyses/${id}`, data),
  changeStage: (id: string, stage: string) => apiClient.patch<AnalysisDetail>(`/analyses/${id}/stage`, { stage }),
  remove: (id: string) => apiClient.delete(`/analyses/${id}`),

  addPlanItem: (analysisId: string, data: Record<string, unknown>) =>
    apiClient.post(`/analyses/${analysisId}/plan-items`, data),
  updatePlanItem: (analysisId: string, itemId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/analyses/${analysisId}/plan-items/${itemId}`, data),
  removePlanItem: (analysisId: string, itemId: string) =>
    apiClient.delete(`/analyses/${analysisId}/plan-items/${itemId}`),

  addWorkingGroupMember: (analysisId: string, data: Record<string, unknown>) =>
    apiClient.post(`/analyses/${analysisId}/working-group`, data),
  updateWorkingGroupMember: (analysisId: string, memberId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/analyses/${analysisId}/working-group/${memberId}`, data),
  removeWorkingGroupMember: (analysisId: string, memberId: string) =>
    apiClient.delete(`/analyses/${analysisId}/working-group/${memberId}`),

  uploadDocument: (analysisId: string, file: File, category: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/analyses/${analysisId}/documents`, formData, {
      params: { category },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadDocumentPath: (analysisId: string, docId: string) => `/analyses/${analysisId}/documents/${docId}/download`,
  removeDocument: (analysisId: string, docId: string) => apiClient.delete(`/analyses/${analysisId}/documents/${docId}`),

  addProcessStep: (analysisId: string, data: Record<string, unknown>) =>
    apiClient.post(`/analyses/${analysisId}/process-steps`, data),
  updateProcessStep: (analysisId: string, stepId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/analyses/${analysisId}/process-steps/${stepId}`, data),
  removeProcessStep: (analysisId: string, stepId: string) =>
    apiClient.delete(`/analyses/${analysisId}/process-steps/${stepId}`),

  addFactor: (analysisId: string, data: Record<string, unknown>) =>
    apiClient.post(`/analyses/${analysisId}/factors`, data),
  updateFactor: (analysisId: string, factorId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/analyses/${analysisId}/factors/${factorId}`, data),
  removeFactor: (analysisId: string, factorId: string) =>
    apiClient.delete(`/analyses/${analysisId}/factors/${factorId}`),

  addRisk: (analysisId: string, data: Record<string, unknown>) => apiClient.post(`/analyses/${analysisId}/risks`, data),
  updateRisk: (analysisId: string, riskId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/analyses/${analysisId}/risks/${riskId}`, data),
  removeRisk: (analysisId: string, riskId: string) => apiClient.delete(`/analyses/${analysisId}/risks/${riskId}`),
  assessRisk: (analysisId: string, riskId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/analyses/${analysisId}/risks/${riskId}/assess`, data),
};
