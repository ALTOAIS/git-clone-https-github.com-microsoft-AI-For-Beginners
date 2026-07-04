import { Tabs, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { AuditLogTab } from './AuditLogTab';
import { CompaniesAdminTab } from './CompaniesAdminTab';
import { DepartmentsAdminTab } from './DepartmentsAdminTab';
import { SettingsTab } from './SettingsTab';
import { UsersAdminTab } from './UsersAdminTab';

export function AdministrationPage() {
  const { t } = useTranslation();
  return (
    <div>
      <Typography.Title level={3}>{t('administration.title')}</Typography.Title>
      <Tabs
        items={[
          { key: 'users', label: t('administration.tabs.users'), children: <UsersAdminTab /> },
          { key: 'companies', label: t('administration.tabs.companies'), children: <CompaniesAdminTab /> },
          { key: 'departments', label: t('administration.tabs.departments'), children: <DepartmentsAdminTab /> },
          { key: 'audit-log', label: t('administration.tabs.auditLog'), children: <AuditLogTab /> },
          { key: 'settings', label: t('administration.tabs.settings'), children: <SettingsTab /> },
        ]}
      />
    </div>
  );
}
