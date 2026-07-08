import { Button, Checkbox, DatePicker, Descriptions, Form, Input, message, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useCompanies, useDepartments, useUsersList } from '../../../hooks/useReferenceData';
import type { AnalysisDetail } from '../../../types';
import { ANALYSIS_SCOPE_VALUES, analysisScopeLabel } from '../../../utils/analysisDisplay';
import { AnalysisNavigatorPanel } from '../AnalysisNavigatorPanel';
import { CARD_NAVIGATOR_QUESTIONS } from '../navigatorQuestions';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage1CreationTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const companyId = Form.useWatch('companyId', form);

  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments(companyId ?? analysis.companyId ?? undefined);
  const { data: users } = useUsersList();

  useEffect(() => {
    form.setFieldsValue({
      name: analysis.name,
      companyId: analysis.companyId,
      subject: analysis.subject,
      legalBasis: analysis.legalBasis,
      periodStart: analysis.periodStart ? dayjs(analysis.periodStart) : undefined,
      periodEnd: analysis.periodEnd ? dayjs(analysis.periodEnd) : undefined,
      deadline: analysis.deadline ? dayjs(analysis.deadline) : undefined,
      leadId: analysis.leadId,
      departmentIds: analysis.departments.map((d) => d.departmentId),
      orderBasis: analysis.orderBasis,
      orderNumber: analysis.orderNumber,
      orderDate: analysis.orderDate ? dayjs(analysis.orderDate) : undefined,
      decisionMakerId: analysis.decisionMakerId,
      analysisScope: analysis.analysisScope,
      coordinatorId: analysis.coordinatorId,
      extensionRequested: analysis.extensionRequested,
    });
  }, [analysis, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await analysesApi.update(analysis.id, {
        ...values,
        periodStart: values.periodStart?.toISOString(),
        periodEnd: values.periodEnd?.toISOString(),
        deadline: values.deadline?.toISOString(),
        orderDate: values.orderDate?.toISOString(),
      });
      message.success(t('analysisStage1.updated'));
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
          <Descriptions.Item label={t('analysisStage1.code')}>{analysis.code}</Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.company')}>{analysis.company?.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item
            label={
              <span>
                {t('analysisStage1.lead')}
                <InfoTooltip text={t('tooltips.analyses.lead')} />
              </span>
            }
          >
            {analysis.lead?.fullName ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.departments')}>
            {analysis.departments.map((d) => d.department.name).join(', ') || '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.period')}>
            {analysis.periodStart ? analysis.periodStart.slice(0, 10) : '—'} — {analysis.periodEnd ? analysis.periodEnd.slice(0, 10) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.deadline')}>
            {analysis.deadline ? analysis.deadline.slice(0, 10) : '—'}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <span>
                {t('analysisStage1.subject')}
                <InfoTooltip text={t('tooltips.analyses.subject')} />
              </span>
            }
            span={2}
          >
            {analysis.subject || <span style={{ color: '#999' }}>{t('common.notSet')}</span>}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <span>
                {t('analysisStage1.legalBasis')}
                <InfoTooltip text={t('tooltips.analyses.legalBasis')} />
              </span>
            }
            span={2}
          >
            {analysis.legalBasis || <span style={{ color: '#999' }}>{t('common.notSet')}</span>}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.orderBasis')} span={2}>
            {analysis.orderBasis || <span style={{ color: '#999' }}>{t('common.notSet')}</span>}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.orderNumberDate')}>
            {analysis.orderNumber || analysis.orderDate
              ? `${analysis.orderNumber ?? '—'} ${analysis.orderDate ? `от ${analysis.orderDate.slice(0, 10)}` : ''}`
              : <span style={{ color: '#999' }}>{t('common.notSet')}</span>}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.decisionMaker')}>
            {analysis.decisionMaker?.fullName ?? <span style={{ color: '#999' }}>{t('common.notSet')}</span>}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.analysisScope')}>
            {analysis.analysisScope ? analysisScopeLabel(analysis.analysisScope) : <span style={{ color: '#999' }}>{t('common.notSet')}</span>}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.coordinator')}>
            {analysis.coordinator?.fullName ?? <span style={{ color: '#999' }}>{t('common.notSet')}</span>}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.extensionRequested')}>
            {analysis.extensionRequested ? t('common.yes') : t('common.no')}
          </Descriptions.Item>
          <Descriptions.Item label={t('analysisStage1.analysisForm')}>
            {analysis.workingGroup.length > 0 ? t('analysisStage1.analysisFormGroup') : t('analysisStage1.analysisFormSingle')}
          </Descriptions.Item>
        </Descriptions>
        <Button style={{ marginTop: 16 }} onClick={() => setEditing(true)}>
          {t('analysisStage1.edit')}
        </Button>

        <AnalysisNavigatorPanel analysisId={analysis.id} questions={CARD_NAVIGATOR_QUESTIONS} />
      </div>
    );
  }

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label={t('analysisStage1.nameLabel')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="companyId" label={t('analysisStage1.companyLabel')}>
        <Select allowClear options={companies?.map((c) => ({ value: c.id, label: c.name }))} onChange={() => form.setFieldValue('departmentIds', undefined)} />
      </Form.Item>
      <Form.Item name="departmentIds" label={t('analysisStage1.departmentsLabel')}>
        <Select mode="multiple" allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
      </Form.Item>
      <Form.Item name="leadId" label={t('analysisStage1.leadLabel')}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
        />
      </Form.Item>
      <Space size="large" style={{ width: '100%' }}>
        <Form.Item name="periodStart" label={t('analysisStage1.periodStartLabel')}>
          <DatePicker />
        </Form.Item>
        <Form.Item name="periodEnd" label={t('analysisStage1.periodEndLabel')}>
          <DatePicker />
        </Form.Item>
        <Form.Item name="deadline" label={t('analysisStage1.deadlineLabel')}>
          <DatePicker />
        </Form.Item>
      </Space>
      <Form.Item name="subject" label={t('analysisStage1.subjectLabel')}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="legalBasis" label={t('analysisStage1.legalBasisLabel')}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="orderBasis" label={t('analysisStage1.orderBasisLabel')}>
        <Input.TextArea rows={2} placeholder={t('analysisStage1.orderBasisPlaceholder')} />
      </Form.Item>
      <Space size="large" style={{ width: '100%' }}>
        <Form.Item name="orderNumber" label={t('analysisStage1.orderNumberLabel')}>
          <Input style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="orderDate" label={t('analysisStage1.orderDateLabel')}>
          <DatePicker />
        </Form.Item>
      </Space>
      <Form.Item name="decisionMakerId" label={t('analysisStage1.decisionMakerLabel')}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
        />
      </Form.Item>
      <Form.Item name="analysisScope" label={t('analysisStage1.analysisScopeLabel')}>
        <Select
          allowClear
          options={ANALYSIS_SCOPE_VALUES.map((s) => ({ value: s.value, label: analysisScopeLabel(s.value) }))}
        />
      </Form.Item>
      <Form.Item name="coordinatorId" label={t('analysisStage1.coordinatorLabel')}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
        />
      </Form.Item>
      <Form.Item name="extensionRequested" valuePropName="checked">
        <Checkbox>{t('analysisStage1.extensionRequestedLabel')}</Checkbox>
      </Form.Item>
      <Space>
        <Button type="primary" onClick={handleSave} loading={saving}>
          {t('analysisStage1.save')}
        </Button>
        <Button onClick={() => setEditing(false)}>{t('analysisStage1.cancel')}</Button>
      </Space>
    </Form>
  );
}
