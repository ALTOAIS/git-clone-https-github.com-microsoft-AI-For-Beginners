import i18n from '../i18n';
import type { DashboardRecentEvent } from '../types';

const EVENT_LABEL_KEYS: Record<string, string> = {
  RISK_CREATE: 'riskCreate',
  RISK_UPDATE: 'riskUpdate',
  RISK_ASSESS: 'riskAssess',
  RISK_STATUS_CHANGE: 'riskStatusChange',
  RISK_CREATE_FROM_TEMPLATE: 'riskCreateFromTemplate',
  ANALYSIS_CREATE: 'analysisCreate',
  ANALYSIS_UPDATE: 'analysisUpdate',
  ANALYSIS_STAGE_CHANGE: 'analysisStageChange',
  ANALYSIS_APPROVE: 'analysisApprove',
  ACTION_CREATE: 'actionCreate',
  ACTION_UPDATE: 'actionUpdate',
  ACTION_DELETE: 'actionDelete',
  COURSE_CREATE: 'courseCreate',
  COURSE_UPDATE: 'courseUpdate',
  COURSE_PUBLISH: 'coursePublish',
  COURSE_UNPUBLISH: 'courseUnpublish',
  COURSE_ASSIGN: 'courseAssign',
  COURSE_COMPLETE: 'courseComplete',
  CAMPAIGN_CREATE: 'campaignCreate',
  CAMPAIGN_UPDATE: 'campaignUpdate',
  SURVEY_CREATE: 'surveyCreate',
  SURVEY_UPDATE: 'surveyUpdate',
  CONTROL_CREATE: 'controlCreate',
  CONTROL_UPDATE: 'controlUpdate',
  CONTROL_DELETE: 'controlDelete',
  INCIDENT_CREATE: 'incidentCreate',
  INCIDENT_UPDATE: 'incidentUpdate',
  TRAINING_PLAN_CREATE: 'trainingPlanCreate',
  TRAINING_PLAN_UPDATE: 'trainingPlanUpdate',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  RISK: 'риск',
  ANALYSIS: 'ВАКР',
  ACTION: 'мероприятие',
  COURSE: 'курс',
  CAMPAIGN: 'кампания',
  SURVEY: 'опрос',
  CONTROL: 'контроль',
  INCIDENT: 'инцидент',
  TRAINING_PLAN: 'план обучения',
};

export function recentEventLabel(event: DashboardRecentEvent): string {
  const key = EVENT_LABEL_KEYS[`${event.entityType}_${event.action}`];
  if (key) {
    return i18n.t(`dashboard.events.${key}`, { title: event.title ?? '' });
  }
  const entity = ENTITY_TYPE_LABELS[event.entityType] ?? event.entityType;
  return i18n.t('dashboard.events.generic', { entity, action: event.action, title: event.title ?? '' });
}

const ENTITY_ROUTES: Record<string, (event: DashboardRecentEvent) => string | null> = {
  RISK: (e) => `/risks/${e.entityId}`,
  ANALYSIS: (e) => `/analyses/${e.entityId}`,
  ACTION: () => '/actions',
  COURSE: (e) => `/academy/courses/${e.entityId}`,
  CAMPAIGN: (e) => `/academy/campaigns/${e.entityId}`,
  SURVEY: (e) => `/academy/surveys/${e.entityId}`,
  CONTROL: () => '/risks',
  INCIDENT: () => '/incidents',
  TRAINING_PLAN: () => '/academy/training-plan',
};

export function recentEventRoute(event: DashboardRecentEvent): string | null {
  return ENTITY_ROUTES[event.entityType]?.(event) ?? null;
}
