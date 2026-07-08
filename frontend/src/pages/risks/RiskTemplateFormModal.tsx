import { Form, Input, InputNumber, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { riskTemplatesApi } from '../../api/endpoints';
import { useCategories } from '../../hooks/useReferenceData';
import type { RiskTemplate } from '../../types';
import { ALL_RISK_TEMPLATE_DIRECTIONS } from '../../types';
import { riskTemplateDirectionLabel } from '../../utils/riskDisplay';

interface Props {
  open: boolean;
  editing: RiskTemplate | null;
  initialValues?: Partial<RiskTemplate>;
  onClose: () => void;
  onSaved: () => void;
}

export function RiskTemplateFormModal({ open, editing, initialValues, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { data: categories } = useCategories();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        ...editing,
        categoryId: editing.categoryId ?? undefined,
      });
    } else {
      form.resetFields();
      if (initialValues) {
        form.setFieldsValue(initialValues);
      }
    }
  }, [open, editing, initialValues, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    if (editing) {
      await riskTemplatesApi.update(editing.id, values);
    } else {
      await riskTemplatesApi.create(values);
    }
    onSaved();
  };

  return (
    <Modal
      title={editing ? t('riskTemplateForm.editTitle') : t('riskTemplateForm.createTitle')}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      width={720}
      destroyOnHidden
      okText={t('common.save')}
    >
      <Form form={form} layout="vertical" initialValues={{ baseProbability: 3, baseImpact: 3 }}>
        <Form.Item name="title" label={t('riskTemplateForm.titleLabel')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="direction" label={t('riskTemplateForm.directionLabel')} rules={[{ required: true }]}>
          <Select options={ALL_RISK_TEMPLATE_DIRECTIONS.map((d) => ({ value: d, label: riskTemplateDirectionLabel(d) }))} />
        </Form.Item>
        <Form.Item name="categoryId" label={t('riskTemplateForm.categoryLabel')}>
          <Select allowClear options={categories?.map((c) => ({ value: c.id, label: c.name }))} />
        </Form.Item>
        <Form.Item name="description" label={t('riskTemplateForm.descriptionLabel')} rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="corruptionScheme" label={t('riskTemplateForm.corruptionSchemeLabel')}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="causes" label={t('riskTemplateForm.causesLabel')}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="corruptionFactors" label={t('riskTemplateForm.corruptionFactorsLabel')}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="consequences" label={t('riskTemplateForm.consequencesLabel')}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="redFlags" label={t('riskTemplateForm.redFlagsLabel')}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="typicalControls" label={t('riskTemplateForm.typicalControlsLabel')}>
          <Select mode="tags" open={false} tokenSeparators={['\n']} placeholder={t('riskTemplateForm.listPlaceholder')} />
        </Form.Item>
        <Form.Item name="recommendedActions" label={t('riskTemplateForm.recommendedActionsLabel')}>
          <Select mode="tags" open={false} tokenSeparators={['\n']} placeholder={t('riskTemplateForm.listPlaceholder')} />
        </Form.Item>
        <Form.Item name="baseProbability" label={t('riskTemplateForm.baseProbabilityLabel')} rules={[{ required: true }]}>
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="baseImpact" label={t('riskTemplateForm.baseImpactLabel')} rules={[{ required: true }]}>
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="tags" label={t('riskTemplateForm.tagsLabel')}>
          <Select mode="tags" open={false} placeholder={t('riskTemplateForm.tagsPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
