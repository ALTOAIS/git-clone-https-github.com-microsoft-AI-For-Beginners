import { AlertOutlined, ClockCircleOutlined, FireOutlined, SafetyOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { Card, Col, List, Row, Skeleton, Space, Statistic, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../api/endpoints';
import { InfoTooltip } from '../components/InfoTooltip';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
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
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('dashboard.title')}
          <InfoTooltip text={t('tooltips.dashboard.whatIsSystem')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="dashboard" />
      </Space>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span>
                  {t('dashboard.activeRisks')}
                  <InfoTooltip text={t('tooltips.dashboard.activeRisksCard')} />
                </span>
              }
              value={data.kpis.activeRisks}
              prefix={<AlertOutlined style={{ color: '#0f5fa8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span>
                  {t('dashboard.criticalRisks')}
                  <InfoTooltip text={t('tooltips.dashboard.criticalRisksCard')} />
                </span>
              }
              value={data.kpis.criticalRisks}
              valueStyle={{ color: '#f5222d' }}
              prefix={<FireOutlined style={{ color: '#f5222d' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span>
                  {t('dashboard.residualRisks')}
                  <InfoTooltip text={t('tooltips.dashboard.residualRisksCard')} />
                </span>
              }
              value={data.kpis.residualRisks}
              prefix={<SafetyOutlined style={{ color: '#13a8a8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span>
                  {t('dashboard.overdueActions')}
                  <InfoTooltip text={t('tooltips.dashboard.overdueActionsCard')} />
                </span>
              }
              value={data.kpis.overdueActions}
              valueStyle={{ color: data.kpis.overdueActions > 0 ? '#fa8c16' : undefined }}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title={
              <span>
                {t('dashboard.analysesCardTitle')}
                <InfoTooltip text={t('tooltips.dashboard.analysesCard')} />
              </span>
            }
          >
            <Row gutter={16}>
              <Col xs={12} md={6}>
                <Statistic title={t('dashboard.analysesTotal')} value={data.analyses.total} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title={t('dashboard.analysesInProgress')} value={data.analyses.inProgress} valueStyle={{ color: '#0f5fa8' }} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title={t('dashboard.analysesCompleted')} value={data.analyses.completed} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title={t('dashboard.analysesOverdue')}
                  value={data.analyses.overdue}
                  valueStyle={{ color: data.analyses.overdue > 0 ? '#fa8c16' : undefined }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                {t('dashboard.inherentHeatMapTitle')}
                <InfoTooltip text={t('tooltips.dashboard.howToUse')} />
              </span>
            }
            bodyStyle={{ overflowX: 'auto' }}
          >
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
