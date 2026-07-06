import { PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useDepartments, useUsersList } from '../../../hooks/useReferenceData';
import type { AnalysisActionItem, AnalysisDetail } from '../../../types';
import {
  ACTION_PRIORITY_COLORS,
  ALL_ACTION_PRIORITIES,
  actionPriorityLabel,
  recommendationTypeLabel,
} from '../../../utils/analysisDisplay';
import { ACTION_STATUS_COLORS, ALL_ACTION_STATUSES, actionStatusLabel } from '../../../utils/riskDisplay';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage10ActionPlanTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisActionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: departments } = useDepartments(analysis.companyId ?? undefined);
  const { data: users } = useUsersList();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (item: AnalysisActionItem) => {
    setEditing(item);
    form.setFieldsValue({ ...item, deadline: item.deadline ? dayjs(item.deadline) : undefined });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = { ...values, deadline: values.deadline?.toISOString() };
    setSaving(true);
    try {
      if (editing) {
        await analysesApi.updateActionItem(analysis.id, editing.id, payload);
        message.success(t('analysisStage10.updated'));
      } else {
        await analysesApi.addActionItem(analysis.id, payload);
        message.success(t('analysisStage10.added'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await analysesApi.removeActionItem(analysis.id, id);
    message.success(t('analysisStage10.removed'));
    onUpdated();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('analysisStage10.intro')}
          <InfoTooltip text={t('tooltips.analyses.actionPlan')} />
        </span>
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {t('analysisStage10.addButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={analysis.actionItems}
        pagination={false}
        locale={{ emptyText: t('analysisStage10.noItemsYet') }}
        columns={[
          { title: t('analysisStage10.columns.task'), dataIndex: 'task' },
          {
            title: t('analysisStage10.columns.responsible'),
            dataIndex: ['responsible', 'fullName'],
            width: 160,
            render: (v: string | null) => v ?? '—',
          },
          { title: t('analysisStage10.columns.department'), dataIndex: ['department', 'name'], width: 180, render: (v: string | null) => v ?? '—' },
          { title: t('analysisStage10.columns.deadline'), dataIndex: 'deadline', width: 120, render: (v: string | null) => (v ? v.slice(0, 10) : '—') },
          {
            title: t('analysisStage10.columns.priority'),
            dataIndex: 'priority',
            width: 120,
            render: (v: AnalysisActionItem['priority']) => <Tag color={ACTION_PRIORITY_COLORS[v]}>{actionPriorityLabel(v)}</Tag>,
          },
          {
            title: t('analysisStage10.columns.status'),
            dataIndex: 'status',
            width: 140,
            render: (v: AnalysisActionItem['status']) => <Tag color={ACTION_STATUS_COLORS[v]}>{actionStatusLabel(v)}</Tag>,
          },
          {
            title: t('analysisStage10.columns.actions'),
            width: 140,
            render: (_: unknown, record: AnalysisActionItem) => (
              <>
                <a onClick={() => openEdit(record)}>{t('analysisStage10.editLink')}</a>{' '}
                <Popconfirm title={t('analysisStage10.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('analysisStage10.deleteLink')}</a>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('analysisStage10.modalTitleEdit') : t('analysisStage10.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="recommendationId" label={t('analysisStage10.recommendationLabel')}>
            <Select
              allowClear
              options={analysis.recommendations.map((r) => ({ value: r.id, label: recommendationTypeLabel(r.type) }))}
            />
          </Form.Item>
          <Form.Item name="task" label={t('analysisStage10.taskLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="expectedResult" label={t('analysisStage10.expectedResultLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="responsibleId" label={t('analysisStage10.responsibleLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="departmentId" label={t('analysisStage10.departmentLabel')}>
            <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="deadline" label={t('analysisStage10.deadlineLabel')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="priority" label={t('analysisStage10.priorityLabel')}>
            <Select options={ALL_ACTION_PRIORITIES.map((value) => ({ value, label: actionPriorityLabel(value) }))} />
          </Form.Item>
          <Form.Item name="status" label={t('analysisStage10.statusLabel')}>
            <Select options={ALL_ACTION_STATUSES.map((value) => ({ value, label: actionStatusLabel(value) }))} />
          </Form.Item>
          <Form.Item name="supportingDocs" label={t('analysisStage10.supportingDocsLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="comments" label={t('analysisStage10.commentsLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
