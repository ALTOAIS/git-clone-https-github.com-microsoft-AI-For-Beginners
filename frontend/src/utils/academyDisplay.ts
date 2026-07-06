import i18n from '../i18n';
import type { CourseAssignmentStatus, CourseStatus, LessonContentType, TestAttemptStage, TestQuestionType } from '../types';

export const ALL_COURSE_STATUSES: CourseStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export function courseStatusLabel(status: CourseStatus): string {
  return i18n.t(`courseStatus.${status}`);
}

export const COURSE_STATUS_COLORS: Record<CourseStatus, string> = {
  DRAFT: 'default',
  PUBLISHED: 'green',
  ARCHIVED: 'default',
};

export const ALL_LESSON_CONTENT_TYPES: LessonContentType[] = [
  'PRESENTATION',
  'ARTICLE',
  'INSTRUCTION',
  'MEMO',
  'CHECKLIST',
  'VIDEO',
  'WEBINAR',
  'IN_PERSON_EVENT',
  'EBOOK',
  'PDF_COURSE',
  'INTERACTIVE',
  'PRACTICAL_TASK',
  'CASE_STUDY',
];

export function lessonContentTypeLabel(value: LessonContentType): string {
  return i18n.t(`lessonContentType.${value}`);
}

export const ALL_COURSE_ASSIGNMENT_STATUSES: CourseAssignmentStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

export function courseAssignmentStatusLabel(status: CourseAssignmentStatus): string {
  return i18n.t(`assignmentStatus.${status}`);
}

export const COURSE_ASSIGNMENT_STATUS_COLORS: Record<CourseAssignmentStatus, string> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
};

export function isAssignmentOverdue(status: CourseAssignmentStatus, dueDate?: string | null): boolean {
  return status !== 'COMPLETED' && !!dueDate && new Date(dueDate).getTime() < Date.now();
}

export const ALL_TEST_QUESTION_TYPES: TestQuestionType[] = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
];

export function testQuestionTypeLabel(value: TestQuestionType): string {
  return i18n.t(`questionType.${value}`);
}

export const ALL_TEST_ATTEMPT_STAGES: TestAttemptStage[] = ['BEFORE', 'AFTER', 'CHECK_3M', 'CHECK_6M', 'ANNUAL'];

export function testAttemptStageLabel(value: TestAttemptStage): string {
  return i18n.t(`attemptStage.${value}`);
}
