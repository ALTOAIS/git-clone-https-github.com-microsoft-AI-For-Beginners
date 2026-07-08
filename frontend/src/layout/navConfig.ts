import {
  AlertOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  RadarChartOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  SolutionOutlined,
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
  {
    key: 'risk-sources',
    path: '/analyses',
    labelKey: 'nav.riskSources',
    icon: ApartmentOutlined,
    children: [
      { key: 'risk-sources-vakr', path: '/analyses', labelKey: 'nav.riskSourcesVakr', icon: RadarChartOutlined },
      { key: 'risk-sources-incidents', path: '/incidents', labelKey: 'nav.riskSourcesIncidents', icon: AuditOutlined },
      {
        key: 'risk-sources-inspections',
        path: '/sources?type=AUDIT,STATE_INSPECTION',
        labelKey: 'nav.riskSourcesInspections',
        icon: FileSearchOutlined,
      },
      {
        key: 'risk-sources-monitoring',
        path: '/sources?type=ANTI_CORRUPTION_MONITORING',
        labelKey: 'nav.riskSourcesMonitoring',
        icon: SafetyCertificateOutlined,
      },
      {
        key: 'risk-sources-due-diligence',
        path: '/sources?type=CANDIDATE_DUE_DILIGENCE,COUNTERPARTY_DUE_DILIGENCE',
        labelKey: 'nav.riskSourcesDueDiligence',
        icon: SolutionOutlined,
      },
    ],
  },
  { key: 'actions', path: '/actions', labelKey: 'nav.actionPlans', icon: CheckSquareOutlined },
  { key: 'academy', path: '/academy', labelKey: 'nav.academy', icon: ReadOutlined },
  { key: 'reports', path: '/reports', labelKey: 'nav.reportsAnalytics', icon: FileTextOutlined },
  {
    key: 'administration',
    path: '/administration',
    labelKey: 'nav.administration',
    icon: SettingOutlined,
    roles: ['ADMINISTRATOR'],
  },
];

export const DEFAULT_ICON = AppstoreOutlined;
