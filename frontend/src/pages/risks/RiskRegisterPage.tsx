import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { risksApi } from '../../api/endpoints';
import { useCategories, useCompanies, useDepartments } from '../../hooks/useReferenceData';
import type { RiskListItem, RiskStatus } from '../../types';
import { RISK_STATUS_COLORS, RISK_STATUS_LABELS, SCORE_LEVEL_COLORS, scoreLevel } from '../../utils/riskDisplay';
import { RiskFormModal } from './RiskFormModal';

export function RiskRegisterPage() {
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
      { title: 'Code', dataIndex: 'code', width: 130 },
      {
        title: 'Title',
        dataIndex: 'title',
        render: (title: string, record: RiskListItem) => (
          <a onClick={() => navigate(`/risks/${record.id}`)}>{title}</a>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 160,
        render: (value: RiskStatus) => <Tag color={RISK_STATUS_COLORS[value]}>{RISK_STATUS_LABELS[value]}</Tag>,
      },
      { title: 'Category', dataIndex: ['category', 'name'], width: 160 },
      { title: 'Company', dataIndex: ['company', 'name'], width: 150 },
      { title: 'Department', dataIndex: ['department', 'name'], width: 150 },
      { title: 'Owner', dataIndex: ['owner', 'fullName'], width: 150 },
      {
        title: 'Inherent',
        dataIndex: 'inherentScore',
        width: 100,
        render: (value: number | null) => renderScore(value),
      },
      {
        title: 'Residual',
        dataIndex: 'residualScore',
        width: 100,
        render: (value: number | null) => renderScore(value),
      },
    ],
    [navigate],
  );

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Risk Register
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Register Risk
        </Button>
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search title, code, description"
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 180 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={Object.entries(RISK_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Select
          allowClear
          placeholder="Category"
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
          placeholder="Company"
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
          placeholder="Department"
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
