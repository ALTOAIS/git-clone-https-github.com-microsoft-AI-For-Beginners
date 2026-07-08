import { Card, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export function SettingsTab() {
  const { t } = useTranslation();

  return (
    <Card title={t('settings.systemTitle')}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        {t('settings.systemDescription')}
      </Typography.Paragraph>
    </Card>
  );
}
