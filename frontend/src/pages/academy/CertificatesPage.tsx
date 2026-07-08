import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Select, Skeleton, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyApi, certificatesApi } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { Certificate } from '../../types';
import { downloadViaApi } from '../../utils/download';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function CertificatesPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState<string | undefined>();

  const { data: myCertificates, isLoading: isLoadingMy } = useQuery({
    queryKey: ['certificates-my'],
    queryFn: () => certificatesApi.my().then((r) => r.data),
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-for-certificates'],
    queryFn: () => academyApi.list({ pageSize: 200 }).then((r) => r.data),
    enabled: canManage,
  });

  const { data: allCertificates, isFetching: isFetchingAll } = useQuery({
    queryKey: ['certificates-all', { page, courseId }],
    queryFn: () => certificatesApi.list({ page, pageSize: 20, courseId }).then((r) => r.data),
    enabled: canManage,
    placeholderData: (prev) => prev,
  });

  const handleDownload = async (certificate: Certificate) => {
    await downloadViaApi(certificatesApi.pdfPath(certificate.id), `${certificate.certificateNumber}.pdf`);
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('certificates.title')}
          <InfoTooltip text={t('tooltips.academy.certificates')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="academy" />
      </Space>
      <Typography.Paragraph type="secondary">{t('certificates.description')}</Typography.Paragraph>

      <Typography.Title level={4}>{t('certificates.myTitle')}</Typography.Title>
      {isLoadingMy && <Skeleton active paragraph={{ rows: 3 }} />}
      {!isLoadingMy && (!myCertificates || myCertificates.length === 0) && (
        <Empty description={t('certificates.noneYet')} />
      )}
      {!isLoadingMy && myCertificates && myCertificates.length > 0 && (
        <Table
          rowKey="id"
          dataSource={myCertificates}
          pagination={false}
          style={{ marginBottom: 32 }}
          columns={[
            { title: t('certificates.columns.course'), dataIndex: ['course', 'title'] },
            {
              title: t('certificates.columns.score'),
              dataIndex: 'scorePercent',
              width: 120,
              render: (v: number | null) => (v != null ? `${v}%` : '—'),
            },
            {
              title: t('certificates.columns.issuedAt'),
              dataIndex: 'issuedAt',
              width: 200,
              render: (v: string) => formatDate(v),
            },
            { title: t('certificates.columns.number'), dataIndex: 'certificateNumber', width: 200 },
            {
              title: t('certificates.columns.actions'),
              width: 140,
              render: (_: unknown, record: Certificate) => (
                <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>
                  {t('certificates.downloadButton')}
                </Button>
              ),
            },
          ]}
        />
      )}

      {canManage && (
        <>
          <Typography.Title level={4}>{t('certificates.allTitle')}</Typography.Title>
          <Space style={{ marginBottom: 16 }}>
            <Select
              allowClear
              placeholder={t('certificates.courseFilterPlaceholder')}
              style={{ width: 280 }}
              value={courseId}
              onChange={(v) => {
                setCourseId(v);
                setPage(1);
              }}
              options={courses?.items.map((c) => ({ value: c.id, label: c.title }))}
            />
          </Space>
          <Table
            rowKey="id"
            loading={isFetchingAll}
            dataSource={allCertificates?.items}
            pagination={{ current: page, pageSize: 20, total: allCertificates?.total, onChange: setPage }}
            columns={[
              { title: t('certificates.columns.employee'), dataIndex: ['user', 'fullName'] },
              { title: t('certificates.columns.course'), dataIndex: ['course', 'title'] },
              {
                title: t('certificates.columns.score'),
                dataIndex: 'scorePercent',
                width: 120,
                render: (v: number | null) => (v != null ? `${v}%` : '—'),
              },
              {
                title: t('certificates.columns.issuedAt'),
                dataIndex: 'issuedAt',
                width: 200,
                render: (v: string) => formatDate(v),
              },
              { title: t('certificates.columns.number'), dataIndex: 'certificateNumber', width: 200 },
              {
                title: t('certificates.columns.actions'),
                width: 140,
                render: (_: unknown, record: Certificate) => (
                  <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>
                    {t('certificates.downloadButton')}
                  </Button>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
