import { AlertOutlined, ClockCircleOutlined, FireOutlined, SafetyOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { Card, Col, List, Row, Skeleton, Statistic, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../api/endpoints';
import { RiskHeatMap } from '../components/RiskHeatMap';

export function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  if (isLoading || !data) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  const trendData = data.trends.flatMap((tr) => [
    { month: tr.month, value: tr.created, series: t('dashboard.seriesCreated') },
    { month: tr.month, value: tr.closed, series: t('dashboard.seriesClosed') },
  ]);

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        {t('dashboard.title')}
      </Typography.Title>

      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.activeRisks')}
              value={data.kpis.activeRisks}
              prefix={<AlertOutlined style={{ color: '#0f5fa8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.criticalRisks')}
              value={data.kpis.criticalRisks}
              valueStyle={{ color: '#f5222d' }}
              prefix={<FireOutlined style={{ color: '#f5222d' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.residualRisks')}
              value={data.kpis.residualRisks}
              prefix={<SafetyOutlined style={{ color: '#13a8a8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.overdueActions')}
              value={data.kpis.overdueActions}
              valueStyle={{ color: data.kpis.overdueActions > 0 ? '#fa8c16' : undefined }}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.inherentHeatMapTitle')} bodyStyle={{ overflowX: 'auto' }}>
            <RiskHeatMap grid={data.heatMap.grid} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.residualReductionTitle')}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title={t('dashboard.avgInherentScore')} value={data.residualRiskSummary.averageInherent} />
              </Col>
              <Col span={8}>
                <Statistic title={t('dashboard.avgResidualScore')} value={data.residualRiskSummary.averageResidual} />
              </Col>
              <Col span={8}>
                <Statistic
                  title={t('dashboard.reduction')}
                  value={data.residualRiskSummary.reductionPercent}
                  suffix="%"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 24 }}>
              <Line
                data={trendData}
                xField="month"
                yField="value"
                colorField="series"
                height={200}
                point={{ shapeField: 'circle', sizeField: 3 }}
                legend={{ color: { position: 'top' } }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title={t('dashboard.topCompanies')}>
            <List
              size="small"
              dataSource={data.topCompanies}
              locale={{ emptyText: t('dashboard.noDataYet') }}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>{item.name ?? t('common.unknown')}</Typography.Text>
                  <Typography.Text strong>{item.count}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('dashboard.topDepartments')}>
            <List
              size="small"
              dataSource={data.topDepartments}
              locale={{ emptyText: t('dashboard.noDataYet') }}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>{item.name ?? t('common.unknown')}</Typography.Text>
                  <Typography.Text strong>{item.count}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('dashboard.topCategories')}>
            <List
              size="small"
              dataSource={data.topCategories}
              locale={{ emptyText: t('dashboard.noDataYet') }}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>{item.name ?? t('common.unknown')}</Typography.Text>
                  <Typography.Text strong>{item.count}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
