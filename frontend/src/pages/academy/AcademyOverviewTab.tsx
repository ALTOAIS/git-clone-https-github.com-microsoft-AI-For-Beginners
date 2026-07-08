import {
  AlertOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  NotificationOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Empty, List, Progress, Row, Skeleton, Space, Statistic, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';

export function AcademyOverviewTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['academy-summary'],
    queryFn: () => academyApi.summary().then((r) => r.data),
  });

  if (isLoading || !data) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  const attentionItems = [
    ...(data.overdue > 0
      ? [
          {
            key: 'overdue',
            icon: <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
            text: t('academyDashboard.attention.overdue', { count: data.overdue }),
            onClick: () => navigate('/academy/courses'),
          },
        ]
      : []),
    ...data.lowCompletionCourses.map((c) => ({
      key: `low-completion-${c.id}`,
      icon: <AlertOutlined style={{ color: '#fa541c' }} />,
      text: t('academyDashboard.attention.lowCompletionCourse', { title: c.title, percent: c.completionPercent }),
      onClick: () => navigate(`/academy/courses/${c.id}`),
    })),
    ...data.lowScoreTests.map((test) => ({
      key: `low-score-${test.id}`,
      icon: <AlertOutlined style={{ color: '#fa541c' }} />,
      text: t('academyDashboard.attention.lowScoreTest', {
        title: test.title,
        course: test.courseTitle ?? '—',
        percent: test.averageScore,
        count: test.attemptsCount,
      }),
      onClick: () => (test.courseId ? navigate(`/academy/courses/${test.courseId}`) : undefined),
    })),
    ...(data.activeCampaignsCount > 0
      ? [
          {
            key: 'active-campaigns',
            icon: <NotificationOutlined style={{ color: '#1677ff' }} />,
            text: t('academyDashboard.attention.activeCampaigns', { count: data.activeCampaignsCount }),
            onClick: () => navigate('/academy/campaigns'),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('academyDashboard.title')}
          <InfoTooltip text={t('tooltips.academy.whatIsAcademy')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="academy" />
      </Space>
      <Typography.Paragraph type="secondary">{t('academyDashboard.description')}</Typography.Paragraph>

      <Card title={t('academyDashboard.attention.title')} style={{ marginBottom: 16 }}>
        {attentionItems.length === 0 ? (
          <Empty description={t('academyDashboard.attention.none')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={attentionItems}
            renderItem={(item) => (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={item.onClick}
                actions={[<a key="open">{t('academyDashboard.attention.openLink')}</a>]}
              >
                <Space>
                  {item.icon}
                  {item.text}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title={t('academyDashboard.quickActions.title')} style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={() => navigate('/academy/courses?create=1')}>
            {t('academyDashboard.quickActions.createCourse')}
          </Button>
          <Button icon={<TeamOutlined />} onClick={() => navigate('/academy/courses')}>
            {t('academyDashboard.quickActions.assignTraining')}
          </Button>
          <Button icon={<FileTextOutlined />} onClick={() => navigate('/academy/courses')}>
            {t('academyDashboard.quickActions.createTest')}
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => navigate('/academy/surveys?create=1')}>
            {t('academyDashboard.quickActions.createSurvey')}
          </Button>
          <Button icon={<NotificationOutlined />} onClick={() => navigate('/academy/campaigns?create=1')}>
            {t('academyDashboard.quickActions.launchCampaign')}
          </Button>
          <Button icon={<CalendarOutlined />} onClick={() => navigate('/academy/calendar')}>
            {t('academyDashboard.quickActions.openCalendar')}
          </Button>
        </Space>
      </Card>

      <Typography.Title level={4}>{t('academyDashboard.summaryTitle')}</Typography.Title>
      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('academyDashboard.totalCourses')}
              value={data.totalCourses}
              prefix={<BookOutlined style={{ color: '#0f5fa8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('academyDashboard.totalAssigned')}
              value={data.totalAssigned}
              prefix={<TeamOutlined style={{ color: '#13a8a8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('academyDashboard.completed')}
              value={data.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span>
                  {t('academyDashboard.overdue')}
                  <InfoTooltip text={t('tooltips.academy.overdue')} />
                </span>
              }
              value={data.overdue}
              valueStyle={{ color: data.overdue > 0 ? '#fa8c16' : undefined }}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('academyDashboard.certificatesIssued')}
              value={data.certificatesIssued}
              prefix={<SafetyCertificateOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} md={9}>
          <Card title={t('academyDashboard.completionCardTitle')}>
            <Progress percent={data.completionPercent} status="active" />
          </Card>
        </Col>
        <Col xs={24} md={9}>
          <Card title={t('academyDashboard.averageProgressCardTitle')}>
            <Progress percent={data.averageProgress} status="active" strokeColor="#13a8a8" />
          </Card>
        </Col>
      </Row>
      {data.activeCampaignsCount > 0 && (
        <Tag color="blue" style={{ marginTop: 16 }}>
          {t('academyDashboard.activeCampaignsTag', { count: data.activeCampaignsCount })}
        </Tag>
      )}
    </div>
  );
}
