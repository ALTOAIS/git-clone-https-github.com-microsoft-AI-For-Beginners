import { App, Form, Input, InputNumber, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { riskTemplatesApi } from '../../api/endpoints';
import { useCategories, useCompanies, useDepartments, useUsersList } from '../../hooks/useReferenceData';
import type { RiskTemplate } from '../../types';

interface Props {
  template: RiskTemplate | null;
  onClose: () => void;
  onCreated: (riskId: string) => void;
}

export function CreateRiskFromTemplateModal({ template, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const companyId = Form.useWatch('companyId', form);

  const { data: categories } = useCategories();
  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments(companyId);
  const { data: users } = useUsersList();

  useEffect(() => {
    if (!template) return;
    form.setFieldsValue({
      title: template.title,
      description: template.description,
      categoryId: template.categoryId ?? undefined,
      likelihood: template.baseProbability,
      impact: template.baseImpact,
      controls: template.typicalControls,
      actions: template.recommendedActions,
    });
  }, [template, form]);

  const handleOk = async () => {
    if (!template) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const { data } = await riskTemplatesApi.createRisk(template.id, values);
      message.success(t('createRiskFromTemplate.created'));
      onCreated(data.id);
      form.resetFields();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('createRiskFromTemplate.modalTitle', { title: template?.title })}
      open={!!template}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      width={720}
      destroyOnHidden
      okText={t('createRiskFromTemplate.createButton')}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label={t('riskForm.titleLabel')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t('riskForm.descriptionLabel')}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="categoryId" label={t('riskForm.categoryLabel')}>
          <Select allowClear options={categories?.map((c) => ({ value: c.id, label: c.name }))} />
        </Form.Item>
        <Form.Item name="companyId" label={t('riskForm.companyLabel')}>
          <Select
            allowClear
            options={companies?.map((c) => ({ value: c.id, label: c.name }))}
            onChange={() => form.setFieldValue('departmentId', undefined)}
          />
        </Form.Item>
        <Form.Item name="departmentId" label={t('riskForm.departmentLabel')}>
          <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
        </Form.Item>
        <Form.Item name="ownerId" label={t('riskForm.ownerLabel')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
          />
        </Form.Item>
        <Form.Item name="likelihood" label={t('createRiskFromTemplate.likelihoodLabel')} rules={[{ required: true }]}>
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="impact" label={t('createRiskFromTemplate.impactLabel')} rules={[{ required: true }]}>
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="controls" label={t('createRiskFromTemplate.controlsLabel')}>
          <Select mode="tags" open={false} tokenSeparators={['\n']} />
        </Form.Item>
        <Form.Item name="actions" label={t('createRiskFromTemplate.actionsLabel')}>
          <Select mode="tags" open={false} tokenSeparators={['\n']} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
