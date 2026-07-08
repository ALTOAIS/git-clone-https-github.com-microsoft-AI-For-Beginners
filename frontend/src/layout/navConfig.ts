import {
  AlertOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  FileTextOutlined,
  RadarChartOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import type { Role } from '../types';

export interface NavItem {
  key: string;
  path: string;
  labelKey: string;
  icon: React.ComponentType;
  roles?: Role[];
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: DashboardOutlined },
  { key: 'risks', path: '/risks', labelKey: 'nav.riskRegister', icon: AlertOutlined },
  { key: 'analyses', path: '/analyses', labelKey: 'nav.analyses', icon: RadarChartOutlined },
  { key: 'actions', path: '/actions', labelKey: 'nav.actionPlans', icon: CheckSquareOutlined },
  { key: 'academy', path: '/academy', labelKey: 'nav.academy', icon: ReadOutlined },
  { key: 'reports', path: '/reports', labelKey: 'nav.reportsAnalytics', icon: FileTextOutlined },
];

export const DEFAULT_ICON = AppstoreOutlined;
