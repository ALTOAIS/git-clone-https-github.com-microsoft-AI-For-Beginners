import { Form, Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { risksApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { useCategories, useCompanies, useDepartments, useUsersList } from '../../hooks/useReferenceData';

interface RiskFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (riskId: string) => void;
}

export function RiskFormModal({ open, onClose, onCreated }: RiskFormModalProps) {
  const { t } = useTranslation();
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
      title={t('riskForm.modalTitle')}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okText={t('riskForm.createButton')}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label={
            <span>
              {t('riskForm.titleLabel')}
              <InfoTooltip text={t('tooltips.riskRegister.complianceRisk')} />
            </span>
          }
          rules={[{ required: true, message: t('riskForm.titleRequired') }]}
        >
          <Input placeholder={t('riskForm.titlePlaceholder')} />
        </Form.Item>
        <Form.Item name="description" label={t('riskForm.descriptionLabel')}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          name="categoryId"
          label={
            <span>
              {t('riskForm.categoryLabel')}
              <InfoTooltip text={t('tooltips.riskRegister.riskCategory')} />
            </span>
          }
        >
          <Select
            allowClear
            placeholder={t('riskForm.categoryPlaceholder')}
            options={categories?.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="companyId" label={t('riskForm.companyLabel')}>
          <Select
            allowClear
            placeholder={t('riskForm.companyPlaceholder')}
            options={companies?.map((c) => ({ value: c.id, label: c.name }))}
            onChange={() => form.setFieldValue('departmentId', undefined)}
          />
        </Form.Item>
        <Form.Item name="departmentId" label={t('riskForm.departmentLabel')}>
          <Select
            allowClear
            placeholder={t('riskForm.departmentPlaceholder')}
            options={departments?.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item
          name="ownerId"
          label={
            <span>
              {t('riskForm.ownerLabel')}
              <InfoTooltip text={t('tooltips.riskRegister.riskOwner')} />
            </span>
          }
        >
          <Select
            allowClear
            showSearch
            placeholder={t('riskForm.ownerPlaceholder')}
            optionFilterProp="label"
            options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
