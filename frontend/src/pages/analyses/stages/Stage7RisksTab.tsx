import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Space, Table } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useCategories, useUsersList } from '../../../hooks/useReferenceData';
import type { AnalysisDetail, AnalysisRisk, CorruptogenicFactorType } from '../../../types';
import { corruptogenicFactorTypeLabel } from '../../../utils/analysisDisplay';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage7RisksTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisRisk | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: categories } = useCategories();
  const { data: users } = useUsersList();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (risk: AnalysisRisk) => {
    setEditing(risk);
    form.setFieldsValue(risk);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await analysesApi.updateRisk(analysis.id, editing.id, values);
        message.success(t('analysisStage7.updated'));
      } else {
        await analysesApi.addRisk(analysis.id, values);
        message.success(t('analysisStage7.added'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await analysesApi.removeRisk(analysis.id, id);
    message.success(t('analysisStage7.removed'));
    onUpdated();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('analysisStage7.intro')}
          <InfoTooltip text={t('tooltips.analyses.risks')} />
        </span>
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {t('analysisStage7.addButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={analysis.risks}
        pagination={false}
        locale={{ emptyText: t('analysisStage7.noRisksYet') }}
        columns={[
          { title: t('analysisStage7.columns.title'), dataIndex: 'title' },
          { title: t('analysisStage7.columns.category'), dataIndex: ['category', 'name'], width: 200, render: (v: string | null) => v ?? '—' },
          {
            title: t('analysisStage7.columns.factor'),
            dataIndex: ['factor', 'factorType'],
            width: 200,
            render: (v: CorruptogenicFactorType | undefined) => (v ? corruptogenicFactorTypeLabel(v) : '—'),
          },
          { title: t('analysisStage7.columns.owner'), dataIndex: ['owner', 'fullName'], width: 160, render: (v: string | null) => v ?? '—' },
          {
            title: t('analysisStage7.columns.actions'),
            width: 140,
            render: (_: unknown, record: AnalysisRisk) => (
              <>
                <a onClick={() => openEdit(record)}>{t('analysisStage7.editLink')}</a>{' '}
                <Popconfirm title={t('analysisStage7.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('analysisStage7.deleteLink')}</a>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('analysisStage7.modalTitleEdit') : t('analysisStage7.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('analysisStage7.titleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('analysisStage7.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="factorId" label={t('analysisStage7.factorLabel')}>
            <Select
              allowClear
              options={analysis.factors.map((f) => ({ value: f.id, label: corruptogenicFactorTypeLabel(f.factorType) }))}
            />
          </Form.Item>
          <Form.Item name="categoryId" label={t('analysisStage7.categoryLabel')}>
            <Select allowClear options={categories?.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="source" label={t('analysisStage7.sourceLabel')}>
            <Input />
          </Form.Item>
          <Form.Item name="cause" label={t('analysisStage7.causeLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="conditions" label={t('analysisStage7.conditionsLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="corruptionScheme"
            label={
              <span>
                {t('analysisStage7.schemeLabel')}
                <InfoTooltip text={t('tooltips.analyses.corruptionScheme')} />
              </span>
            }
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="interestedParties" label={t('analysisStage7.interestedPartiesLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="consequences" label={t('analysisStage7.consequencesLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="existingControls" label={t('analysisStage7.existingControlsLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="ownerId" label={t('analysisStage7.ownerLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
