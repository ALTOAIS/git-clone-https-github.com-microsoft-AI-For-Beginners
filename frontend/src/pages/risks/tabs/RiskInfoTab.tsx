import { Button, Descriptions, Form, Input, message, Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import { risksApi } from '../../../api/endpoints';
import { useCategories, useCompanies, useDepartments, useUsersList } from '../../../hooks/useReferenceData';
import type { RiskDetail } from '../../../types';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

export function RiskInfoTab({ risk, onUpdated, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const companyId = Form.useWatch('companyId', form);

  const { data: categories } = useCategories();
  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments(companyId ?? risk.companyId ?? undefined);
  const { data: users } = useUsersList();

  useEffect(() => {
    form.setFieldsValue({
      title: risk.title,
      description: risk.description,
      categoryId: risk.categoryId,
      companyId: risk.companyId,
      departmentId: risk.departmentId,
      ownerId: risk.ownerId,
    });
  }, [risk, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await risksApi.update(risk.id, values);
      message.success('Risk updated');
      setEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Code">{risk.code}</Descriptions.Item>
          <Descriptions.Item label="Version">v{risk.version}</Descriptions.Item>
          <Descriptions.Item label="Category">{risk.category?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Owner">{risk.owner?.fullName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Company">{risk.company?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Department">{risk.department?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Business Process">{risk.businessProcess?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Created By">{risk.createdBy?.fullName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {risk.description || <span style={{ color: '#999' }}>No description</span>}
          </Descriptions.Item>
        </Descriptions>
        {canEdit && (
          <Button style={{ marginTop: 16 }} onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
    );
  }

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="title" label="Title" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="categoryId" label="Category">
        <Select allowClear options={categories?.map((c) => ({ value: c.id, label: c.name }))} />
      </Form.Item>
      <Form.Item name="companyId" label="Company">
        <Select
          allowClear
          options={companies?.map((c) => ({ value: c.id, label: c.name }))}
          onChange={() => form.setFieldValue('departmentId', undefined)}
        />
      </Form.Item>
      <Form.Item name="departmentId" label="Department">
        <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
      </Form.Item>
      <Form.Item name="ownerId" label="Owner">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
        />
      </Form.Item>
      <Space>
        <Button type="primary" onClick={handleSave} loading={saving}>
          Save
        </Button>
        <Button onClick={() => setEditing(false)}>Cancel</Button>
      </Space>
    </Form>
  );
}
