import i18n from '../i18n';
import type { SurveyQuestionType, SurveyStatus } from '../types';

export const ALL_SURVEY_STATUSES: SurveyStatus[] = ['DRAFT', 'PUBLISHED', 'CLOSED'];

export function surveyStatusLabel(status: SurveyStatus): string {
  return i18n.t(`surveyStatus.${status}`);
}

export const SURVEY_STATUS_COLORS: Record<SurveyStatus, string> = {
  DRAFT: 'default',
  PUBLISHED: 'green',
  CLOSED: 'default',
};

export const ALL_SURVEY_QUESTION_TYPES: SurveyQuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'RATING'];

export function surveyQuestionTypeLabel(value: SurveyQuestionType): string {
  return i18n.t(`surveyQuestionType.${value}`);
}
