import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import { useState } from 'react';
import { controlsApi } from '../../../api/endpoints';
import type { Control, RiskDetail } from '../../../types';
import { CONTROL_EFFECTIVENESS_COLORS, CONTROL_EFFECTIVENESS_LABELS } from '../../../utils/riskDisplay';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

const TYPE_OPTIONS = ['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE'].map((v) => ({ value: v, label: v }));
const EFFECTIVENESS_OPTIONS = Object.entries(CONTROL_EFFECTIVENESS_LABELS).map(([value, label]) => ({ value, label }));

export function RiskControlsTab({ risk, onUpdated, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Control | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (control: Control) => {
    setEditing(control);
    form.setFieldsValue(control);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await controlsApi.update(editing.id, values);
        message.success('Control updated');
      } else {
        await controlsApi.create({ ...values, riskId: risk.id });
        message.success('Control added');
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await controlsApi.remove(id);
    message.success('Control removed');
    onUpdated();
  };

  return (
    <div>
      {canEdit && (
        <Button icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
          Add Control
        </Button>
      )}
      <Table
        rowKey="id"
        dataSource={risk.controls}
        pagination={false}
        locale={{ emptyText: 'No controls defined for this risk' }}
        columns={[
          { title: 'Type', dataIndex: 'type', width: 120 },
          { title: 'Title', dataIndex: 'title' },
          {
            title: 'Effectiveness',
            dataIndex: 'effectiveness',
            width: 160,
            render: (v: Control['effectiveness']) => (
              <Tag color={CONTROL_EFFECTIVENESS_COLORS[v]}>{CONTROL_EFFECTIVENESS_LABELS[v]}</Tag>
            ),
          },
          { title: 'Owner', dataIndex: ['owner', 'fullName'], width: 150 },
          ...(canEdit
            ? [
                {
                  title: 'Actions',
                  width: 140,
                  render: (_: unknown, record: Control) => (
                    <>
                      <a onClick={() => openEdit(record)}>Edit</a>{' '}
                      <Popconfirm title="Remove this control?" onConfirm={() => handleDelete(record.id)}>
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
        title={editing ? 'Edit Control' : 'Add Control'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="effectiveness" label="Effectiveness">
            <Select options={EFFECTIVENESS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
