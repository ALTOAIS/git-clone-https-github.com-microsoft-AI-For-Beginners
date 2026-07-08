import { Button, Card, Descriptions, Form, Input, message, Select, Space, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { risksApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useCategories, useCompanies, useDepartments, useUsersList } from '../../../hooks/useReferenceData';
import type { RiskDetail } from '../../../types';
import { analysisScopeLabel } from '../../../utils/analysisDisplay';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

export function RiskInfoTab({ risk, onUpdated, canEdit }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      message.success(t('riskInfo.updated'));
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
          <Descriptions.Item label={t('riskInfo.code')}>{risk.code}</Descriptions.Item>
          <Descriptions.Item label={t('riskInfo.version')}>v{risk.version}</Descriptions.Item>
          <Descriptions.Item
            label={
              <span>
                {t('riskInfo.category')}
                <InfoTooltip text={t('tooltips.riskRegister.riskCategory')} />
              </span>
            }
          >
            {risk.category?.name ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <span>
                {t('riskInfo.owner')}
                <InfoTooltip text={t('tooltips.riskRegister.riskOwner')} />
              </span>
            }
          >
            {risk.owner?.fullName ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('riskInfo.company')}>{risk.company?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label={t('riskInfo.department')}>{risk.department?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label={t('riskInfo.businessProcess')}>{risk.businessProcess?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label={t('riskInfo.createdBy')}>{risk.createdBy?.fullName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label={t('riskInfo.description')} span={2}>
            {risk.description || <span style={{ color: '#999' }}>{t('riskInfo.noDescription')}</span>}
          </Descriptions.Item>
        </Descriptions>

        {(risk.sourceAnalysisId || risk.sourceTemplateId) && (
          <Card size="small" title={t('riskInfo.origin.title')} style={{ marginTop: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label={t('riskInfo.origin.source')}>
                <Tag color="blue">{risk.sourceAnalysisId ? t('riskInfo.origin.sourceVakr') : t('riskInfo.origin.sourceTemplate')}</Tag>
              </Descriptions.Item>
              {risk.sourceAnalysis && (
                <Descriptions.Item label={t('riskInfo.origin.analysis')}>
                  <a onClick={() => navigate(`/analyses/${risk.sourceAnalysis!.id}`)}>
                    {risk.sourceAnalysis.code} — {risk.sourceAnalysis.name}
                  </a>
                </Descriptions.Item>
              )}
              {risk.sourceTemplate && (
                <Descriptions.Item label={t('riskInfo.origin.template')}>
                  {risk.sourceTemplate.code} — {risk.sourceTemplate.title}
                </Descriptions.Item>
              )}
              {risk.originContext?.objectOfAnalysis && (
                <Descriptions.Item label={t('riskInfo.origin.object')}>{risk.originContext.objectOfAnalysis}</Descriptions.Item>
              )}
              {risk.originContext?.scope && (
                <Descriptions.Item label={t('riskInfo.origin.scope')}>
                  {analysisScopeLabel(risk.originContext.scope)}
                </Descriptions.Item>
              )}
              {risk.originContext?.process && (
                <Descriptions.Item label={t('riskInfo.origin.process')}>{risk.originContext.process}</Descriptions.Item>
              )}
              {risk.originContext?.corruptogenicFactor && (
                <Descriptions.Item label={t('riskInfo.origin.factor')}>{risk.originContext.corruptogenicFactor}</Descriptions.Item>
              )}
              {risk.originContext?.informationSource && (
                <Descriptions.Item label={t('riskInfo.origin.informationSource')}>
                  {risk.originContext.informationSource}
                </Descriptions.Item>
              )}
              {risk.originContext?.cause && (
                <Descriptions.Item label={t('riskInfo.origin.cause')} span={2}>
                  {risk.originContext.cause}
                </Descriptions.Item>
              )}
              {risk.originContext?.consequences && (
                <Descriptions.Item label={t('riskInfo.origin.consequences')} span={2}>
                  {risk.originContext.consequences}
                </Descriptions.Item>
              )}
              {risk.originContext?.recommendation && (
                <Descriptions.Item label={t('riskInfo.origin.recommendation')} span={2}>
                  {risk.originContext.recommendation}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        {canEdit && (
          <Button style={{ marginTop: 16 }} onClick={() => setEditing(true)}>
            {t('riskInfo.edit')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="title" label={t('riskInfo.titleLabel')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label={t('riskInfo.descriptionLabel')}>
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item
        name="categoryId"
        label={
          <span>
            {t('riskInfo.categoryLabel')}
            <InfoTooltip text={t('tooltips.riskRegister.riskCategory')} />
          </span>
        }
      >
        <Select allowClear options={categories?.map((c) => ({ value: c.id, label: c.name }))} />
      </Form.Item>
      <Form.Item name="companyId" label={t('riskInfo.companyLabel')}>
        <Select
          allowClear
          options={companies?.map((c) => ({ value: c.id, label: c.name }))}
          onChange={() => form.setFieldValue('departmentId', undefined)}
        />
      </Form.Item>
      <Form.Item name="departmentId" label={t('riskInfo.departmentLabel')}>
        <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
      </Form.Item>
      <Form.Item
        name="ownerId"
        label={
          <span>
            {t('riskInfo.ownerLabel')}
            <InfoTooltip text={t('tooltips.riskRegister.riskOwner')} />
          </span>
        }
      >
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
        />
      </Form.Item>
      <Space>
        <Button type="primary" onClick={handleSave} loading={saving}>
          {t('riskInfo.save')}
        </Button>
        <Button onClick={() => setEditing(false)}>{t('riskInfo.cancel')}</Button>
      </Space>
    </Form>
  );
}
