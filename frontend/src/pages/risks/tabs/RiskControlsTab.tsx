import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { controlsApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import type { Control, RiskDetail } from '../../../types';
import { ALL_CONTROL_EFFECTIVENESS, CONTROL_EFFECTIVENESS_COLORS, controlEffectivenessLabel } from '../../../utils/riskDisplay';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

const TYPE_VALUES = ['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE'] as const;

export function RiskControlsTab({ risk, onUpdated, canEdit }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Control | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const typeOptions = TYPE_VALUES.map((v) => ({ value: v, label: t(`controlType.${v}`) }));
  const effectivenessOptions = ALL_CONTROL_EFFECTIVENESS.map((value) => ({ value, label: controlEffectivenessLabel(value) }));

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (control: Control) => {
    setEditing(control);
    form.setFieldsValue(control);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await controlsApi.update(editing.id, values);
        message.success(t('riskControls.updated'));
      } else {
        await controlsApi.create({ ...values, riskId: risk.id });
        message.success(t('riskControls.added'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await controlsApi.remove(id);
    message.success(t('riskControls.removed'));
    onUpdated();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('riskCard.tabs.controls')}
          <InfoTooltip text={t('tooltips.riskRegister.controls')} />
        </span>
        {canEdit && (
          <Button icon={<PlusOutlined />} onClick={openCreate}>
            {t('riskControls.addButton')}
          </Button>
        )}
      </Space>
      <Table
        rowKey="id"
        dataSource={risk.controls}
        pagination={false}
        locale={{ emptyText: t('riskControls.noControlsYet') }}
        columns={[
          {
            title: (
              <span>
                {t('riskControls.columns.type')}
                <InfoTooltip text={t('tooltips.controls.controlType')} />
              </span>
            ),
            dataIndex: 'type',
            width: 120,
            render: (v: Control['type']) => t(`controlType.${v}`),
          },
          { title: t('riskControls.columns.title'), dataIndex: 'title' },
          {
            title: (
              <span>
                {t('riskControls.columns.effectiveness')}
                <InfoTooltip text={t('tooltips.controls.controlEffectiveness')} />
              </span>
            ),
            dataIndex: 'effectiveness',
            width: 160,
            render: (v: Control['effectiveness']) => (
              <Tag color={CONTROL_EFFECTIVENESS_COLORS[v]}>{controlEffectivenessLabel(v)}</Tag>
            ),
          },
          { title: t('riskControls.columns.owner'), dataIndex: ['owner', 'fullName'], width: 150 },
          ...(canEdit
            ? [
                {
                  title: t('riskControls.columns.actions'),
                  width: 140,
                  render: (_: unknown, record: Control) => (
                    <>
                      <a onClick={() => openEdit(record)}>{t('riskControls.editLink')}</a>{' '}
                      <Popconfirm title={t('riskControls.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                        <a>{t('riskControls.deleteLink')}</a>
                      </Popconfirm>
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        title={editing ? t('riskControls.modalTitleEdit') : t('riskControls.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label={t('riskControls.typeLabel')} rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="title" label={t('riskControls.titleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('riskControls.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="effectiveness" label={t('riskControls.effectivenessLabel')}>
            <Select options={effectivenessOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
