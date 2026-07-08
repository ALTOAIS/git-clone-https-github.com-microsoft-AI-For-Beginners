import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Checkbox, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../api/endpoints';
import { useDepartments } from '../../hooks/useReferenceData';
import type { AnalysisDetail, AnalysisExposedPosition } from '../../types';

interface Props {
  analysis: AnalysisDetail;
}

const RISK_LEVEL_OPTIONS = [
  { value: 'LOW', label: 'Низкий' },
  { value: 'MEDIUM', label: 'Средний' },
  { value: 'HIGH', label: 'Высокий' },
  { value: 'CRITICAL', label: 'Критический' },
];

const RISK_LEVEL_COLORS: Record<string, string> = {
  LOW: 'default',
  MEDIUM: 'gold',
  HIGH: 'orange',
  CRITICAL: 'red',
};

export function ExposedPositionsPanel({ analysis }: Props) {
  const { t } = useTranslation();
  const { data: departments } = useDepartments(analysis.companyId ?? undefined);
  const { data, refetch } = useQuery({
    queryKey: ['analysis-exposed-positions', analysis.id],
    queryFn: () => analysesApi.listExposedPositions(analysis.id).then((r) => r.data),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisExposedPosition | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (position: AnalysisExposedPosition) => {
    setEditing(position);
    form.setFieldsValue(position);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await analysesApi.updateExposedPosition(analysis.id, editing.id, values);
      } else {
        await analysesApi.addExposedPosition(analysis.id, values);
      }
      message.success(t('analysisStage7.exposedPositions.saved'));
      setOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await analysesApi.removeExposedPosition(analysis.id, id);
    message.success(t('analysisStage7.exposedPositions.removed'));
    refetch();
  };

  return (
    <div style={{ marginTop: 24 }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Typography.Text strong>{t('analysisStage7.exposedPositions.title')}</Typography.Text>
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {t('analysisStage7.exposedPositions.addButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        size="small"
        dataSource={data ?? []}
        pagination={false}
        locale={{ emptyText: t('analysisStage7.exposedPositions.empty') }}
        columns={[
          { title: t('analysisStage7.exposedPositions.columns.position'), dataIndex: 'positionTitle' },
          { title: t('analysisStage7.exposedPositions.columns.department'), dataIndex: ['department', 'name'], render: (v: string | null) => v ?? '—' },
          { title: t('analysisStage7.exposedPositions.columns.risk'), dataIndex: ['linkedRisk', 'title'], render: (v: string | null) => v ?? '—' },
          {
            title: t('analysisStage7.exposedPositions.columns.riskLevel'),
            dataIndex: 'riskLevel',
            render: (v: string | null) => (v ? <Tag color={RISK_LEVEL_COLORS[v]}>{RISK_LEVEL_OPTIONS.find((o) => o.value === v)?.label ?? v}</Tag> : '—'),
          },
          {
            title: t('analysisStage7.exposedPositions.columns.trainingNeeded'),
            dataIndex: 'trainingNeeded',
            render: (v: boolean) => (v ? t('common.yes') : t('common.no')),
          },
          {
            title: t('analysisStage7.exposedPositions.columns.actions'),
            width: 140,
            render: (_: unknown, record: AnalysisExposedPosition) => (
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
        title={editing ? t('analysisStage7.exposedPositions.modalTitleEdit') : t('analysisStage7.exposedPositions.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="positionTitle" label={t('analysisStage7.exposedPositions.positionLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="departmentId" label={t('analysisStage7.exposedPositions.departmentLabel')}>
            <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="authorities" label={t('analysisStage7.exposedPositions.authoritiesLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="linkedRiskId" label={t('analysisStage7.exposedPositions.riskLabel')}>
            <Select allowClear options={analysis.risks.map((r) => ({ value: r.id, label: r.title }))} />
          </Form.Item>
          <Form.Item name="riskLevel" label={t('analysisStage7.exposedPositions.riskLevelLabel')}>
            <Select allowClear options={RISK_LEVEL_OPTIONS} />
          </Form.Item>
          <Form.Item name="recommendedControls" label={t('analysisStage7.exposedPositions.controlsLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="trainingNeeded" valuePropName="checked">
            <Checkbox>{t('analysisStage7.exposedPositions.trainingLabel')}</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
