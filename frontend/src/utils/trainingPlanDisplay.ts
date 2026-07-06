import i18n from '../i18n';
import type { TrainingPlanItemStatus, TrainingPlanStatus } from '../types';

export const ALL_TRAINING_PLAN_STATUSES: TrainingPlanStatus[] = ['DRAFT', 'APPROVED', 'COMPLETED'];

export function trainingPlanStatusLabel(status: TrainingPlanStatus): string {
  return i18n.t(`trainingPlanStatus.${status}`);
}

export const TRAINING_PLAN_STATUS_COLORS: Record<TrainingPlanStatus, string> = {
  DRAFT: 'default',
  APPROVED: 'blue',
  COMPLETED: 'green',
};

export const ALL_TRAINING_PLAN_ITEM_STATUSES: TrainingPlanItemStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'];

export function trainingPlanItemStatusLabel(status: TrainingPlanItemStatus): string {
  return i18n.t(`trainingPlanItemStatus.${status}`);
}

export const TRAINING_PLAN_ITEM_STATUS_COLORS: Record<TrainingPlanItemStatus, string> = {
  PLANNED: 'default',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
};

export const ALL_QUARTERS = [1, 2, 3, 4];

export function quarterLabel(quarter: number): string {
  return i18n.t('trainingPlan.quarter', { quarter });
}
