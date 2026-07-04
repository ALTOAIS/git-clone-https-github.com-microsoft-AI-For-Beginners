import { Form, Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { risksApi } from '../../api/endpoints';
import { useCategories, useCompanies, useDepartments, useUsersList } from '../../hooks/useReferenceData';

interface RiskFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (riskId: string) => void;
}

export function RiskFormModal({ open, onClose, onCreated }: RiskFormModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const companyId = Form.useWatch('companyId', form);

  const { data: categories } = useCategories();
  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments(companyId);
  const { data: users } = useUsersList();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const { data } = await risksApi.create(values);
      onCreated(data.id);
      form.resetFields();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Register New Risk"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="Create Risk"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
          <Input placeholder="e.g. Bribery risk in vendor selection" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="categoryId" label="Category">
          <Select
            allowClear
            placeholder="Select risk category"
            options={categories?.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="companyId" label="Company">
          <Select
            allowClear
            placeholder="Select company"
            options={companies?.map((c) => ({ value: c.id, label: c.name }))}
            onChange={() => form.setFieldValue('departmentId', undefined)}
          />
        </Form.Item>
        <Form.Item name="departmentId" label="Department">
          <Select
            allowClear
            placeholder="Select department"
            options={departments?.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item name="ownerId" label="Risk Owner">
          <Select
            allowClear
            showSearch
            placeholder="Select owner"
            optionFilterProp="label"
            options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
