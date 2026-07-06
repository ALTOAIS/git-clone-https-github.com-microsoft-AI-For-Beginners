import { Menu } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const ITEMS = [
  { key: '/academy', labelKey: 'academySubNav.dashboard' },
  { key: '/academy/my', labelKey: 'academySubNav.myAcademy' },
  { key: '/academy/courses', labelKey: 'academySubNav.courses' },
];

export function AcademySubNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey =
    ITEMS.find((item) => item.key !== '/academy' && location.pathname.startsWith(item.key))?.key ?? '/academy';

  return (
    <Menu
      mode="horizontal"
      selectedKeys={[selectedKey]}
      onClick={({ key }) => navigate(key)}
      items={ITEMS.map((item) => ({ key: item.key, label: t(item.labelKey) }))}
      style={{ marginBottom: 16 }}
    />
  );
}
