import { Col, Row, Select, Statistic, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import type { AnalysisActionItem, AnalysisDetail } from '../../../types';
import { ACTION_PRIORITY_COLORS, actionPriorityLabel } from '../../../utils/analysisDisplay';
import { ACTION_STATUS_COLORS, ALL_ACTION_STATUSES, actionStatusLabel } from '../../../utils/riskDisplay';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage13MonitoringTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const now = new Date();

  const total = analysis.actionItems.length;
  const completed = analysis.actionItems.filter((a) => a.status === 'COMPLETED').length;
  const overdue = analysis.actionItems.filter(
    (a) => a.deadline && new Date(a.deadline) < now && a.status !== 'COMPLETED' && a.status !== 'CANCELLED',
  ).length;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleStatusChange = async (item: AnalysisActionItem, status: string) => {
    await analysesApi.updateActionItem(analysis.id, item.id, { status });
    onUpdated();
  };

  return (
    <div>
      <span style={{ color: '#8c8c8c', display: 'block', marginBottom: 16 }}>
        {t('analysisStage13.intro')}
        <InfoTooltip text={t('tooltips.analyses.monitoring')} />
      </span>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic title={t('analysisStage13.total')} value={total} />
        </Col>
        <Col span={6}>
          <Statistic title={t('analysisStage13.completed')} value={completed} valueStyle={{ color: '#52c41a' }} />
        </Col>
        <Col span={6}>
          <Statistic
            title={t('analysisStage13.overdue')}
            value={overdue}
            valueStyle={{ color: overdue > 0 ? '#fa8c16' : undefined }}
          />
        </Col>
        <Col span={6}>
          <Statistic title={t('analysisStage13.completionPercent')} value={completionPercent} suffix="%" />
        </Col>
      </Row>

      <Table
        rowKey="id"
        dataSource={analysis.actionItems}
        pagination={false}
        locale={{ emptyText: t('analysisStage13.noItemsYet') }}
        columns={[
          { title: t('analysisStage13.columns.task'), dataIndex: 'task' },
          {
            title: t('analysisStage13.columns.responsible'),
            dataIndex: ['responsible', 'fullName'],
            width: 160,
            render: (v: string | null) => v ?? '—',
          },
          { title: t('analysisStage13.columns.deadline'), dataIndex: 'deadline', width: 120, render: (v: string | null) => (v ? v.slice(0, 10) : '—') },
          {
            title: t('analysisStage13.columns.priority'),
            dataIndex: 'priority',
            width: 120,
            render: (v: AnalysisActionItem['priority']) => <Tag color={ACTION_PRIORITY_COLORS[v]}>{actionPriorityLabel(v)}</Tag>,
          },
          {
            title: t('analysisStage13.columns.status'),
            dataIndex: 'status',
            width: 180,
            render: (v: AnalysisActionItem['status'], record: AnalysisActionItem) => (
              <Select
                size="small"
                value={v}
                style={{ width: '100%' }}
                variant="borderless"
                onChange={(status) => handleStatusChange(record, status)}
                options={ALL_ACTION_STATUSES.map((value) => ({
                  value,
                  label: <Tag color={ACTION_STATUS_COLORS[value]}>{actionStatusLabel(value)}</Tag>,
                }))}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
