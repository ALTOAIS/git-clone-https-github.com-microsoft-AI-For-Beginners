import { BookOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Progress, Row, Skeleton, Space, Statistic, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { academyApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { AcademySubNav } from './AcademySubNav';

export function AcademyDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['academy-summary'],
    queryFn: () => academyApi.summary().then((r) => r.data),
  });

  if (isLoading || !data) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  return (
    <div>
      <AcademySubNav />
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('academyDashboard.title')}
          <InfoTooltip text={t('tooltips.academy.whatIsAcademy')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="academy" />
      </Space>
      <Typography.Paragraph type="secondary">{t('academyDashboard.description')}</Typography.Paragraph>

      <Row gutter={16} style={{ marginTop: 16 }}>
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
        <Col xs={24} md={12}>
          <Card title={t('academyDashboard.completionCardTitle')}>
            <Progress percent={data.completionPercent} status="active" />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={t('academyDashboard.averageProgressCardTitle')}>
            <Progress percent={data.averageProgress} status="active" strokeColor="#13a8a8" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
