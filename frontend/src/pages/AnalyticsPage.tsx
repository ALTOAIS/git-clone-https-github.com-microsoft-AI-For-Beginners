import { Column, Line, Pie } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '../api/endpoints';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
import { RiskHeatMap } from '../components/RiskHeatMap';
import type { RiskStatus } from '../types';
import {
  CONTROL_EFFECTIVENESS_COLORS,
  controlEffectivenessLabel,
  RISK_STATUS_COLORS,
  riskStatusLabel,
  SCORE_LEVEL_COLORS,
  scoreLevel,
} from '../utils/riskDisplay';

export function AnalyticsPage() {
  const { t } = useTranslation();
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
  const topCategories = useQuery({
    queryKey: ['analytics-top-categories'],
    queryFn: () => analyticsApi.topCategories(10).then((r) => r.data as Array<{ name?: string; count: number }>),
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

  const trendData = (trends.data ?? []).flatMap((tr) => [
    { month: tr.month, value: tr.created, series: t('dashboard.seriesCreated') },
    { month: tr.month, value: tr.closed, series: t('dashboard.seriesClosed') },
  ]);

  const controlData = Object.entries(controlEffectiveness.data ?? {}).map(([key, value]) => ({
    type: controlEffectivenessLabel(key as any),
    value,
    color: CONTROL_EFFECTIVENESS_COLORS[key as keyof typeof CONTROL_EFFECTIVENESS_COLORS],
  }));

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3}>{t('analytics.title')}</Typography.Title>
        <ModuleHelpButton moduleKey="analytics" />
      </Space>

      <Tabs
        items={[
          {
            key: 'heatmaps',
            label: t('analytics.tabs.heatmaps'),
            children: (
              <Row gutter={16}>
                <Col xs={24} lg={12}>
                  <Card title={t('analytics.inherentHeatMap')} loading={heatmapInherent.isLoading} bodyStyle={{ overflowX: 'auto' }}>
                    <RiskHeatMap grid={heatmapInherent.data?.grid ?? []} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={t('analytics.residualHeatMap')} loading={heatmapResidual.isLoading} bodyStyle={{ overflowX: 'auto' }}>
                    <RiskHeatMap grid={heatmapResidual.data?.grid ?? []} />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'trends',
            label: t('analytics.tabs.trends'),
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
            label: t('analytics.tabs.topRisks'),
            children: (
              <Table
                rowKey="id"
                loading={topRisks.isLoading}
                dataSource={topRisks.data}
                pagination={false}
                columns={[
                  { title: t('analytics.topRisksColumns.code'), dataIndex: 'code', width: 130 },
                  { title: t('analytics.topRisksColumns.title'), dataIndex: 'title' },
                  {
                    title: t('analytics.topRisksColumns.status'),
                    dataIndex: 'status',
                    width: 150,
                    render: (v: RiskStatus) => <Tag color={RISK_STATUS_COLORS[v]}>{riskStatusLabel(v)}</Tag>,
                  },
                  {
                    title: t('analytics.topRisksColumns.inherentScore'),
                    dataIndex: 'inherentScore',
                    width: 140,
                    render: (v: number) => {
                      const level = scoreLevel(v);
                      return <Tag color={level ? SCORE_LEVEL_COLORS[level] : undefined} style={{ color: '#fff' }}>{v}</Tag>;
                    },
                  },
                  { title: t('analytics.topRisksColumns.company'), dataIndex: ['company', 'name'], width: 160 },
                  { title: t('analytics.topRisksColumns.department'), dataIndex: ['department', 'name'], width: 160 },
                ]}
              />
            ),
          },
          {
            key: 'top-lists',
            label: t('analytics.tabs.topLists'),
            children: (
              <Row gutter={16}>
                <Col xs={24} lg={8}>
                  <Card title={t('analytics.topCompanies')} loading={topCompanies.isLoading}>
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
                  <Card title={t('analytics.topDepartments')} loading={topDepartments.isLoading}>
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
                  <Card title={t('analytics.topSources')} loading={topSources.isLoading}>
                    <Column
                      data={topSources.data ?? []}
                      xField="title"
                      yField="count"
                      height={260}
                      label={{ text: 'count', style: { fill: '#fff' } }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title={t('analytics.topCategories')} loading={topCategories.isLoading}>
                    <Column
                      data={topCategories.data ?? []}
                      xField="name"
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
            label: t('analytics.tabs.controls'),
            children: (
              <Row gutter={16}>
                <Col xs={24} lg={12}>
                  <Card title={t('analytics.controlEffectivenessDist')} loading={controlEffectiveness.isLoading}>
                    <Pie data={controlData} angleField="value" colorField="type" height={280} label={{ text: 'value' }} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={t('analytics.residualReductionTitle')} loading={residualRisk.isLoading}>
                    {residualRisk.data && (
                      <div style={{ fontSize: 16, lineHeight: 2 }}>
                        <div>{t('analytics.avgInherentScore')}: <strong>{residualRisk.data.averageInherent}</strong></div>
                        <div>{t('analytics.avgResidualScore')}: <strong>{residualRisk.data.averageResidual}</strong></div>
                        <div>{t('analytics.reductionLabel')}: <strong style={{ color: '#52c41a' }}>{residualRisk.data.reductionPercent}%</strong></div>
                        <div>{t('analytics.risksAssessed')}: <strong>{residualRisk.data.count}</strong></div>
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
