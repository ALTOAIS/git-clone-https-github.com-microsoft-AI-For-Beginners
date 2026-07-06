import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useDepartments, useUsersList } from '../../../hooks/useReferenceData';
import type { AnalysisDetail, AnalysisProcessStep } from '../../../types';
import { ALL_PROCESS_CONTROL_POINT_TYPES, processControlPointTypeLabel } from '../../../utils/analysisDisplay';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage5ProcessMapTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisProcessStep | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: departments } = useDepartments(analysis.companyId ?? undefined);
  const { data: users } = useUsersList();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ order: analysis.processSteps.length + 1 });
    setOpen(true);
  };

  const openEdit = (step: AnalysisProcessStep) => {
    setEditing(step);
    form.setFieldsValue(step);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await analysesApi.updateProcessStep(analysis.id, editing.id, values);
        message.success(t('analysisStage5.updated'));
      } else {
        await analysesApi.addProcessStep(analysis.id, values);
        message.success(t('analysisStage5.added'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await analysesApi.removeProcessStep(analysis.id, id);
    message.success(t('analysisStage5.removed'));
    onUpdated();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('analysisStage5.intro')}
          <InfoTooltip text={t('tooltips.analyses.processMap')} />
        </span>
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {t('analysisStage5.addButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={[...analysis.processSteps].sort((a, b) => a.order - b.order)}
        pagination={false}
        locale={{ emptyText: t('analysisStage5.noStepsYet') }}
        columns={[
          { title: t('analysisStage5.columns.order'), dataIndex: 'order', width: 70 },
          { title: t('analysisStage5.columns.name'), dataIndex: 'name' },
          { title: t('analysisStage5.columns.department'), dataIndex: ['department', 'name'], width: 180 },
          { title: t('analysisStage5.columns.executor'), dataIndex: ['executor', 'fullName'], width: 160 },
          {
            title: (
              <span>
                {t('analysisStage5.columns.controlPoints')}
                <InfoTooltip text={t('tooltips.analyses.controlPoints')} />
              </span>
            ),
            dataIndex: 'controlPoints',
            render: (points: AnalysisProcessStep['controlPoints']) => (
              <Space size={4} wrap>
                {points.map((p) => (
                  <Tag key={p}>{processControlPointTypeLabel(p)}</Tag>
                ))}
              </Space>
            ),
          },
          {
            title: t('analysisStage5.columns.actions'),
            width: 140,
            render: (_: unknown, record: AnalysisProcessStep) => (
              <>
                <a onClick={() => openEdit(record)}>{t('analysisStage5.editLink')}</a>{' '}
                <Popconfirm title={t('analysisStage5.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('analysisStage5.deleteLink')}</a>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('analysisStage5.modalTitleEdit') : t('analysisStage5.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="order" label={t('analysisStage5.orderLabel')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="name" label={t('analysisStage5.nameLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('analysisStage5.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="departmentId" label={t('analysisStage5.departmentLabel')}>
            <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="executorId" label={t('analysisStage5.executorLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="legalBasis" label={t('analysisStage5.legalBasisLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="inputDescription" label={t('analysisStage5.inputLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="outputDescription" label={t('analysisStage5.outputLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="controlPoints"
            label={
              <span>
                {t('analysisStage5.controlPointsLabel')}
                <InfoTooltip text={t('tooltips.analyses.controlPoints')} />
              </span>
            }
          >
            <Select
              mode="multiple"
              allowClear
              options={ALL_PROCESS_CONTROL_POINT_TYPES.map((value) => ({ value, label: processControlPointTypeLabel(value) }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
