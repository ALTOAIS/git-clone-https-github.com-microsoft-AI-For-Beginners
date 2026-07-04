import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentsApi, risksApi, sourcesApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import type { Incident } from '../types';
import { INCIDENT_STATUS_LABELS, SOURCE_TYPE_LABELS } from '../utils/riskDisplay';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER', 'INTERNAL_AUDIT'];

const ACTION_OPTIONS = [
  { value: 'NONE', label: 'No action' },
  { value: 'CREATE_RISK', label: 'Create new risk' },
  { value: 'UPDATE_RISK', label: 'Update existing risk' },
  { value: 'CLOSE_RISK', label: 'Close existing risk' },
  { value: 'ESCALATE_RISK', label: 'Escalate existing risk' },
];

export function IncidentsPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const action = Form.useWatch('action', form);

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
    message.success('Incident logged');
    setOpen(false);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Incidents
        </Typography.Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Log Incident
          </Button>
        )}
      </Space>
      <Typography.Paragraph type="secondary">
        An incident can create, update, close, or escalate a risk in the Risk Register.
      </Typography.Paragraph>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          { title: 'Title', dataIndex: 'title' },
          { title: 'Status', dataIndex: 'status', width: 140, render: (v: Incident['status']) => <Tag>{INCIDENT_STATUS_LABELS[v]}</Tag> },
          { title: 'Action', dataIndex: 'action', width: 150 },
          {
            title: 'Linked Risk',
            dataIndex: ['risk', 'code'],
            width: 180,
            render: (code: string, record: Incident) =>
              record.risk ? <a onClick={() => navigate(`/risks/${record.risk!.id}`)}>{code}</a> : '—',
          },
          { title: 'Reported By', dataIndex: ['reportedBy', 'fullName'], width: 160 },
        ]}
      />

      <Modal title="Log Incident" open={open} onCancel={() => setOpen(false)} onOk={handleCreate} width={560}>
        <Form form={form} layout="vertical" initialValues={{ action: 'NONE', status: 'OPEN' }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="occurredAt" label="Occurred At">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="sourceId" label="Source">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={sources?.map((s) => ({ value: s.id, label: `${s.title} (${SOURCE_TYPE_LABELS[s.type]})` }))}
            />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={Object.entries(INCIDENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="action" label="Risk Action">
            <Select options={ACTION_OPTIONS} />
          </Form.Item>
          {action && action !== 'NONE' && action !== 'CREATE_RISK' && (
            <Form.Item name="riskId" label="Existing Risk" rules={[{ required: true, message: 'Select a risk' }]}>
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
