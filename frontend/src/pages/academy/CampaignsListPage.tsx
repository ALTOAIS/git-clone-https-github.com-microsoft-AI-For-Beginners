import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { ALL_ROLES, roleLabel } from '../../auth/roles';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { CampaignListItem, CampaignStatus } from '../../types';
import { ALL_CAMPAIGN_STATUSES, CAMPAIGN_STATUS_COLORS, campaignStatusLabel } from '../../utils/campaignDisplay';
import { AcademySubNav } from './AcademySubNav';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

export function CampaignsListPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CampaignStatus | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isFetching } = useQuery({
    queryKey: ['campaigns', { page, status }],
    queryFn: () => campaignsApi.list({ page, pageSize: 20, status }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    const { dateRange, ...rest } = values;
    const { data: created } = await campaignsApi.create({
      ...rest,
      startDate: dateRange?.[0]?.toISOString(),
      endDate: dateRange?.[1]?.toISOString(),
    });
    setCreateOpen(false);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    navigate(`/academy/campaigns/${created.id}`);
  };

  const handleDelete = async (id: string) => {
    await campaignsApi.remove(id);
    message.success(t('campaignsPage.deleted'));
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  };

  return (
    <div>
      <AcademySubNav />
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('campaignsPage.title')}
          <InfoTooltip text={t('tooltips.academy.campaigns')} />
        </Typography.Title>
        <Space>
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              {t('campaignsPage.createButton')}
            </Button>
          )}
          <ModuleHelpButton moduleKey="academy" />
        </Space>
      </Space>
      <Typography.Paragraph type="secondary">{t('campaignsPage.description')}</Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder={t('campaignsPage.statusPlaceholder')}
          style={{ width: 200 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={ALL_CAMPAIGN_STATUSES.map((value) => ({ value, label: campaignStatusLabel(value) }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          {
            title: t('campaignsPage.columns.title'),
            dataIndex: 'title',
            render: (title: string, record: CampaignListItem) => (
              <a onClick={() => navigate(`/academy/campaigns/${record.id}`)}>{title}</a>
            ),
          },
          {
            title: t('campaignsPage.columns.status'),
            dataIndex: 'status',
            width: 140,
            render: (v: CampaignStatus) => <Tag color={CAMPAIGN_STATUS_COLORS[v]}>{campaignStatusLabel(v)}</Tag>,
          },
          {
            title: t('campaignsPage.columns.period'),
            width: 200,
            render: (_: unknown, record: CampaignListItem) =>
              record.startDate && record.endDate ? `${record.startDate.slice(0, 10)} — ${record.endDate.slice(0, 10)}` : '—',
          },
          { title: t('campaignsPage.columns.courses'), dataIndex: ['_count', 'courses'], width: 100 },
          { title: t('campaignsPage.columns.surveys'), dataIndex: ['_count', 'surveys'], width: 100 },
          {
            title: t('campaignsPage.columns.actions'),
            width: 100,
            render: (_: unknown, record: CampaignListItem) =>
              canManage ? (
                <Popconfirm title={t('campaignsPage.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('campaignsPage.deleteLink')}</a>
                </Popconfirm>
              ) : null,
          },
        ]}
      />

      <Modal
        title={t('campaignsPage.createModalTitle')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'DRAFT' }}>
          <Form.Item
            name="title"
            label={t('campaignsPage.form.titleLabel')}
            rules={[{ required: true, message: t('campaignsPage.form.titleRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('campaignsPage.form.descriptionLabel')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="dateRange" label={t('campaignsPage.form.periodLabel')}>
            <DatePicker.RangePicker style={{ width: '100%' }} defaultPickerValue={[dayjs(), dayjs().add(1, 'month')]} />
          </Form.Item>
          <Form.Item name="status" label={t('campaignsPage.form.statusLabel')}>
            <Select options={ALL_CAMPAIGN_STATUSES.map((value) => ({ value, label: campaignStatusLabel(value) }))} />
          </Form.Item>
          <Form.Item
            name="targetRoles"
            label={
              <span>
                {t('campaignsPage.form.targetRolesLabel')}
                <InfoTooltip text={t('tooltips.academy.campaignTargetRoles')} />
              </span>
            }
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t('campaignsPage.form.targetRolesPlaceholder')}
              options={ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
