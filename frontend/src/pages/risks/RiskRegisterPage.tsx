import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { risksApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { useCategories, useCompanies, useDepartments } from '../../hooks/useReferenceData';
import { ControlsPage } from '../ControlsPage';
import { RiskLibraryPage } from '../RiskLibraryPage';
import type { RiskListItem, RiskStatus } from '../../types';
import { ALL_RISK_STATUSES, RISK_STATUS_COLORS, riskStatusLabel, SCORE_LEVEL_COLORS, scoreLevel } from '../../utils/riskDisplay';
import { RiskFormModal } from './RiskFormModal';
import { RiskTemplateLibraryPage } from './RiskTemplateLibraryPage';

export function RiskRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RiskStatus | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [companyId, setCompanyId] = useState<string | undefined>();
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: categories } = useCategories();
  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments(companyId);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['risks', { page, pageSize, search, status, categoryId, companyId, departmentId }],
    queryFn: () =>
      risksApi
        .list({ page, pageSize, search: search || undefined, status, categoryId, companyId, departmentId })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const columns = useMemo(
    () => [
      { title: t('riskRegister.columns.code'), dataIndex: 'code', width: 130 },
      {
        title: t('riskRegister.columns.title'),
        dataIndex: 'title',
        render: (title: string, record: RiskListItem) => (
          <a onClick={() => navigate(`/risks/${record.id}`)}>{title}</a>
        ),
      },
      {
        title: (
          <span>
            {t('riskRegister.columns.status')}
            <InfoTooltip text={t('tooltips.riskRegister.riskStatus')} />
          </span>
        ),
        dataIndex: 'status',
        width: 160,
        render: (value: RiskStatus) => <Tag color={RISK_STATUS_COLORS[value]}>{riskStatusLabel(value)}</Tag>,
      },
      {
        title: (
          <span>
            {t('riskRegister.columns.category')}
            <InfoTooltip text={t('tooltips.riskRegister.riskCategory')} />
          </span>
        ),
        dataIndex: ['category', 'name'],
        width: 160,
      },
      { title: t('riskRegister.columns.company'), dataIndex: ['company', 'name'], width: 150 },
      { title: t('riskRegister.columns.department'), dataIndex: ['department', 'name'], width: 150 },
      {
        title: (
          <span>
            {t('riskRegister.columns.owner')}
            <InfoTooltip text={t('tooltips.riskRegister.riskOwner')} />
          </span>
        ),
        dataIndex: ['owner', 'fullName'],
        width: 150,
      },
      {
        title: (
          <span>
            {t('riskRegister.columns.inherent')}
            <InfoTooltip text={t('tooltips.riskRegister.riskLevel')} />
          </span>
        ),
        dataIndex: 'inherentScore',
        width: 100,
        render: (value: number | null) => renderScore(value),
      },
      {
        title: (
          <span>
            {t('riskRegister.columns.residual')}
            <InfoTooltip text={t('tooltips.riskRegister.residualRisk')} />
          </span>
        ),
        dataIndex: 'residualScore',
        width: 100,
        render: (value: number | null) => renderScore(value),
      },
    ],
    [navigate, t],
  );

  const registerTab = (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('riskRegister.searchPlaceholder')}
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder={t('riskRegister.statusPlaceholder')}
          style={{ width: 180 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={ALL_RISK_STATUSES.map((value) => ({ value, label: riskStatusLabel(value) }))}
        />
        <Select
          allowClear
          placeholder={t('riskRegister.categoryPlaceholder')}
          style={{ width: 200 }}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
          options={categories?.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          allowClear
          placeholder={t('riskRegister.companyPlaceholder')}
          style={{ width: 200 }}
          value={companyId}
          onChange={(v) => {
            setCompanyId(v);
            setDepartmentId(undefined);
            setPage(1);
          }}
          options={companies?.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          allowClear
          placeholder={t('riskRegister.departmentPlaceholder')}
          style={{ width: 200 }}
          value={departmentId}
          onChange={(v) => {
            setDepartmentId(v);
            setPage(1);
          }}
          options={departments?.map((d) => ({ value: d.id, label: d.name }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        columns={columns}
        dataSource={data?.items}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <RiskFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(riskId) => {
          setCreateOpen(false);
          refetch();
          navigate(`/risks/${riskId}`);
        }}
      />
    </div>
  );

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('riskRegister.title')}
          <InfoTooltip text={t('tooltips.riskRegister.complianceRisk')} />
        </Typography.Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t('riskRegister.registerButton')}
          </Button>
          <ModuleHelpButton moduleKey="riskRegister" />
        </Space>
      </Space>

      <Tabs
        items={[
          { key: 'register', label: t('riskRegister.tabRegister'), children: registerTab },
          { key: 'templateLibrary', label: t('riskRegister.tabTemplateLibrary'), children: <RiskTemplateLibraryPage /> },
          { key: 'categories', label: t('riskRegister.tabCategories'), children: <RiskLibraryPage /> },
          { key: 'controls', label: t('riskRegister.tabControls'), children: <ControlsPage /> },
        ]}
      />
    </div>
  );
}

function renderScore(value: number | null | undefined) {
  if (value === null || value === undefined) return <Typography.Text type="secondary">—</Typography.Text>;
  const level = scoreLevel(value);
  return (
    <Tag color={level ? SCORE_LEVEL_COLORS[level] : undefined} style={{ color: '#fff', minWidth: 32, textAlign: 'center' }}>
      {value}
    </Tag>
  );
}
