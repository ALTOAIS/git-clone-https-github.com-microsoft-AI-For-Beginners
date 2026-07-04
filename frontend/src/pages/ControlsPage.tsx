import { useQuery } from '@tanstack/react-query';
import { Select, Space, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { controlsApi } from '../api/endpoints';
import type { Control } from '../types';
import { CONTROL_EFFECTIVENESS_COLORS, CONTROL_EFFECTIVENESS_LABELS } from '../utils/riskDisplay';

export function ControlsPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<string | undefined>();
  const [effectiveness, setEffectiveness] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['controls-all'],
    queryFn: () => controlsApi.listForRisk('').then((r) => r.data),
  });

  const filtered = (data ?? []).filter(
    (c) => (!type || c.type === type) && (!effectiveness || c.effectiveness === effectiveness),
  );

  return (
    <div>
      <Typography.Title level={3}>Controls</Typography.Title>
      <Typography.Paragraph type="secondary">
        Preventive, detective and corrective controls defined across the risk register. Open a risk to add or edit
        its controls.
      </Typography.Paragraph>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder="Type"
          style={{ width: 180 }}
          value={type}
          onChange={setType}
          options={['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE'].map((v) => ({ value: v, label: v }))}
        />
        <Select
          allowClear
          placeholder="Effectiveness"
          style={{ width: 200 }}
          value={effectiveness}
          onChange={setEffectiveness}
          options={Object.entries(CONTROL_EFFECTIVENESS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={filtered}
        columns={[
          {
            title: 'Risk',
            dataIndex: ['risk', 'title'],
            render: (title: string, record: Control & { risk?: { id: string; code: string } }) => (
              <a onClick={() => record.risk && navigate(`/risks/${record.risk.id}`)}>
                {record.risk?.code} — {title}
              </a>
            ),
          },
          { title: 'Control', dataIndex: 'title' },
          { title: 'Type', dataIndex: 'type', width: 120 },
          {
            title: 'Effectiveness',
            dataIndex: 'effectiveness',
            width: 170,
            render: (v: Control['effectiveness']) => (
              <Tag color={CONTROL_EFFECTIVENESS_COLORS[v]}>{CONTROL_EFFECTIVENESS_LABELS[v]}</Tag>
            ),
          },
          { title: 'Owner', dataIndex: ['owner', 'fullName'], width: 160 },
        ]}
      />
    </div>
  );
}
