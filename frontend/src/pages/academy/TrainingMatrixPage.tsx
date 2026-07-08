import { useQuery } from '@tanstack/react-query';
import { Segmented, Skeleton, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyApi } from '../../api/endpoints';
import { ALL_ROLES, roleLabel } from '../../auth/roles';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { TrainingMatrixCourse } from '../../types';
import { courseStatusLabel } from '../../utils/academyDisplay';

export function TrainingMatrixPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<'roles' | 'departments'>('roles');

  const { data, isLoading } = useQuery({
    queryKey: ['training-matrix'],
    queryFn: () => academyApi.matrix().then((r) => r.data),
  });

  if (isLoading || !data) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  const courseColumn = {
    title: t('trainingMatrix.columns.course'),
    dataIndex: 'title',
    fixed: 'left' as const,
    width: 260,
    render: (title: string, record: TrainingMatrixCourse) => (
      <Space direction="vertical" size={0}>
        <Typography.Text strong>{title}</Typography.Text>
        <Tag>{courseStatusLabel(record.status)}</Tag>
      </Space>
    ),
  };

  const allColumn = {
    title: (
      <span>
        {t('trainingMatrix.columns.allRoles')}
        <InfoTooltip text={t('tooltips.academy.allRolesColumn')} />
      </span>
    ),
    width: 110,
    align: 'center' as const,
    render: (_: unknown, record: TrainingMatrixCourse) =>
      (view === 'roles' ? record.applicableRoles.length === 0 : record.applicableDepartments.length === 0) ? (
        <Tag color="red">{t('trainingMatrix.required')}</Tag>
      ) : null,
  };

  const roleColumns = ALL_ROLES.map((role) => ({
    title: roleLabel(role),
    width: 150,
    align: 'center' as const,
    render: (_: unknown, record: TrainingMatrixCourse) => {
      const required = record.applicableRoles.length === 0 || record.applicableRoles.includes(role);
      if (!required) return <span style={{ color: '#d9d9d9' }}>—</span>;
      const roleStats = data.stats[record.id]?.[role];
      const assigned = roleStats?.assigned ?? 0;
      const completed = roleStats?.completed ?? 0;
      return (
        <Tooltip title={t('trainingMatrix.completionTooltip', { completed, assigned })}>
          <Tag color={assigned === 0 ? 'default' : completed === assigned ? 'green' : 'blue'}>
            {assigned === 0 ? t('trainingMatrix.required') : `${completed}/${assigned}`}
          </Tag>
        </Tooltip>
      );
    },
  }));

  const departmentColumns = data.departments.map((dept) => ({
    title: dept.name,
    width: 200,
    align: 'center' as const,
    render: (_: unknown, record: TrainingMatrixCourse) => {
      const required =
        record.applicableDepartments.length === 0 || record.applicableDepartments.some((d) => d.id === dept.id);
      if (!required) return <span style={{ color: '#d9d9d9' }}>—</span>;
      const deptStats = data.departmentStats[record.id]?.[dept.id];
      const assigned = deptStats?.assigned ?? 0;
      const completed = deptStats?.completed ?? 0;
      return (
        <Tooltip title={t('trainingMatrix.completionTooltip', { completed, assigned })}>
          <Tag color={assigned === 0 ? 'default' : completed === assigned ? 'green' : 'blue'}>
            {assigned === 0 ? t('trainingMatrix.required') : `${completed}/${assigned}`}
          </Tag>
        </Tooltip>
      );
    },
  }));

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('trainingMatrix.title')}
          <InfoTooltip text={t('tooltips.academy.matrix')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="academy" />
      </Space>
      <Typography.Paragraph type="secondary">{t('trainingMatrix.description')}</Typography.Paragraph>

      <Segmented
        style={{ marginBottom: 16 }}
        value={view}
        onChange={(v) => setView(v as 'roles' | 'departments')}
        options={[
          { label: t('trainingMatrix.viewByRoles'), value: 'roles' },
          { label: t('trainingMatrix.viewByDepartments'), value: 'departments' },
        ]}
      />

      <Table
        rowKey="id"
        dataSource={data.courses}
        pagination={false}
        scroll={{ x: 'max-content' }}
        columns={[courseColumn, allColumn, ...(view === 'roles' ? roleColumns : departmentColumns)]}
      />
    </div>
  );
}
