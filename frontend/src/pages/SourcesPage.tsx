import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sourcesApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import { InfoTooltip } from '../components/InfoTooltip';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
import type { Source } from '../types';
import { ALL_SOURCE_TYPES, sourceTypeLabel } from '../utils/riskDisplay';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

export function SourcesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [type, setType] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const typeOptions = ALL_SOURCE_TYPES.map((value) => ({ value, label: sourceTypeLabel(value) }));

  const { data, isFetching } = useQuery({
    queryKey: ['sources', { page, type, search }],
    queryFn: () => sourcesApi.list({ page, pageSize: 20, type, search: search || undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    await sourcesApi.create({ ...values, occurredAt: values.occurredAt?.toISOString() });
    message.success(t('sourcesPage.created'));
    setOpen(false);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['sources'] });
  };

  const handleDelete = async (id: string) => {
    await sourcesApi.remove(id);
    message.success(t('sourcesPage.deleted'));
    queryClient.invalidateQueries({ queryKey: ['sources'] });
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('sourcesPage.title')}
          <InfoTooltip text={t('tooltips.sources.antiCorruptionMonitoring')} />
        </Typography.Title>
        <Space>
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              {t('sourcesPage.newButton')}
            </Button>
          )}
          <ModuleHelpButton moduleKey="sources" />
        </Space>
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder={t('sourcesPage.searchPlaceholder')} allowClear style={{ width: 260 }} onSearch={setSearch} />
        <Select
          allowClear
          placeholder={t('sourcesPage.typePlaceholder')}
          style={{ width: 240 }}
          value={type}
          onChange={setType}
          options={typeOptions}
        />
        <InfoTooltip text={t('tooltips.sources.typeGlossary')} />
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          { title: t('sourcesPage.columns.title'), dataIndex: 'title' },
          {
            title: (
              <span>
                {t('sourcesPage.columns.type')}
                <InfoTooltip text={t('tooltips.sources.dueDiligence')} />
              </span>
            ),
            dataIndex: 'type',
            render: (v: Source['type']) => <Tag>{sourceTypeLabel(v)}</Tag>,
          },
          { title: t('sourcesPage.columns.reference'), dataIndex: 'referenceNumber' },
          { title: t('sourcesPage.columns.linkedRisks'), dataIndex: ['_count', 'risks'], width: 120 },
          {
            title: t('sourcesPage.columns.actions'),
            width: 100,
            render: (_: unknown, record: Source) =>
              canManage ? (
                <Popconfirm title={t('sourcesPage.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('sourcesPage.deleteLink')}</a>
                </Popconfirm>
              ) : null,
          },
        ]}
      />

      <Modal title={t('sourcesPage.modalTitle')} open={open} onCancel={() => setOpen(false)} onOk={handleCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label={t('sourcesPage.typeLabel')} rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="title" label={t('sourcesPage.titleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('sourcesPage.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="referenceNumber" label={t('sourcesPage.referenceLabel')}>
            <Input />
          </Form.Item>
          <Form.Item name="occurredAt" label={t('sourcesPage.dateLabel')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
