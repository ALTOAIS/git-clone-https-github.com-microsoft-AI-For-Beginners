import { useQuery } from '@tanstack/react-query';
import { Select, Space, Switch, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { actionsApi } from '../api/endpoints';
import { InfoTooltip } from '../components/InfoTooltip';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
import type { Action, ActionStatus } from '../types';
import { ACTION_STATUS_COLORS, ALL_ACTION_STATUSES, actionStatusLabel } from '../utils/riskDisplay';

export function ActionPlansPage() {
  const { t } = useTranslation();
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
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3}>{t('actionsPage.title')}</Typography.Title>
        <ModuleHelpButton moduleKey="actions" />
      </Space>
      <Typography.Paragraph type="secondary">{t('actionsPage.description')}</Typography.Paragraph>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder={t('actionsPage.statusPlaceholder')}
          style={{ width: 180 }}
          value={status}
          onChange={setStatus}
          options={ALL_ACTION_STATUSES.map((value) => ({ value, label: actionStatusLabel(value) }))}
        />
        <Space>
          <Switch checked={overdueOnly} onChange={setOverdueOnly} />
          <span>
            {t('actionsPage.overdueOnly')}
            <InfoTooltip text={t('tooltips.actions.overdueFilter')} />
          </span>
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          {
            title: t('actionsPage.columns.risk'),
            dataIndex: ['risk', 'title'],
            render: (title: string, record: Action) => (
              <a onClick={() => record.risk && navigate(`/risks/${record.risk.id}`)}>
                {record.risk?.code} — {title}
              </a>
            ),
          },
          { title: t('actionsPage.columns.action'), dataIndex: 'title' },
          { title: t('actionsPage.columns.owner'), dataIndex: ['owner', 'fullName'], width: 160 },
          {
            title: (
              <span>
                {t('actionsPage.columns.deadline')}
                <InfoTooltip text={t('tooltips.actions.deadline')} />
              </span>
            ),
            dataIndex: 'deadline',
            width: 130,
            render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
          },
          {
            title: (
              <span>
                {t('actionsPage.columns.status')}
                <InfoTooltip text={t('tooltips.actions.actionStatus')} />
              </span>
            ),
            dataIndex: 'status',
            width: 140,
            render: (v: Action['status']) => <Tag color={ACTION_STATUS_COLORS[v]}>{actionStatusLabel(v)}</Tag>,
          },
        ]}
      />
    </div>
  );
}
