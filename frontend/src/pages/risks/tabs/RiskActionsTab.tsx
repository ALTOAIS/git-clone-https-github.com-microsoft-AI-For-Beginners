import { PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, message, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { actionsApi } from '../../../api/endpoints';
import { useUsersList } from '../../../hooks/useReferenceData';
import type { Action, RiskDetail } from '../../../types';
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS } from '../../../utils/riskDisplay';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

const STATUS_OPTIONS = Object.entries(ACTION_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function RiskActionsTab({ risk, onUpdated, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Action | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { data: users } = useUsersList();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (action: Action) => {
    setEditing(action);
    form.setFieldsValue({ ...action, deadline: action.deadline ? dayjs(action.deadline) : undefined });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = { ...values, deadline: values.deadline ? values.deadline.toISOString() : undefined };
    setSaving(true);
    try {
      if (editing) {
        await actionsApi.update(editing.id, payload);
        message.success('Action updated');
      } else {
        await actionsApi.create({ ...payload, riskId: risk.id });
        message.success('Action created');
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await actionsApi.remove(id);
    message.success('Action removed');
    onUpdated();
  };

  return (
    <div>
      {canEdit && (
        <Button icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
          Add Action
        </Button>
      )}
      <Table
        rowKey="id"
        dataSource={risk.actions}
        pagination={false}
        locale={{ emptyText: 'No action plans yet' }}
        columns={[
          { title: 'Title', dataIndex: 'title' },
          { title: 'Owner', dataIndex: ['owner', 'fullName'], width: 150 },
          {
            title: 'Deadline',
            dataIndex: 'deadline',
            width: 120,
            render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 130,
            render: (v: Action['status']) => <Tag color={ACTION_STATUS_COLORS[v]}>{ACTION_STATUS_LABELS[v]}</Tag>,
          },
          ...(canEdit
            ? [
                {
                  title: 'Actions',
                  width: 140,
                  render: (_: unknown, record: Action) => (
                    <>
                      <a onClick={() => openEdit(record)}>Edit</a>{' '}
                      <Popconfirm title="Remove this action?" onConfirm={() => handleDelete(record.id)}>
                        <a>Delete</a>
                      </Popconfirm>
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        title={editing ? 'Edit Action' : 'Add Action'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="ownerId" label="Owner">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="deadline" label="Deadline">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="evidence" label="Evidence">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="result" label="Result">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="residualRiskImpact" label="Residual Risk Impact">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
