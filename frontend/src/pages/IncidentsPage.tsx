import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { incidentsApi, risksApi, sourcesApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import { InfoTooltip } from '../components/InfoTooltip';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
import type { Incident } from '../types';
import { incidentStatusLabel, ALL_INCIDENT_STATUSES, sourceTypeLabel } from '../utils/riskDisplay';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER', 'INTERNAL_AUDIT'];

const INCIDENT_ACTION_VALUES = ['NONE', 'CREATE_RISK', 'UPDATE_RISK', 'CLOSE_RISK', 'ESCALATE_RISK'] as const;

export function IncidentsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const action = Form.useWatch('action', form);

  const actionOptions = INCIDENT_ACTION_VALUES.map((value) => ({ value, label: t(`incidentAction.${value}`) }));

  const { data, isFetching } = useQuery({
    queryKey: ['incidents', page],
    queryFn: () => incidentsApi.list({ page, pageSize: 20 }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: sources } = useQuery({
    queryKey: ['sources-all'],
    queryFn: () => sourcesApi.list({ pageSize: 200 }).then((r) => r.data.items),
  });

  const { data: risks } = useQuery({
    queryKey: ['risks-all'],
    queryFn: () => risksApi.list({ pageSize: 200 }).then((r) => r.data.items),
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    await incidentsApi.create({ ...values, occurredAt: values.occurredAt?.toISOString() });
    message.success(t('incidentsPage.logged'));
    setOpen(false);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('incidentsPage.title')}
          <InfoTooltip text={t('tooltips.incidents.grounds')} />
        </Typography.Title>
        <Space>
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              {t('incidentsPage.logButton')}
            </Button>
          )}
          <ModuleHelpButton moduleKey="incidents" />
        </Space>
      </Space>
      <Typography.Paragraph type="secondary">{t('incidentsPage.description')}</Typography.Paragraph>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          { title: t('incidentsPage.columns.title'), dataIndex: 'title' },
          {
            title: (
              <span>
                {t('incidentsPage.columns.status')}
                <InfoTooltip text={t('tooltips.incidents.statuses')} />
              </span>
            ),
            dataIndex: 'status',
            width: 140,
            render: (v: Incident['status']) => <Tag>{incidentStatusLabel(v)}</Tag>,
          },
          {
            title: (
              <span>
                {t('incidentsPage.columns.action')}
                <InfoTooltip text={t('tooltips.incidents.results')} />
              </span>
            ),
            dataIndex: 'action',
            width: 170,
            render: (v: Incident['action']) => t(`incidentAction.${v}`),
          },
          {
            title: t('incidentsPage.columns.linkedRisk'),
            dataIndex: ['risk', 'code'],
            width: 180,
            render: (code: string, record: Incident) =>
              record.risk ? <a onClick={() => navigate(`/risks/${record.risk!.id}`)}>{code}</a> : '—',
          },
          { title: t('incidentsPage.columns.reportedBy'), dataIndex: ['reportedBy', 'fullName'], width: 160 },
        ]}
      />

      <Modal title={t('incidentsPage.modalTitle')} open={open} onCancel={() => setOpen(false)} onOk={handleCreate} width={560}>
        <Form form={form} layout="vertical" initialValues={{ action: 'NONE', status: 'OPEN' }}>
          <Form.Item name="title" label={t('incidentsPage.titleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('incidentsPage.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="occurredAt" label={t('incidentsPage.occurredLabel')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="sourceId" label={t('incidentsPage.sourceLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={sources?.map((s) => ({ value: s.id, label: `${s.title} (${sourceTypeLabel(s.type)})` }))}
            />
          </Form.Item>
          <Form.Item name="status" label={t('incidentsPage.statusLabel')}>
            <Select options={ALL_INCIDENT_STATUSES.map((value) => ({ value, label: incidentStatusLabel(value) }))} />
          </Form.Item>
          <Form.Item name="action" label={t('incidentsPage.riskActionLabel')}>
            <Select options={actionOptions} />
          </Form.Item>
          {action && action !== 'NONE' && action !== 'CREATE_RISK' && (
            <Form.Item
              name="riskId"
              label={t('incidentsPage.existingRiskLabel')}
              rules={[{ required: true, message: t('incidentsPage.selectRiskRequired') }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={risks?.map((r) => ({ value: r.id, label: `${r.code} — ${r.title}` }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
