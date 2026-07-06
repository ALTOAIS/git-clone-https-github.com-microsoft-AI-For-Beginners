import {
  AlertOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  FileTextOutlined,
  RadarChartOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { Role } from '../types';

export interface NavItem {
  key: string;
  path: string;
  labelKey: string;
  icon: React.ComponentType;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: DashboardOutlined },
  { key: 'analyses', path: '/analyses', labelKey: 'nav.analyses', icon: RadarChartOutlined },
  { key: 'academy', path: '/academy', labelKey: 'nav.academy', icon: ReadOutlined },
  { key: 'risks', path: '/risks', labelKey: 'nav.riskRegister', icon: AlertOutlined },
  { key: 'risk-library', path: '/risk-library', labelKey: 'nav.riskLibrary', icon: BookOutlined },
  { key: 'sources', path: '/sources', labelKey: 'nav.sources', icon: ApartmentOutlined },
  { key: 'controls', path: '/controls', labelKey: 'nav.controls', icon: SafetyCertificateOutlined },
  { key: 'actions', path: '/actions', labelKey: 'nav.actionPlans', icon: CheckSquareOutlined },
  { key: 'incidents', path: '/incidents', labelKey: 'nav.incidents', icon: AuditOutlined },
  { key: 'analytics', path: '/analytics', labelKey: 'nav.analytics', icon: BarChartOutlined },
  { key: 'reports', path: '/reports', labelKey: 'nav.reports', icon: FileTextOutlined },
  {
    key: 'administration',
    path: '/administration',
    labelKey: 'nav.administration',
    icon: SettingOutlined,
    roles: ['ADMINISTRATOR'],
  },
];

export const DEFAULT_ICON = AppstoreOutlined;
