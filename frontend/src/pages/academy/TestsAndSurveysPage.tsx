import { Space, Tabs, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { MyTestsTab } from './MyTestsTab';
import { SurveysListPage } from './SurveysListPage';

export function TestsAndSurveysPage() {
  const { t } = useTranslation();
  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('testsAndSurveys.title')}
        </Typography.Title>
        <ModuleHelpButton moduleKey="academy" />
      </Space>
      <Typography.Paragraph type="secondary">{t('testsAndSurveys.description')}</Typography.Paragraph>
      <Tabs
        items={[
          { key: 'my-tests', label: t('testsAndSurveys.tabs.myTests'), children: <MyTestsTab /> },
          { key: 'surveys', label: t('testsAndSurveys.tabs.surveys'), children: <SurveysListPage /> },
        ]}
      />
    </div>
  );
}
