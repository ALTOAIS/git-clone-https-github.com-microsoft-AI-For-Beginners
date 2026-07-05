import { Space, Tabs, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { AuditLogTab } from './AuditLogTab';
import { CompaniesAdminTab } from './CompaniesAdminTab';
import { DepartmentsAdminTab } from './DepartmentsAdminTab';
import { SettingsTab } from './SettingsTab';
import { UsersAdminTab } from './UsersAdminTab';

export function AdministrationPage() {
  const { t } = useTranslation();
  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3}>{t('administration.title')}</Typography.Title>
        <ModuleHelpButton moduleKey="administration" />
      </Space>
      <Tabs
        items={[
          {
            key: 'users',
            label: (
              <span>
                {t('administration.tabs.users')}
                <InfoTooltip text={t('tooltips.administration.userRights')} />
              </span>
            ),
            children: <UsersAdminTab />,
          },
          { key: 'companies', label: t('administration.tabs.companies'), children: <CompaniesAdminTab /> },
          {
            key: 'departments',
            label: (
              <span>
                {t('administration.tabs.departments')}
                <InfoTooltip text={t('tooltips.administration.referenceData')} />
              </span>
            ),
            children: <DepartmentsAdminTab />,
          },
          { key: 'audit-log', label: t('administration.tabs.auditLog'), children: <AuditLogTab /> },
          { key: 'settings', label: t('administration.tabs.settings'), children: <SettingsTab /> },
        ]}
      />
    </div>
  );
}
