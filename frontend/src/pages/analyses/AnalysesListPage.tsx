import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { analysesApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { useCompanies, useDepartments, useUsersList } from '../../hooks/useReferenceData';
import type { AnalysisListItem, AnalysisStatus } from '../../types';
import { ALL_ANALYSIS_STATUSES, ANALYSIS_STATUS_COLORS, analysisStageLabel, analysisStatusLabel } from '../../utils/analysisDisplay';

export function AnalysesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AnalysisStatus | undefined>();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const companyId = Form.useWatch('companyId', form);

  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments(companyId);
  const { data: users } = useUsersList();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['analyses', { page, status }],
    queryFn: () => analysesApi.list({ page, pageSize: 20, status }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    const { data: created } = await analysesApi.create(values);
    setOpen(false);
    form.resetFields();
    refetch();
    navigate(`/analyses/${created.id}`);
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('analysesPage.title')}
          <InfoTooltip text={t('tooltips.analyses.whatIsVakr')} />
        </Typography.Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('analysesPage.createButton')}
          </Button>
          <ModuleHelpButton moduleKey="analyses" />
        </Space>
      </Space>
      <Typography.Paragraph type="secondary">{t('analysesPage.description')}</Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder={t('analysesPage.statusPlaceholder')}
          style={{ width: 200 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={ALL_ANALYSIS_STATUSES.map((value) => ({ value, label: analysisStatusLabel(value) }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          { title: t('analysesPage.columns.code'), dataIndex: 'code', width: 140 },
          {
            title: t('analysesPage.columns.name'),
            dataIndex: 'name',
            render: (name: string, record: AnalysisListItem) => (
              <a onClick={() => navigate(`/analyses/${record.id}`)}>{name}</a>
            ),
          },
          { title: t('analysesPage.columns.company'), dataIndex: ['company', 'name'], width: 200 },
          {
            title: (
              <span>
                {t('analysesPage.columns.stage')}
                <InfoTooltip text={t('tooltips.analyses.stage')} />
              </span>
            ),
            dataIndex: 'stage',
            width: 200,
            render: (v: AnalysisListItem['stage']) => analysisStageLabel(v),
          },
          {
            title: t('analysesPage.columns.status'),
            dataIndex: 'status',
            width: 150,
            render: (v: AnalysisStatus) => <Tag color={ANALYSIS_STATUS_COLORS[v]}>{analysisStatusLabel(v)}</Tag>,
          },
          { title: t('analysesPage.columns.lead'), dataIndex: ['lead', 'fullName'], width: 180 },
          { title: t('analysesPage.columns.deadline'), dataIndex: 'deadline', width: 130, render: (v: string | null) => (v ? v.slice(0, 10) : '—') },
        ]}
      />

      <Modal
        title={t('analysesPage.modalTitle')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleCreate}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={
              <span>
                {t('analysesPage.form.nameLabel')}
                <InfoTooltip text={t('tooltips.analyses.whatIsVakr')} />
              </span>
            }
            rules={[{ required: true, message: t('analysesPage.form.nameRequired') }]}
          >
            <Input placeholder={t('analysesPage.form.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="companyId" label={t('analysesPage.form.companyLabel')}>
            <Select
              allowClear
              options={companies?.map((c) => ({ value: c.id, label: c.name }))}
              onChange={() => form.setFieldValue('departmentIds', undefined)}
            />
          </Form.Item>
          <Form.Item
            name="subject"
            label={
              <span>
                {t('analysesPage.form.subjectLabel')}
                <InfoTooltip text={t('tooltips.analyses.subject')} />
              </span>
            }
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="legalBasis"
            label={
              <span>
                {t('analysesPage.form.legalBasisLabel')}
                <InfoTooltip text={t('tooltips.analyses.legalBasis')} />
              </span>
            }
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="departmentIds" label={t('analysesPage.form.departmentsLabel')}>
            <Select mode="multiple" allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item
            name="leadId"
            label={
              <span>
                {t('analysesPage.form.leadLabel')}
                <InfoTooltip text={t('tooltips.analyses.lead')} />
              </span>
            }
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
