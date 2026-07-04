import { Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { RiskDetail } from '../../../types';

interface Props {
  risk: RiskDetail;
}

export function RiskHistoryTab({ risk }: Props) {
  const { t } = useTranslation();

  if (risk.history.length === 0) {
    return <Typography.Text type="secondary">{t('riskHistory.noHistoryYet')}</Typography.Text>;
  }

  return (
    <Timeline
      items={risk.history.map((entry) => ({
        children: (
          <div>
            <Typography.Text strong>{t('riskHistory.versionLabel', { version: entry.version })}</Typography.Text>
            <div style={{ color: '#888', fontSize: 12 }}>{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}</div>
            <div>{entry.changeNote ?? t('riskHistory.updatedDefault')}</div>
          </div>
        ),
      }))}
    />
  );
}
