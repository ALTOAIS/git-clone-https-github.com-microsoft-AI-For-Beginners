import { useQuery } from '@tanstack/react-query';
import { Select, Space, Switch, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { actionsApi } from '../api/endpoints';
import type { Action, ActionStatus } from '../types';
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS } from '../utils/riskDisplay';

export function ActionPlansPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ActionStatus | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['actions', { page, status, overdueOnly }],
    queryFn: () => actionsApi.list({ page, pageSize: 20, status, overdueOnly }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <Typography.Title level={3}>Action Plans</Typography.Title>
      <Typography.Paragraph type="secondary">
        Remediation and mitigation actions across all risks. Open a risk to add or update its action plans.
      </Typography.Paragraph>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 180 }}
          value={status}
          onChange={setStatus}
          options={Object.entries(ACTION_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Space>
          <Switch checked={overdueOnly} onChange={setOverdueOnly} />
          <span>Overdue only</span>
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          {
            title: 'Risk',
            dataIndex: ['risk', 'title'],
            render: (title: string, record: Action) => (
              <a onClick={() => record.risk && navigate(`/risks/${record.risk.id}`)}>
                {record.risk?.code} — {title}
              </a>
            ),
          },
          { title: 'Action', dataIndex: 'title' },
          { title: 'Owner', dataIndex: ['owner', 'fullName'], width: 160 },
          {
            title: 'Deadline',
            dataIndex: 'deadline',
            width: 130,
            render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 140,
            render: (v: Action['status']) => <Tag color={ACTION_STATUS_COLORS[v]}>{ACTION_STATUS_LABELS[v]}</Tag>,
          },
        ]}
      />
    </div>
  );
}
