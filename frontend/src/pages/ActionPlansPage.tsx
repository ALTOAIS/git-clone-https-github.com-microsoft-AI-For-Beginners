import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { actionsApi, risksApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import { InfoTooltip } from '../components/InfoTooltip';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
import { useUsersList } from '../hooks/useReferenceData';
import type { Action, ActionStatus } from '../types';
import { ACTION_STATUS_COLORS, ALL_ACTION_STATUSES, actionStatusLabel } from '../utils/riskDisplay';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER', 'RISK_OWNER', 'DEPARTMENT_MANAGER'];

export function ActionPlansPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ActionStatus | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdueOnly') === 'true');
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setCreateOpen(true);
      setSearchParams((prev) => {
        prev.delete('create');
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  const { data: risks } = useQuery({
    queryKey: ['risks-for-action-picker'],
    queryFn: () => risksApi.list({ pageSize: 200 }).then((r) => r.data.items),
    enabled: createOpen,
  });
  const { data: users } = useUsersList();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['actions', { page, status, overdueOnly }],
    queryFn: () => actionsApi.list({ page, pageSize: 20, status, overdueOnly }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    await actionsApi.create({
      ...values,
      deadline: values.deadline ? values.deadline.toISOString() : undefined,
    });
    message.success(t('actionsPage.created'));
    setCreateOpen(false);
    form.resetFields();
    refetch();
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3}>{t('actionsPage.title')}</Typography.Title>
        <Space>
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              {t('actionsPage.createButton')}
            </Button>
          )}
          <ModuleHelpButton moduleKey="actions" />
        </Space>
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

      <Modal
        title={t('actionsPage.createModalTitle')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        width={640}
        destroyOnHidden
        okText={t('common.create')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="riskId" label={t('actionsPage.form.riskLabel')} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={risks?.map((r) => ({ value: r.id, label: `${r.code} — ${r.title}` }))}
            />
          </Form.Item>
          <Form.Item name="title" label={t('actionsPage.form.titleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('actionsPage.form.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="ownerId" label={t('actionsPage.form.ownerLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="deadline" label={t('actionsPage.form.deadlineLabel')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
