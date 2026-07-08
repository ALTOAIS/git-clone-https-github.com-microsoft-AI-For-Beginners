import {
  AlertOutlined,
  BankOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FireOutlined,
  OrderedListOutlined,
  PlusOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/charts';
import { Button, Card, Col, Empty, List, Progress, Row, Skeleton, Space, Statistic, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { dashboardApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import { InfoTooltip } from '../components/InfoTooltip';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
import { recentEventLabel, recentEventRoute } from '../utils/dashboardEvents';

const RISK_MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER', 'RISK_OWNER'];
const ANALYSIS_MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];
const ACTION_MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER', 'RISK_OWNER', 'DEPARTMENT_MANAGER'];
const ACADEMY_MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  if (isLoading || !data) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  const { attention, processes, recentEvents, analyticsCompact } = data;

  const attentionCards = [
    {
      key: 'critical',
      icon: <FireOutlined style={{ color: '#f5222d' }} />,
      value: attention.criticalRisks,
      label: t('dashboardHome.attention.criticalRisks'),
      onClick: () => navigate('/risks'),
    },
    {
      key: 'high',
      icon: <AlertOutlined style={{ color: '#fa8c16' }} />,
      value: attention.highRisks,
      label: t('dashboardHome.attention.highRisks'),
      onClick: () => navigate('/risks'),
    },
    {
      key: 'overdue-actions',
      icon: <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
      value: attention.overdueActions,
      label: t('dashboardHome.attention.overdueActions'),
      onClick: () => navigate('/actions?overdueOnly=true'),
    },
    {
      key: 'analyses-in-progress',
      icon: <OrderedListOutlined style={{ color: '#0f5fa8' }} />,
      value: attention.analysesInProgress,
      label: t('dashboardHome.attention.analysesInProgress'),
      onClick: () => navigate('/analyses?status=IN_PROGRESS'),
    },
    {
      key: 'overdue-training',
      icon: <BookOutlined style={{ color: '#fa8c16' }} />,
      value: attention.overdueTraining,
      label: t('dashboardHome.attention.overdueTraining'),
      onClick: () => navigate('/academy/courses'),
    },
    {
      key: 'risks-without-actions',
      icon: <SafetyOutlined style={{ color: '#722ed1' }} />,
      value: attention.risksWithoutActions,
      label: t('dashboardHome.attention.risksWithoutActions'),
      onClick: () => navigate('/risks'),
    },
  ];

  const processCards = [
    {
      key: 'risks',
      title: t('dashboardHome.processes.risksTitle'),
      description: t('dashboardHome.processes.risksDescription'),
      metrics: [
        { label: t('dashboardHome.processes.risksTotal'), value: processes.risks.total },
        { label: t('dashboardHome.processes.risksCriticalHigh'), value: processes.risks.criticalHigh },
        { label: t('dashboardHome.processes.risksWithoutActions'), value: processes.risks.withoutActions },
      ],
      onOpen: () => navigate('/risks'),
    },
    {
      key: 'analyses',
      title: t('dashboardHome.processes.analysesTitle'),
      description: t('dashboardHome.processes.analysesDescription'),
      metrics: [
        { label: t('dashboardHome.processes.analysesTotal'), value: processes.analyses.total },
        { label: t('dashboardHome.processes.analysesInProgress'), value: processes.analyses.inProgress },
        { label: t('dashboardHome.processes.analysesCompleted'), value: processes.analyses.completed },
      ],
      onOpen: () => navigate('/analyses'),
    },
    {
      key: 'actions',
      title: t('dashboardHome.processes.actionsTitle'),
      description: t('dashboardHome.processes.actionsDescription'),
      metrics: [
        { label: t('dashboardHome.processes.actionsTotal'), value: processes.actions.total },
        { label: t('dashboardHome.processes.actionsInProgress'), value: processes.actions.inProgress },
        { label: t('dashboardHome.processes.actionsOverdue'), value: processes.actions.overdue },
      ],
      onOpen: () => navigate('/actions'),
    },
    {
      key: 'academy',
      title: t('dashboardHome.processes.academyTitle'),
      description: t('dashboardHome.processes.academyDescription'),
      metrics: [
        { label: t('dashboardHome.processes.academyAssigned'), value: processes.academy.assigned },
        { label: t('dashboardHome.processes.academyCompleted'), value: processes.academy.completed },
        { label: t('dashboardHome.processes.academyOverdue'), value: processes.academy.overdue },
      ],
      onOpen: () => navigate('/academy'),
    },
  ];

  const canManageRisks = !!user && RISK_MANAGE_ROLES.includes(user.role);
  const canManageAnalyses = !!user && ANALYSIS_MANAGE_ROLES.includes(user.role);
  const canManageActions = !!user && ACTION_MANAGE_ROLES.includes(user.role);
  const canManageAcademy = !!user && ACADEMY_MANAGE_ROLES.includes(user.role);

  const riskLevelData = [
    { level: t('scoreLevel.LOW'), count: analyticsCompact.riskLevelDistribution.low },
    { level: t('scoreLevel.MEDIUM'), count: analyticsCompact.riskLevelDistribution.medium },
    { level: t('scoreLevel.HIGH'), count: analyticsCompact.riskLevelDistribution.high },
    { level: t('scoreLevel.CRITICAL'), count: analyticsCompact.riskLevelDistribution.critical },
  ];

  const actionTrendData = analyticsCompact.actionTrends.flatMap((tr) => [
    { month: tr.month, value: tr.created, series: t('dashboard.seriesCreated') },
    { month: tr.month, value: tr.completed, series: t('actionStatus.COMPLETED') },
  ]);

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('dashboard.title')}
          <InfoTooltip text={t('tooltips.dashboard.whatIsSystem')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="dashboard" />
      </Space>

      {/* 1. Что требует внимания */}
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {t('dashboardHome.attention.title')}
      </Typography.Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {attentionCards.map((card) => (
          <Col xs={12} sm={8} lg={4} key={card.key}>
            <Card hoverable onClick={card.onClick} styles={{ body: { padding: 16 } }}>
              <Statistic title={card.label} value={card.value} prefix={card.icon} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 2. Основные процессы */}
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {t('dashboardHome.processes.title')}
      </Typography.Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {processCards.map((card) => (
          <Col xs={24} sm={12} xl={6} key={card.key}>
            <Card title={<span style={{ whiteSpace: 'normal' }}>{card.title}</span>} styles={{ body: { paddingTop: 12 } }}>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12, minHeight: 54 }}>
                {card.description}
              </Typography.Paragraph>
              <Space size={24} wrap style={{ marginBottom: 16 }}>
                {card.metrics.map((metric) => (
                  <Statistic key={metric.label} title={metric.label} value={metric.value} valueStyle={{ fontSize: 18 }} />
                ))}
              </Space>
              <Button block onClick={card.onOpen}>
                {t('dashboardHome.processes.openButton')}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 3. Быстрые действия */}
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {t('dashboardHome.quickActions.title')}
      </Typography.Title>
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          {canManageRisks && (
            <Button icon={<PlusOutlined />} onClick={() => navigate('/risks?create=1')}>
              {t('dashboardHome.quickActions.createRisk')}
            </Button>
          )}
          {canManageAnalyses && (
            <Button icon={<PlusOutlined />} onClick={() => navigate('/analyses?create=1')}>
              {t('dashboardHome.quickActions.startAnalysis')}
            </Button>
          )}
          {canManageActions && (
            <Button icon={<PlusOutlined />} onClick={() => navigate('/actions?create=1')}>
              {t('dashboardHome.quickActions.createAction')}
            </Button>
          )}
          {canManageAcademy && (
            <Button icon={<PlusOutlined />} onClick={() => navigate('/academy/courses?create=1')}>
              {t('dashboardHome.quickActions.createCourse')}
            </Button>
          )}
          <Button icon={<BankOutlined />} onClick={() => navigate('/risks')}>
            {t('dashboardHome.quickActions.openTemplateLibrary')}
          </Button>
          <Button icon={<FileTextOutlined />} onClick={() => navigate('/reports')}>
            {t('dashboardHome.quickActions.generateReport')}
          </Button>
        </Space>
      </Card>

      {/* 4. Последние события */}
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {t('dashboardHome.recentEvents.title')}
      </Typography.Title>
      <Card style={{ marginBottom: 24 }}>
        {recentEvents.length === 0 ? (
          <Empty description={t('dashboardHome.recentEvents.none')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={recentEvents}
            renderItem={(event) => {
              const route = recentEventRoute(event);
              return (
                <List.Item
                  style={{ cursor: route ? 'pointer' : 'default' }}
                  onClick={() => route && navigate(route)}
                >
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <Typography.Text>{recentEventLabel(event)}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {event.userName ?? t('common.unknown')} · {dayjs(event.createdAt).format('DD.MM.YYYY HH:mm')}
                    </Typography.Text>
                  </Space>
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      {/* 5. Краткая аналитика */}
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        {t('dashboardHome.compactAnalytics.title')}
      </Typography.Title>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card title={t('dashboardHome.compactAnalytics.riskLevelDistribution')} styles={{ body: { paddingBottom: 0 } }}>
            <Column data={riskLevelData} xField="level" yField="count" height={180} label={{ text: 'count', style: { fill: '#fff' } }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('dashboardHome.compactAnalytics.actionDynamics')}>
            <Line
              data={actionTrendData}
              xField="month"
              yField="value"
              colorField="series"
              height={180}
              point={{ shapeField: 'circle', sizeField: 2 }}
              legend={{ color: { position: 'top' } }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('dashboardHome.compactAnalytics.trainingProgress')}>
            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">{t('academyDashboard.completionCardTitle')}</Typography.Text>
              <Progress percent={analyticsCompact.academyProgress.completionPercent} status="active" />
            </div>
            <div>
              <Typography.Text type="secondary">{t('academyDashboard.averageProgressCardTitle')}</Typography.Text>
              <Progress percent={analyticsCompact.academyProgress.averageProgress} status="active" strokeColor="#13a8a8" />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
