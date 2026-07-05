import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useUsersList } from '../../../hooks/useReferenceData';
import type { AnalysisDetail, AnalysisWorkingGroupMember } from '../../../types';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage3WorkingGroupTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisWorkingGroupMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: users } = useUsersList();

  const linkedUserIds = new Set(analysis.workingGroup.map((m) => m.userId));

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (member: AnalysisWorkingGroupMember) => {
    setEditing(member);
    form.setFieldsValue(member);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await analysesApi.updateWorkingGroupMember(analysis.id, editing.id, values);
        message.success(t('analysisStage3.updated'));
      } else {
        await analysesApi.addWorkingGroupMember(analysis.id, values);
        message.success(t('analysisStage3.added'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await analysesApi.removeWorkingGroupMember(analysis.id, id);
    message.success(t('analysisStage3.removed'));
    onUpdated();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('analysisStage3.intro')}
          <InfoTooltip text={t('tooltips.analyses.workingGroup')} />
        </span>
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {t('analysisStage3.addButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={analysis.workingGroup}
        pagination={false}
        locale={{ emptyText: t('analysisStage3.noMembersYet') }}
        columns={[
          { title: t('analysisStage3.columns.member'), dataIndex: ['user', 'fullName'] },
          {
            title: (
              <span>
                {t('analysisStage3.columns.role')}
                <InfoTooltip text={t('tooltips.analyses.memberRole')} />
              </span>
            ),
            dataIndex: 'role',
          },
          { title: t('analysisStage3.columns.functions'), dataIndex: 'functions' },
          { title: t('analysisStage3.columns.responsibilityArea'), dataIndex: 'responsibilityArea' },
          {
            title: t('analysisStage3.columns.status'),
            dataIndex: 'completed',
            width: 130,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('analysisStage3.completedTag') : t('analysisStage3.inProgressTag')}</Tag>,
          },
          {
            title: t('analysisStage3.columns.actions'),
            width: 140,
            render: (_: unknown, record: AnalysisWorkingGroupMember) => (
              <>
                <a onClick={() => openEdit(record)}>{t('analysisStage3.editLink')}</a>{' '}
                <Popconfirm title={t('analysisStage3.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('analysisStage3.deleteLink')}</a>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('analysisStage3.modalTitleEdit') : t('analysisStage3.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <Form.Item name="userId" label={t('analysisStage3.memberLabel')} rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={users?.items
                  .filter((u) => !linkedUserIds.has(u.id))
                  .map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="role"
            label={
              <span>
                {t('analysisStage3.roleLabel')}
                <InfoTooltip text={t('tooltips.analyses.memberRole')} />
              </span>
            }
            rules={[{ required: true }]}
          >
            <Input placeholder={t('analysisStage3.rolePlaceholder')} />
          </Form.Item>
          <Form.Item name="functions" label={t('analysisStage3.functionsLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="responsibilityArea" label={t('analysisStage3.responsibilityAreaLabel')}>
            <Input />
          </Form.Item>
          <Form.Item name="tasks" label={t('analysisStage3.tasksLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          {editing && (
            <Form.Item name="completed" label={t('analysisStage3.completedLabel')} valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
