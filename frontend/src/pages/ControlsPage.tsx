import { useQuery } from '@tanstack/react-query';
import { Select, Space, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { controlsApi } from '../api/endpoints';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
import type { Control } from '../types';
import { ALL_CONTROL_EFFECTIVENESS, CONTROL_EFFECTIVENESS_COLORS, controlEffectivenessLabel } from '../utils/riskDisplay';

const CONTROL_TYPE_VALUES = ['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE'] as const;

export function ControlsPage() {
  const { t } = useTranslation();
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
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3}>{t('controlsPage.title')}</Typography.Title>
        <ModuleHelpButton moduleKey="controls" />
      </Space>
      <Typography.Paragraph type="secondary">{t('controlsPage.description')}</Typography.Paragraph>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder={t('controlsPage.typePlaceholder')}
          style={{ width: 180 }}
          value={type}
          onChange={setType}
          options={CONTROL_TYPE_VALUES.map((v) => ({ value: v, label: t(`controlType.${v}`) }))}
        />
        <Select
          allowClear
          placeholder={t('controlsPage.effectivenessPlaceholder')}
          style={{ width: 200 }}
          value={effectiveness}
          onChange={setEffectiveness}
          options={ALL_CONTROL_EFFECTIVENESS.map((value) => ({ value, label: controlEffectivenessLabel(value) }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={filtered}
        columns={[
          {
            title: t('controlsPage.columns.risk'),
            dataIndex: ['risk', 'title'],
            render: (title: string, record: Control & { risk?: { id: string; code: string } }) => (
              <a onClick={() => record.risk && navigate(`/risks/${record.risk.id}`)}>
                {record.risk?.code} — {title}
              </a>
            ),
          },
          { title: t('controlsPage.columns.control'), dataIndex: 'title' },
          { title: t('controlsPage.columns.type'), dataIndex: 'type', width: 120, render: (v: Control['type']) => t(`controlType.${v}`) },
          {
            title: t('controlsPage.columns.effectiveness'),
            dataIndex: 'effectiveness',
            width: 170,
            render: (v: Control['effectiveness']) => (
              <Tag color={CONTROL_EFFECTIVENESS_COLORS[v]}>{controlEffectivenessLabel(v)}</Tag>
            ),
          },
          { title: t('controlsPage.columns.owner'), dataIndex: ['owner', 'fullName'], width: 160 },
        ]}
      />
    </div>
  );
}
