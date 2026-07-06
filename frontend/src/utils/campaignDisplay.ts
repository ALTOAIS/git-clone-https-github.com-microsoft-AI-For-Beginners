import i18n from '../i18n';
import type { CampaignStatus } from '../types';

export const ALL_CAMPAIGN_STATUSES: CampaignStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED'];

export function campaignStatusLabel(status: CampaignStatus): string {
  return i18n.t(`campaignStatus.${status}`);
}

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  DRAFT: 'default',
  ACTIVE: 'blue',
  COMPLETED: 'green',
};
