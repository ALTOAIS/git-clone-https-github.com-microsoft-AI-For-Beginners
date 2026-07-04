import { AlertOutlined, ClockCircleOutlined, FireOutlined, SafetyOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { Card, Col, List, Row, Skeleton, Statistic, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/endpoints';
import { RiskHeatMap } from '../components/RiskHeatMap';

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  if (isLoading || !data) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  const trendData = data.trends.flatMap((t) => [
    { month: t.month, value: t.created, series: 'Created' },
    { month: t.month, value: t.closed, series: 'Closed' },
  ]);

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Dashboard
      </Typography.Title>

      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Risks"
              value={data.kpis.activeRisks}
              prefix={<AlertOutlined style={{ color: '#0f5fa8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Critical Risks"
              value={data.kpis.criticalRisks}
              valueStyle={{ color: '#f5222d' }}
              prefix={<FireOutlined style={{ color: '#f5222d' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Assessed Residual Risks"
              value={data.kpis.residualRisks}
              prefix={<SafetyOutlined style={{ color: '#13a8a8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue Actions"
              value={data.kpis.overdueActions}
              valueStyle={{ color: data.kpis.overdueActions > 0 ? '#fa8c16' : undefined }}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Inherent Risk Heat Map" bodyStyle={{ overflowX: 'auto' }}>
            <RiskHeatMap grid={data.heatMap.grid} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Residual Risk Reduction">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="Avg Inherent Score" value={data.residualRiskSummary.averageInherent} />
              </Col>
              <Col span={8}>
                <Statistic title="Avg Residual Score" value={data.residualRiskSummary.averageResidual} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Reduction"
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
          <Card title="Top Companies">
            <List
              size="small"
              dataSource={data.topCompanies}
              locale={{ emptyText: 'No data yet' }}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>{item.name ?? 'Unknown'}</Typography.Text>
                  <Typography.Text strong>{item.count}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Top Departments">
            <List
              size="small"
              dataSource={data.topDepartments}
              locale={{ emptyText: 'No data yet' }}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>{item.name ?? 'Unknown'}</Typography.Text>
                  <Typography.Text strong>{item.count}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Top Categories">
            <List
              size="small"
              dataSource={data.topCategories}
              locale={{ emptyText: 'No data yet' }}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>{item.name ?? 'Unknown'}</Typography.Text>
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
