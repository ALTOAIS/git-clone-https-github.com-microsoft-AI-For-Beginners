import { Tabs, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { AiAssistantPage } from './ai/AiAssistantPage';
import { AnalyticsPage } from './AnalyticsPage';
import { ReportsPage } from './ReportsPage';

export function ReportsAnalyticsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <Typography.Title level={3} style={{ margin: '0 0 16px' }}>
        {t('nav.reportsAnalytics')}
      </Typography.Title>

      <Tabs
        items={[
          { key: 'reports', label: t('reportsAnalytics.tabReports'), children: <ReportsPage /> },
          { key: 'analytics', label: t('reportsAnalytics.tabAnalytics'), children: <AnalyticsPage /> },
          { key: 'ai', label: t('reportsAnalytics.tabAi'), children: <AiAssistantPage /> },
        ]}
      />
    </div>
  );
}
