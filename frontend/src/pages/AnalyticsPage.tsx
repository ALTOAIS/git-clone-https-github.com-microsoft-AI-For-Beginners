import { Column, Line, Pie } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Table, Tabs, Tag, Typography } from 'antd';
import { analyticsApi } from '../api/endpoints';
import { RiskHeatMap } from '../components/RiskHeatMap';
import { CONTROL_EFFECTIVENESS_COLORS, CONTROL_EFFECTIVENESS_LABELS, RISK_STATUS_COLORS, RISK_STATUS_LABELS, SCORE_LEVEL_COLORS, scoreLevel } from '../utils/riskDisplay';

export function AnalyticsPage() {
  const heatmapInherent = useQuery({
    queryKey: ['analytics-heatmap', 'inherent'],
    queryFn: () => analyticsApi.heatmap('inherent').then((r) => r.data as { grid: number[][] }),
  });
  const heatmapResidual = useQuery({
    queryKey: ['analytics-heatmap', 'residual'],
    queryFn: () => analyticsApi.heatmap('residual').then((r) => r.data as { grid: number[][] }),
  });
  const trends = useQuery({
    queryKey: ['analytics-trends'],
    queryFn: () =>
      analyticsApi.trends(12).then((r) => r.data as Array<{ month: string; created: number; closed: number }>),
  });
  const topRisks = useQuery({
    queryKey: ['analytics-top-risks'],
    queryFn: () => analyticsApi.topRisks(10).then((r) => r.data as any[]),
  });
  const topCompanies = useQuery({
    queryKey: ['analytics-top-companies'],
    queryFn: () => analyticsApi.topCompanies(10).then((r) => r.data as Array<{ name?: string; count: number }>),
  });
  const topDepartments = useQuery({
    queryKey: ['analytics-top-departments'],
    queryFn: () => analyticsApi.topDepartments(10).then((r) => r.data as Array<{ name?: string; count: number }>),
  });
  const topSources = useQuery({
    queryKey: ['analytics-top-sources'],
    queryFn: () => analyticsApi.topSources(10).then((r) => r.data as Array<{ title?: string; count: number }>),
  });
  const controlEffectiveness = useQuery({
    queryKey: ['analytics-control-effectiveness'],
    queryFn: () => analyticsApi.controlEffectiveness().then((r) => r.data as Record<string, number>),
  });
  const residualRisk = useQuery({
    queryKey: ['analytics-residual-risk'],
    queryFn: () =>
      analyticsApi
        .residualRisk()
        .then((r) => r.data as { averageInherent: number; averageResidual: number; reductionPercent: number; count: number }),
  });

  const trendData = (trends.data ?? []).flatMap((t) => [
    { month: t.month, value: t.created, series: 'Created' },
    { month: t.month, value: t.closed, series: 'Closed' },
  ]);

  const controlData = Object.entries(controlEffectiveness.data ?? {}).map(([key, value]) => ({
    type: CONTROL_EFFECTIVENESS_LABELS[key as keyof typeof CONTROL_EFFECTIVENESS_LABELS],
    value,
    color: CONTROL_EFFECTIVENESS_COLORS[key as keyof typeof CONTROL_EFFECTIVENESS_COLORS],
  }));

  return (
    <div>
      <Typography.Title level={3}>Analytics</Typography.Title>

      <Tabs
        items={[
          {
            key: 'heatmaps',
            label: 'Heat Maps',
            children: (
              <Row gutter={16}>
                <Col xs={24} lg={12}>
                  <Card title="Inherent Risk Heat Map" loading={heatmapInherent.isLoading} bodyStyle={{ overflowX: 'auto' }}>
                    <RiskHeatMap grid={heatmapInherent.data?.grid ?? []} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Residual Risk Heat Map" loading={heatmapResidual.isLoading} bodyStyle={{ overflowX: 'auto' }}>
                    <RiskHeatMap grid={heatmapResidual.data?.grid ?? []} />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'trends',
            label: 'Risk Trends',
            children: (
              <Card loading={trends.isLoading}>
                <Line
                  data={trendData}
                  xField="month"
                  yField="value"
                  colorField="series"
                  height={320}
                  point={{ shapeField: 'circle', sizeField: 3 }}
                  legend={{ color: { position: 'top' } }}
                />
              </Card>
            ),
          },
          {
            key: 'top-risks',
            label: 'Top Risks',
            children: (
              <Table
                rowKey="id"
                loading={topRisks.isLoading}
                dataSource={topRisks.data}
                pagination={false}
                columns={[
                  { title: 'Code', dataIndex: 'code', width: 130 },
                  { title: 'Title', dataIndex: 'title' },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    width: 150,
                    render: (v: keyof typeof RISK_STATUS_LABELS) => (
                      <Tag color={RISK_STATUS_COLORS[v]}>{RISK_STATUS_LABELS[v]}</Tag>
                    ),
                  },
                  {
                    title: 'Inherent Score',
                    dataIndex: 'inherentScore',
                    width: 140,
                    render: (v: number) => {
                      const level = scoreLevel(v);
                      return <Tag color={level ? SCORE_LEVEL_COLORS[level] : undefined} style={{ color: '#fff' }}>{v}</Tag>;
                    },
                  },
                  { title: 'Company', dataIndex: ['company', 'name'], width: 160 },
                  { title: 'Department', dataIndex: ['department', 'name'], width: 160 },
                ]}
              />
            ),
          },
          {
            key: 'top-lists',
            label: 'Top Companies / Departments / Sources',
            children: (
              <Row gutter={16}>
                <Col xs={24} lg={8}>
                  <Card title="Top Companies" loading={topCompanies.isLoading}>
                    <Column
                      data={topCompanies.data ?? []}
                      xField="name"
                      yField="count"
                      height={260}
                      label={{ text: 'count', style: { fill: '#fff' } }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Top Departments" loading={topDepartments.isLoading}>
                    <Column
                      data={topDepartments.data ?? []}
                      xField="name"
                      yField="count"
                      height={260}
                      label={{ text: 'count', style: { fill: '#fff' } }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Top Sources" loading={topSources.isLoading}>
                    <Column
                      data={topSources.data ?? []}
                      xField="title"
                      yField="count"
                      height={260}
                      label={{ text: 'count', style: { fill: '#fff' } }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'controls',
            label: 'Control Effectiveness',
            children: (
              <Row gutter={16}>
                <Col xs={24} lg={12}>
                  <Card title="Control Effectiveness Distribution" loading={controlEffectiveness.isLoading}>
                    <Pie data={controlData} angleField="value" colorField="type" height={280} label={{ text: 'value' }} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Residual Risk Reduction" loading={residualRisk.isLoading}>
                    {residualRisk.data && (
                      <div style={{ fontSize: 16, lineHeight: 2 }}>
                        <div>Average inherent score: <strong>{residualRisk.data.averageInherent}</strong></div>
                        <div>Average residual score: <strong>{residualRisk.data.averageResidual}</strong></div>
                        <div>Reduction: <strong style={{ color: '#52c41a' }}>{residualRisk.data.reductionPercent}%</strong></div>
                        <div>Risks assessed: <strong>{residualRisk.data.count}</strong></div>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
}
