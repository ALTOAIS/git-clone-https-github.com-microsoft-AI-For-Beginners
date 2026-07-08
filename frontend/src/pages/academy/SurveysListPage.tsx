import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { surveysApi } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { SurveyListItem, SurveyStatus } from '../../types';
import { ALL_SURVEY_STATUSES, SURVEY_STATUS_COLORS, surveyStatusLabel } from '../../utils/surveyDisplay';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

export function SurveysListPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SurveyStatus | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (searchParams.get('create') === '1' && canManage) {
      setCreateOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canManage]);

  const { data, isFetching } = useQuery({
    queryKey: ['surveys', { page, status }],
    queryFn: () => surveysApi.list({ page, pageSize: 20, status }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    const { data: created } = await surveysApi.create(values);
    setCreateOpen(false);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['surveys'] });
    navigate(`/academy/surveys/${created.id}`);
  };

  const handleDelete = async (id: string) => {
    await surveysApi.remove(id);
    message.success(t('surveysPage.deleted'));
    queryClient.invalidateQueries({ queryKey: ['surveys'] });
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('surveysPage.title')}
          <InfoTooltip text={t('tooltips.academy.surveys')} />
        </Typography.Title>
        <Space>
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              {t('surveysPage.createButton')}
            </Button>
          )}
          <ModuleHelpButton moduleKey="academy" />
        </Space>
      </Space>
      <Typography.Paragraph type="secondary">{t('surveysPage.description')}</Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder={t('surveysPage.statusPlaceholder')}
          style={{ width: 200 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={ALL_SURVEY_STATUSES.map((value) => ({ value, label: surveyStatusLabel(value) }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          {
            title: t('surveysPage.columns.title'),
            dataIndex: 'title',
            render: (title: string, record: SurveyListItem) => (
              <a onClick={() => navigate(canManage ? `/academy/surveys/${record.id}` : `/academy/surveys/${record.id}/respond`)}>
                {title}
              </a>
            ),
          },
          {
            title: t('surveysPage.columns.status'),
            dataIndex: 'status',
            width: 140,
            render: (v: SurveyStatus) => <Tag color={SURVEY_STATUS_COLORS[v]}>{surveyStatusLabel(v)}</Tag>,
          },
          {
            title: t('surveysPage.columns.anonymous'),
            dataIndex: 'isAnonymous',
            width: 120,
            render: (v: boolean) => (v ? t('surveysPage.anonymousYes') : t('surveysPage.anonymousNo')),
          },
          { title: t('surveysPage.columns.questions'), dataIndex: ['_count', 'questions'], width: 100 },
          { title: t('surveysPage.columns.responses'), dataIndex: ['_count', 'responses'], width: 100 },
          {
            title: t('surveysPage.columns.actions'),
            width: 220,
            render: (_: unknown, record: SurveyListItem) => (
              <Space>
                <a onClick={() => navigate(`/academy/surveys/${record.id}/respond`)}>{t('surveysPage.respondLink')}</a>
                {canManage && (
                  <>
                    <a onClick={() => navigate(`/academy/surveys/${record.id}/results`)}>{t('surveysPage.resultsLink')}</a>
                    <Popconfirm title={t('surveysPage.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                      <a>{t('surveysPage.deleteLink')}</a>
                    </Popconfirm>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={t('surveysPage.createModalTitle')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'DRAFT', isAnonymous: false }}>
          <Form.Item
            name="title"
            label={t('surveysPage.form.titleLabel')}
            rules={[{ required: true, message: t('surveysPage.form.titleRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('surveysPage.form.descriptionLabel')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label={t('surveysPage.form.statusLabel')}>
            <Select options={ALL_SURVEY_STATUSES.map((value) => ({ value, label: surveyStatusLabel(value) }))} />
          </Form.Item>
          <Form.Item
            name="isAnonymous"
            label={
              <span>
                {t('surveysPage.form.anonymousLabel')}
                <InfoTooltip text={t('tooltips.academy.anonymousSurvey')} />
              </span>
            }
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
