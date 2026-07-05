import { useQuery } from '@tanstack/react-query';
import { Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auditApi } from '../../api/endpoints';

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  createdAt: string;
  user?: { fullName: string } | null;
}

export function AuditLogTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditApi.list({ page, pageSize: 20 }).then((r) => r.data as { items: AuditEntry[]; total: number }),
  });

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data?.items}
      pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
      columns={[
        {
          title: t('auditLog.columns.entity'),
          dataIndex: 'entityType',
          width: 130,
          render: (v: string) => <Tag>{t(`auditLog.entityTypes.${v}`, v)}</Tag>,
        },
        {
          title: t('auditLog.columns.action'),
          dataIndex: 'action',
          width: 150,
          render: (v: string) => t(`auditLog.actions.${v}`, v),
        },
        { title: t('auditLog.columns.user'), dataIndex: ['user', 'fullName'], width: 180 },
        {
          title: t('auditLog.columns.when'),
          dataIndex: 'createdAt',
          width: 180,
          render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
        },
      ]}
    />
  );
}
