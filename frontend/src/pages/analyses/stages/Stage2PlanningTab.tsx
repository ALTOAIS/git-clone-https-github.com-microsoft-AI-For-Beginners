import { PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useDepartments, useUsersList } from '../../../hooks/useReferenceData';
import type { AnalysisDetail, AnalysisPlanItem } from '../../../types';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage2PlanningTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisPlanItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: departments } = useDepartments(analysis.companyId ?? undefined);
  const { data: users } = useUsersList();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (item: AnalysisPlanItem) => {
    setEditing(item);
    form.setFieldsValue({ ...item, deadline: item.deadline ? dayjs(item.deadline) : undefined });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    const payload = { ...values, deadline: values.deadline?.toISOString() };
    try {
      if (editing) {
        await analysesApi.updatePlanItem(analysis.id, editing.id, payload);
        message.success(t('analysisStage2.updated'));
      } else {
        await analysesApi.addPlanItem(analysis.id, payload);
        message.success(t('analysisStage2.added'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await analysesApi.removePlanItem(analysis.id, id);
    message.success(t('analysisStage2.removed'));
    onUpdated();
  };

  const sortedByDeadline = [...analysis.planItems].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('analysisStage2.intro')}
          <InfoTooltip text={t('tooltips.analyses.planning')} />
        </span>
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {t('analysisStage2.addButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={analysis.planItems}
        pagination={false}
        locale={{ emptyText: t('analysisStage2.noItemsYet') }}
        columns={[
          { title: t('analysisStage2.columns.process'), dataIndex: 'process' },
          { title: t('analysisStage2.columns.direction'), dataIndex: 'direction' },
          { title: t('analysisStage2.columns.department'), dataIndex: ['department', 'name'], width: 180 },
          { title: t('analysisStage2.columns.owner'), dataIndex: ['owner', 'fullName'], width: 160 },
          { title: t('analysisStage2.columns.deadline'), dataIndex: 'deadline', width: 120, render: (v: string | null) => (v ? v.slice(0, 10) : '—') },
          {
            title: (
              <span>
                {t('analysisStage2.columns.checkpoint')}
                <InfoTooltip text={t('tooltips.analyses.checkpoint')} />
              </span>
            ),
            dataIndex: 'checkpoint',
          },
          {
            title: t('analysisStage2.columns.actions'),
            width: 140,
            render: (_: unknown, record: AnalysisPlanItem) => (
              <>
                <a onClick={() => openEdit(record)}>{t('analysisStage2.editLink')}</a>{' '}
                <Popconfirm title={t('analysisStage2.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('analysisStage2.deleteLink')}</a>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />

      {sortedByDeadline.length > 0 && (
        <>
          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('analysisStage2.calendarTitle')}
            <InfoTooltip text={t('tooltips.analyses.calendar')} />
          </Typography.Title>
          <Timeline
            items={sortedByDeadline.map((item) => ({
              children: (
                <div>
                  <Typography.Text strong>{item.deadline ? item.deadline.slice(0, 10) : t('analysisStage2.noDeadline')}</Typography.Text>
                  <div>{item.process}</div>
                  {item.checkpoint && <div style={{ color: '#888', fontSize: 12 }}>{item.checkpoint}</div>}
                </div>
              ),
            }))}
          />
        </>
      )}

      <Modal
        title={editing ? t('analysisStage2.modalTitleEdit') : t('analysisStage2.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="process" label={t('analysisStage2.processLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="direction" label={t('analysisStage2.directionLabel')}>
            <Input />
          </Form.Item>
          <Form.Item name="departmentId" label={t('analysisStage2.departmentLabel')}>
            <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="ownerId" label={t('analysisStage2.ownerLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="deadline" label={t('analysisStage2.deadlineLabel')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="checkpoint"
            label={
              <span>
                {t('analysisStage2.checkpointLabel')}
                <InfoTooltip text={t('tooltips.analyses.checkpoint')} />
              </span>
            }
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
