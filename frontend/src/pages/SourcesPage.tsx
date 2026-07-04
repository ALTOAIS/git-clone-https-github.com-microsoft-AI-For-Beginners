import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { sourcesApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import type { Source } from '../types';
import { SOURCE_TYPE_LABELS } from '../utils/riskDisplay';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

export function SourcesPage() {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [type, setType] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isFetching } = useQuery({
    queryKey: ['sources', { page, type, search }],
    queryFn: () => sourcesApi.list({ page, pageSize: 20, type, search: search || undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    await sourcesApi.create({ ...values, occurredAt: values.occurredAt?.toISOString() });
    message.success('Source created');
    setOpen(false);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['sources'] });
  };

  const handleDelete = async (id: string) => {
    await sourcesApi.remove(id);
    message.success('Source deleted');
    queryClient.invalidateQueries({ queryKey: ['sources'] });
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Risk Sources
        </Typography.Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            New Source
          </Button>
        )}
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="Search sources" allowClear style={{ width: 260 }} onSearch={setSearch} />
        <Select
          allowClear
          placeholder="Type"
          style={{ width: 240 }}
          value={type}
          onChange={setType}
          options={Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          { title: 'Title', dataIndex: 'title' },
          { title: 'Type', dataIndex: 'type', render: (v: Source['type']) => <Tag>{SOURCE_TYPE_LABELS[v]}</Tag> },
          { title: 'Reference', dataIndex: 'referenceNumber' },
          { title: 'Linked Risks', dataIndex: ['_count', 'risks'], width: 120 },
          {
            title: 'Actions',
            width: 100,
            render: (_: unknown, record: Source) =>
              canManage ? (
                <Popconfirm title="Delete this source?" onConfirm={() => handleDelete(record.id)}>
                  <a>Delete</a>
                </Popconfirm>
              ) : null,
          },
        ]}
      />

      <Modal title="New Risk Source" open={open} onCancel={() => setOpen(false)} onOk={handleCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="referenceNumber" label="Reference Number">
            <Input />
          </Form.Item>
          <Form.Item name="occurredAt" label="Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
