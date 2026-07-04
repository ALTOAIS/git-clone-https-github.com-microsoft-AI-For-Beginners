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
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { Role } from '../types';

export interface NavItem {
  key: string;
  path: string;
  label: string;
  icon: React.ComponentType;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: DashboardOutlined },
  { key: 'risks', path: '/risks', label: 'Risk Register', icon: AlertOutlined },
  { key: 'risk-library', path: '/risk-library', label: 'Risk Library', icon: BookOutlined },
  { key: 'sources', path: '/sources', label: 'Risk Sources', icon: ApartmentOutlined },
  { key: 'controls', path: '/controls', label: 'Controls', icon: SafetyCertificateOutlined },
  { key: 'actions', path: '/actions', label: 'Action Plans', icon: CheckSquareOutlined },
  { key: 'incidents', path: '/incidents', label: 'Incidents', icon: AuditOutlined },
  { key: 'analytics', path: '/analytics', label: 'Analytics', icon: BarChartOutlined },
  { key: 'reports', path: '/reports', label: 'Reports', icon: FileTextOutlined },
  {
    key: 'administration',
    path: '/administration',
    label: 'Administration',
    icon: SettingOutlined,
    roles: ['ADMINISTRATOR'],
  },
];

export const DEFAULT_ICON = AppstoreOutlined;
