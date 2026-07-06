import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Space, Table } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import type { AnalysisDetail, AnalysisFactor } from '../../../types';
import { ALL_CORRUPTOGENIC_FACTOR_TYPES, corruptogenicFactorTypeLabel } from '../../../utils/analysisDisplay';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage6FactorsTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisFactor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (factor: AnalysisFactor) => {
    setEditing(factor);
    form.setFieldsValue(factor);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await analysesApi.updateFactor(analysis.id, editing.id, values);
        message.success(t('analysisStage6.updated'));
      } else {
        await analysesApi.addFactor(analysis.id, values);
        message.success(t('analysisStage6.added'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await analysesApi.removeFactor(analysis.id, id);
    message.success(t('analysisStage6.removed'));
    onUpdated();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('analysisStage6.intro')}
          <InfoTooltip text={t('tooltips.analyses.factors')} />
        </span>
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {t('analysisStage6.addButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={analysis.factors}
        pagination={false}
        locale={{ emptyText: t('analysisStage6.noFactorsYet') }}
        columns={[
          { title: t('analysisStage6.columns.processStep'), dataIndex: ['processStep', 'name'], width: 260, render: (v: string) => v ?? '—' },
          {
            title: (
              <span>
                {t('analysisStage6.columns.factorType')}
                <InfoTooltip text={t('tooltips.analyses.factorType')} />
              </span>
            ),
            dataIndex: 'factorType',
            width: 220,
            render: (v: AnalysisFactor['factorType']) => corruptogenicFactorTypeLabel(v),
          },
          { title: t('analysisStage6.columns.description'), dataIndex: 'description', render: (v: string | null) => v ?? '—' },
          {
            title: t('analysisStage6.columns.actions'),
            width: 140,
            render: (_: unknown, record: AnalysisFactor) => (
              <>
                <a onClick={() => openEdit(record)}>{t('analysisStage6.editLink')}</a>{' '}
                <Popconfirm title={t('analysisStage6.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('analysisStage6.deleteLink')}</a>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('analysisStage6.modalTitleEdit') : t('analysisStage6.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="processStepId" label={t('analysisStage6.processStepLabel')}>
            <Select allowClear options={analysis.processSteps.map((s) => ({ value: s.id, label: `${s.order}. ${s.name}` }))} />
          </Form.Item>
          <Form.Item
            name="factorType"
            label={
              <span>
                {t('analysisStage6.factorTypeLabel')}
                <InfoTooltip text={t('tooltips.analyses.factorType')} />
              </span>
            }
            rules={[{ required: true }]}
          >
            <Select options={ALL_CORRUPTOGENIC_FACTOR_TYPES.map((value) => ({ value, label: corruptogenicFactorTypeLabel(value) }))} />
          </Form.Item>
          <Form.Item name="description" label={t('analysisStage6.descriptionLabel')}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
