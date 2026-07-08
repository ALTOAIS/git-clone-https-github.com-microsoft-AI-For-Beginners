import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/authStore';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

const ITEMS = [
  { key: '/academy/my', labelKey: 'academySubNav.myAcademy', prefixes: ['/academy/my', '/academy/learn', '/academy/take-test'] },
  { key: '/academy/courses', labelKey: 'academySubNav.coursesAndMaterials', prefixes: ['/academy/courses'] },
  { key: '/academy/tests', labelKey: 'academySubNav.testsAndSurveys', prefixes: ['/academy/tests', '/academy/surveys'] },
  {
    key: '/academy/management',
    labelKey: 'academySubNav.management',
    prefixes: [
      '/academy/management',
      '/academy/calendar',
      '/academy/matrix',
      '/academy/campaigns',
      '/academy/training-plan',
      '/academy/certificates',
    ],
    managerOnly: true,
  },
];

export function AcademySubNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const visibleItems = ITEMS.filter((item) => !item.managerOnly || canManage);

  const selectedKey =
    visibleItems.find((item) => item.prefixes.some((p) => location.pathname.startsWith(p)))?.key ?? '/academy/my';

  return (
    <Menu
      mode="horizontal"
      selectedKeys={[selectedKey]}
      onClick={({ key }) => navigate(key)}
      items={visibleItems.map((item) => ({ key: item.key, label: t(item.labelKey) }))}
      style={{ marginBottom: 16 }}
    />
  );
}
