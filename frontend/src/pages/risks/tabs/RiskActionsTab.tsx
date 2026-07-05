import { PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, message, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { actionsApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useUsersList } from '../../../hooks/useReferenceData';
import type { Action, RiskDetail } from '../../../types';
import { ACTION_STATUS_COLORS, ALL_ACTION_STATUSES, actionStatusLabel } from '../../../utils/riskDisplay';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

export function RiskActionsTab({ risk, onUpdated, canEdit }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Action | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { data: users } = useUsersList();

  const statusOptions = ALL_ACTION_STATUSES.map((value) => ({ value, label: actionStatusLabel(value) }));

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (action: Action) => {
    setEditing(action);
    form.setFieldsValue({ ...action, deadline: action.deadline ? dayjs(action.deadline) : undefined });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = { ...values, deadline: values.deadline ? values.deadline.toISOString() : undefined };
    setSaving(true);
    try {
      if (editing) {
        await actionsApi.update(editing.id, payload);
        message.success(t('riskActions.updated'));
      } else {
        await actionsApi.create({ ...payload, riskId: risk.id });
        message.success(t('riskActions.created'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await actionsApi.remove(id);
    message.success(t('riskActions.removed'));
    onUpdated();
  };

  return (
    <div>
      {canEdit && (
        <Button icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
          {t('riskActions.addButton')}
        </Button>
      )}
      <Table
        rowKey="id"
        dataSource={risk.actions}
        pagination={false}
        locale={{ emptyText: t('riskActions.noActionsYet') }}
        columns={[
          { title: t('riskActions.columns.title'), dataIndex: 'title' },
          { title: t('riskActions.columns.owner'), dataIndex: ['owner', 'fullName'], width: 150 },
          {
            title: (
              <span>
                {t('riskActions.columns.deadline')}
                <InfoTooltip text={t('tooltips.actions.deadline')} />
              </span>
            ),
            dataIndex: 'deadline',
            width: 120,
            render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
          },
          {
            title: (
              <span>
                {t('riskActions.columns.status')}
                <InfoTooltip text={t('tooltips.actions.actionStatus')} />
              </span>
            ),
            dataIndex: 'status',
            width: 130,
            render: (v: Action['status']) => <Tag color={ACTION_STATUS_COLORS[v]}>{actionStatusLabel(v)}</Tag>,
          },
          ...(canEdit
            ? [
                {
                  title: t('riskActions.columns.actions'),
                  width: 140,
                  render: (_: unknown, record: Action) => (
                    <>
                      <a onClick={() => openEdit(record)}>{t('riskActions.editLink')}</a>{' '}
                      <Popconfirm title={t('riskActions.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                        <a>{t('riskActions.deleteLink')}</a>
                      </Popconfirm>
                    </>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        title={editing ? t('riskActions.modalTitleEdit') : t('riskActions.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('riskActions.titleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('riskActions.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="ownerId" label={t('riskActions.ownerLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="deadline" label={t('riskActions.deadlineLabel')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label={t('riskActions.statusLabel')}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="evidence" label={t('riskActions.evidenceLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="result" label={t('riskActions.resultLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="residualRiskImpact" label={t('riskActions.residualImpactLabel')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
