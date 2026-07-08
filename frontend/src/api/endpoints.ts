import { apiClient } from './client';
import type {
  Action,
  AcademyCalendar,
  AcademySummary,
  AiAnalyzeRiskResult,
  AiChatResult,
  AiCourseOutlineDraft,
  AiImproveDescriptionResult,
  AiLessonContentResult,
  AiQuizQuestionsResult,
  AiReportResult,
  AiReviewResult,
  AiRiskIntelligenceDashboard,
  AiRiskRegisterEntryResult,
  AiRiskTemplateDraft,
  AiSuggestActionsResult,
  AiSuggestControlsResult,
  AnalysisDetail,
  AnalysisListItem,
  AppNotification,
  Attachment,
  BusinessProcess,
  CampaignDetail,
  CampaignListItem,
  CampaignProgress,
  Category,
  Certificate,
  Comment,
  Company,
  Control,
  CourseDetail,
  CourseLesson,
  CourseListItem,
  CoursePlayerData,
  CoursePreview,
  DashboardSummary,
  Department,
  Incident,
  LessonContentType,
  MyCourseAssignment,
  Paginated,
  RiskDetail,
  RiskListItem,
  RiskTemplate,
  Source,
  SurveyDetail,
  SurveyListItem,
  SurveyResponse,
  SurveyResults,
  TestAttempt,
  TestDetail,
  TrainingMatrix,
  TrainingPlanDetail,
  TrainingPlanListItem,
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
// Библиотека типовых рисков
// ---------------------------------------------------------------------------
export interface RiskTemplateQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  direction?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags?: string;
  includeInactive?: boolean;
}

export const riskTemplatesApi = {
  list: (params: RiskTemplateQuery) => apiClient.get<Paginated<RiskTemplate>>('/risk-templates', { params }),
  listTags: () => apiClient.get<string[]>('/risk-templates/tags'),
  similar: (id: string) => apiClient.get<RiskTemplate[]>(`/risk-templates/${id}/similar`),
  get: (id: string) => apiClient.get<RiskTemplate>(`/risk-templates/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<RiskTemplate>('/risk-templates', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<RiskTemplate>(`/risk-templates/${id}`, data),
  duplicate: (id: string) => apiClient.post<RiskTemplate>(`/risk-templates/${id}/duplicate`),
  remove: (id: string) => apiClient.delete(`/risk-templates/${id}`),
  createRisk: (id: string, data: Record<string, unknown>) =>
    apiClient.post<RiskDetail>(`/risk-templates/${id}/create-risk`, data),
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
  listForEntity: (entityType: string, entityId: string) =>
    apiClient.get<Attachment[]>(`/attachments`, { params: { entityType, entityId } }),
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

  addRecommendation: (analysisId: string, data: Record<string, unknown>) =>
    apiClient.post(`/analyses/${analysisId}/recommendations`, data),
  updateRecommendation: (analysisId: string, recommendationId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/analyses/${analysisId}/recommendations/${recommendationId}`, data),
  removeRecommendation: (analysisId: string, recommendationId: string) =>
    apiClient.delete(`/analyses/${analysisId}/recommendations/${recommendationId}`),

  addActionItem: (analysisId: string, data: Record<string, unknown>) =>
    apiClient.post(`/analyses/${analysisId}/action-items`, data),
  updateActionItem: (analysisId: string, itemId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/analyses/${analysisId}/action-items/${itemId}`, data),
  removeActionItem: (analysisId: string, itemId: string) =>
    apiClient.delete(`/analyses/${analysisId}/action-items/${itemId}`),

  addComment: (analysisId: string, text: string) => apiClient.post(`/analyses/${analysisId}/comments`, { text }),
  removeComment: (analysisId: string, commentId: string) =>
    apiClient.delete(`/analyses/${analysisId}/comments/${commentId}`),
  getHistory: (analysisId: string) => apiClient.get(`/analyses/${analysisId}/history`),
  approve: (analysisId: string) => apiClient.post<AnalysisDetail>(`/analyses/${analysisId}/approve`),
  updateReassessment: (analysisId: string, reassessmentNotes: string) =>
    apiClient.patch<AnalysisDetail>(`/analyses/${analysisId}/reassessment`, { reassessmentNotes }),
};

// ---------------------------------------------------------------------------
// Академия комплаенса
// ---------------------------------------------------------------------------
export const academyApi = {
  list: (params: Record<string, unknown>) => apiClient.get<Paginated<CourseListItem>>('/courses', { params }),
  summary: () => apiClient.get<AcademySummary>('/courses/summary'),
  myAssignments: () => apiClient.get<MyCourseAssignment[]>('/courses/my'),
  calendar: () => apiClient.get<AcademyCalendar>('/courses/calendar'),
  matrix: () => apiClient.get<TrainingMatrix>('/courses/matrix'),
  get: (id: string) => apiClient.get<CourseDetail>(`/courses/${id}`),
  preview: (id: string) => apiClient.get<CoursePreview>(`/courses/${id}/preview`),
  create: (data: Record<string, unknown>) => apiClient.post<CourseDetail>('/courses', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<CourseDetail>(`/courses/${id}`, data),
  remove: (id: string) => apiClient.delete(`/courses/${id}`),

  addModule: (courseId: string, data: Record<string, unknown>) => apiClient.post(`/courses/${courseId}/modules`, data),
  updateModule: (courseId: string, moduleId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/courses/${courseId}/modules/${moduleId}`, data),
  removeModule: (courseId: string, moduleId: string) => apiClient.delete(`/courses/${courseId}/modules/${moduleId}`),

  addLesson: (courseId: string, moduleId: string, data: Record<string, unknown>) =>
    apiClient.post<CourseLesson>(`/courses/${courseId}/modules/${moduleId}/lessons`, data),
  updateLesson: (courseId: string, lessonId: string, data: Record<string, unknown>) =>
    apiClient.patch<CourseLesson>(`/courses/${courseId}/lessons/${lessonId}`, data),
  removeLesson: (courseId: string, lessonId: string) => apiClient.delete(`/courses/${courseId}/lessons/${lessonId}`),

  getPlayer: (courseId: string) => apiClient.get<CoursePlayerData>(`/courses/${courseId}/player`),
  completeLesson: (courseId: string, lessonId: string) =>
    apiClient.post(`/courses/${courseId}/lessons/${lessonId}/complete`, {}),

  assign: (courseId: string, data: Record<string, unknown>) => apiClient.post(`/courses/${courseId}/assignments`, data),
  updateAssignment: (courseId: string, assignmentId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/courses/${courseId}/assignments/${assignmentId}`, data),
  removeAssignment: (courseId: string, assignmentId: string) =>
    apiClient.delete(`/courses/${courseId}/assignments/${assignmentId}`),

  getTest: (courseId: string) => apiClient.get<TestDetail>(`/courses/${courseId}/test`),
  getTestForAttempt: (courseId: string) => apiClient.get<TestDetail>(`/courses/${courseId}/test/for-attempt`),
  createTest: (courseId: string, data: Record<string, unknown>) =>
    apiClient.post<TestDetail>(`/courses/${courseId}/test`, data),
  updateTest: (courseId: string, data: Record<string, unknown>) =>
    apiClient.patch<TestDetail>(`/courses/${courseId}/test`, data),
  removeTest: (courseId: string) => apiClient.delete(`/courses/${courseId}/test`),

  addQuestion: (courseId: string, data: Record<string, unknown>) =>
    apiClient.post(`/courses/${courseId}/test/questions`, data),
  updateQuestion: (courseId: string, questionId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/courses/${courseId}/test/questions/${questionId}`, data),
  removeQuestion: (courseId: string, questionId: string) =>
    apiClient.delete(`/courses/${courseId}/test/questions/${questionId}`),

  submitAttempt: (courseId: string, data: Record<string, unknown>) =>
    apiClient.post<TestAttempt>(`/courses/${courseId}/test/attempts`, data),
  myAttempts: (courseId: string) => apiClient.get<TestAttempt[]>(`/courses/${courseId}/test/attempts/my`),
  allAttempts: (courseId: string) => apiClient.get<TestAttempt[]>(`/courses/${courseId}/test/attempts`),

  getLessonQuiz: (courseId: string, lessonId: string) =>
    apiClient.get<TestDetail>(`/courses/${courseId}/lessons/${lessonId}/quiz`),
  getLessonQuizForAttempt: (courseId: string, lessonId: string) =>
    apiClient.get<TestDetail>(`/courses/${courseId}/lessons/${lessonId}/quiz/for-attempt`),
  createLessonQuiz: (courseId: string, lessonId: string, data: Record<string, unknown>) =>
    apiClient.post<TestDetail>(`/courses/${courseId}/lessons/${lessonId}/quiz`, data),
  updateLessonQuiz: (courseId: string, lessonId: string, data: Record<string, unknown>) =>
    apiClient.patch<TestDetail>(`/courses/${courseId}/lessons/${lessonId}/quiz`, data),
  removeLessonQuiz: (courseId: string, lessonId: string) =>
    apiClient.delete(`/courses/${courseId}/lessons/${lessonId}/quiz`),

  addQuizQuestion: (courseId: string, lessonId: string, data: Record<string, unknown>) =>
    apiClient.post(`/courses/${courseId}/lessons/${lessonId}/quiz/questions`, data),
  updateQuizQuestion: (courseId: string, lessonId: string, questionId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/courses/${courseId}/lessons/${lessonId}/quiz/questions/${questionId}`, data),
  removeQuizQuestion: (courseId: string, lessonId: string, questionId: string) =>
    apiClient.delete(`/courses/${courseId}/lessons/${lessonId}/quiz/questions/${questionId}`),

  submitQuizAttempt: (courseId: string, lessonId: string, data: Record<string, unknown>) =>
    apiClient.post<TestAttempt>(`/courses/${courseId}/lessons/${lessonId}/quiz/attempts`, data),
  myQuizAttempts: (courseId: string, lessonId: string) =>
    apiClient.get<TestAttempt[]>(`/courses/${courseId}/lessons/${lessonId}/quiz/attempts/my`),
  allQuizAttempts: (courseId: string, lessonId: string) =>
    apiClient.get<TestAttempt[]>(`/courses/${courseId}/lessons/${lessonId}/quiz/attempts`),
};

// ---------------------------------------------------------------------------
// Опросы
// ---------------------------------------------------------------------------
export const surveysApi = {
  list: (params: Record<string, unknown>) => apiClient.get<Paginated<SurveyListItem>>('/surveys', { params }),
  get: (id: string) => apiClient.get<SurveyDetail>(`/surveys/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<SurveyDetail>('/surveys', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<SurveyDetail>(`/surveys/${id}`, data),
  remove: (id: string) => apiClient.delete(`/surveys/${id}`),

  addQuestion: (surveyId: string, data: Record<string, unknown>) => apiClient.post(`/surveys/${surveyId}/questions`, data),
  updateQuestion: (surveyId: string, questionId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/surveys/${surveyId}/questions/${questionId}`, data),
  removeQuestion: (surveyId: string, questionId: string) => apiClient.delete(`/surveys/${surveyId}/questions/${questionId}`),

  submitResponse: (surveyId: string, data: Record<string, unknown>) =>
    apiClient.post<SurveyResponse>(`/surveys/${surveyId}/responses`, data),
  myResponse: (surveyId: string) => apiClient.get<SurveyResponse | null>(`/surveys/${surveyId}/responses/my`),
  getResults: (surveyId: string) => apiClient.get<SurveyResults>(`/surveys/${surveyId}/results`),
};

// ---------------------------------------------------------------------------
// Комплаенс-кампании
// ---------------------------------------------------------------------------
export const campaignsApi = {
  list: (params: Record<string, unknown>) => apiClient.get<Paginated<CampaignListItem>>('/campaigns', { params }),
  get: (id: string) => apiClient.get<CampaignDetail>(`/campaigns/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<CampaignDetail>('/campaigns', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<CampaignDetail>(`/campaigns/${id}`, data),
  remove: (id: string) => apiClient.delete(`/campaigns/${id}`),

  linkCourse: (campaignId: string, courseId: string) => apiClient.post(`/campaigns/${campaignId}/courses`, { courseId }),
  unlinkCourse: (campaignId: string, courseId: string) => apiClient.delete(`/campaigns/${campaignId}/courses/${courseId}`),
  linkSurvey: (campaignId: string, surveyId: string) => apiClient.post(`/campaigns/${campaignId}/surveys`, { surveyId }),
  unlinkSurvey: (campaignId: string, surveyId: string) => apiClient.delete(`/campaigns/${campaignId}/surveys/${surveyId}`),

  getProgress: (campaignId: string) => apiClient.get<CampaignProgress>(`/campaigns/${campaignId}/progress`),
};

// ---------------------------------------------------------------------------
// Годовой план обучения
// ---------------------------------------------------------------------------
export const trainingPlansApi = {
  list: (params: Record<string, unknown>) =>
    apiClient.get<Paginated<TrainingPlanListItem>>('/training-plans', { params }),
  get: (id: string) => apiClient.get<TrainingPlanDetail>(`/training-plans/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post<TrainingPlanDetail>('/training-plans', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<TrainingPlanDetail>(`/training-plans/${id}`, data),
  remove: (id: string) => apiClient.delete(`/training-plans/${id}`),

  addItem: (planId: string, data: Record<string, unknown>) => apiClient.post(`/training-plans/${planId}/items`, data),
  updateItem: (planId: string, itemId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/training-plans/${planId}/items/${itemId}`, data),
  removeItem: (planId: string, itemId: string) => apiClient.delete(`/training-plans/${planId}/items/${itemId}`),
};

// ---------------------------------------------------------------------------
// Сертификаты
// ---------------------------------------------------------------------------
export const certificatesApi = {
  my: () => apiClient.get<Certificate[]>('/certificates/my'),
  list: (params: Record<string, unknown>) => apiClient.get<Paginated<Certificate>>('/certificates', { params }),
  pdfPath: (id: string) => `/certificates/${id}/pdf`,
};

// ---------------------------------------------------------------------------
// Compliance AI Platform
// ---------------------------------------------------------------------------
export const aiApi = {
  analyzeRisk: (analysisId: string, processStepId: string) =>
    apiClient.post<AiAnalyzeRiskResult>('/ai/analyze-risk', { analysisId, processStepId }),
  suggestControls: (analysisId: string, riskId: string) =>
    apiClient.post<AiSuggestControlsResult>('/ai/suggest-controls', { analysisId, riskId }),
  reviewVakrAnalysis: (analysisId: string) =>
    apiClient.post<AiReviewResult>('/ai/review-vakr-analysis', { analysisId }),
  generateVakrReport: (analysisId: string) =>
    apiClient.post<AiReportResult>('/ai/generate-vakr-report', { analysisId }),
  vakrReportPdfPath: (analysisId: string) => `/ai/generate-vakr-report/${analysisId}/pdf`,
  vakrReportDocxPath: (analysisId: string) => `/ai/generate-vakr-report/${analysisId}/docx`,
  generateRiskRegisterEntry: (analysisId: string, analysisRiskId: string) =>
    apiClient.post<AiRiskRegisterEntryResult>('/ai/generate-risk-register-entry', { analysisId, analysisRiskId }),
  chat: (data: { message: string; module?: string; contextEntityType?: string; contextEntityId?: string }) =>
    apiClient.post<AiChatResult>('/ai/chat', data),
  riskIntelligenceDashboard: () =>
    apiClient.get<AiRiskIntelligenceDashboard>('/ai/risk-intelligence-dashboard'),
  generateCourseOutline: (data: { courseId: string; topic: string; audienceHint?: string; moduleCount?: number }) =>
    apiClient.post<AiCourseOutlineDraft>('/ai/generate-course-outline', data),
  generateLessonContent: (data: { courseId: string; courseTopic: string; lessonTitle: string; contentType: LessonContentType }) =>
    apiClient.post<AiLessonContentResult>('/ai/generate-lesson-content', data),
  generateQuizQuestions: (data: { courseId: string; topic: string; questionCount?: number }) =>
    apiClient.post<AiQuizQuestionsResult>('/ai/generate-quiz-questions', data),
  improveRiskTemplateDescription: (templateId: string) =>
    apiClient.post<AiImproveDescriptionResult>('/ai/improve-risk-template-description', { templateId }),
  suggestRiskTemplateControls: (templateId: string) =>
    apiClient.post<AiSuggestControlsResult>('/ai/suggest-risk-template-controls', { templateId }),
  suggestRiskTemplateActions: (templateId: string) =>
    apiClient.post<AiSuggestActionsResult>('/ai/suggest-risk-template-actions', { templateId }),
  generateRiskTemplateForProcess: (data: { processDescription: string; direction?: string }) =>
    apiClient.post<AiRiskTemplateDraft>('/ai/generate-risk-template-for-process', data),
};
