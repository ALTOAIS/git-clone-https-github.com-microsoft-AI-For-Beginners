import { Result, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/authStore';
import { AcademyCalendarPage } from './AcademyCalendarPage';
import { AcademyOverviewTab } from './AcademyOverviewTab';
import { CampaignsListPage } from './CampaignsListPage';
import { CertificatesPage } from './CertificatesPage';
import { CoursesListPage } from './CoursesListPage';
import { TrainingMatrixPage } from './TrainingMatrixPage';
import { TrainingPlanPage } from './TrainingPlanPage';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

export function AcademyManagementPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  if (!canManage) {
    return <Result status="403" title={t('academyManagement.accessDeniedTitle')} subTitle={t('academyManagement.accessDeniedSubtitle')} />;
  }

  return (
    <Tabs
      items={[
        { key: 'overview', label: t('academyManagement.tabs.overview'), children: <AcademyOverviewTab /> },
        { key: 'courses', label: t('academyManagement.tabs.courseBuilder'), children: <CoursesListPage /> },
        { key: 'assignments', label: t('academyManagement.tabs.assignments'), children: <TrainingMatrixPage /> },
        { key: 'calendar', label: t('academyManagement.tabs.calendar'), children: <AcademyCalendarPage /> },
        { key: 'campaigns', label: t('academyManagement.tabs.campaigns'), children: <CampaignsListPage /> },
        { key: 'trainingPlan', label: t('academyManagement.tabs.trainingPlan'), children: <TrainingPlanPage /> },
        { key: 'certificates', label: t('academyManagement.tabs.certificates'), children: <CertificatesPage /> },
      ]}
    />
  );
}
