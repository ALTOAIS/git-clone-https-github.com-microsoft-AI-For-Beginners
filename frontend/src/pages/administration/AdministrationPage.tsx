import { Tabs, Typography } from 'antd';
import { AuditLogTab } from './AuditLogTab';
import { CompaniesAdminTab } from './CompaniesAdminTab';
import { DepartmentsAdminTab } from './DepartmentsAdminTab';
import { SettingsTab } from './SettingsTab';
import { UsersAdminTab } from './UsersAdminTab';

export function AdministrationPage() {
  return (
    <div>
      <Typography.Title level={3}>Administration</Typography.Title>
      <Tabs
        items={[
          { key: 'users', label: 'Users', children: <UsersAdminTab /> },
          { key: 'companies', label: 'Companies', children: <CompaniesAdminTab /> },
          { key: 'departments', label: 'Departments', children: <DepartmentsAdminTab /> },
          { key: 'audit-log', label: 'Audit Log', children: <AuditLogTab /> },
          { key: 'settings', label: 'Settings', children: <SettingsTab /> },
        ]}
      />
    </div>
  );
}
